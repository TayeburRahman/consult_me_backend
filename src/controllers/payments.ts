import { AuthenticatedRequest } from "@middleware/auth";
import {
  createStripeConnectExpressAccount,
  getOnboardingLink,
  transferToConnectedAccount,
} from "@services/stripeService";
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Booking, Payment, User, Withdraw } from "../schema";
import Stripe from "stripe";

const stripe_webhook = async (req: Request, res: Response): Promise<void> => {
  const webhook_secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    res.status(500).send("Missing Stripe signature");
    return;
  }
  if (!webhook_secret) {
    res.status(500).send("Missing Stripe webhook secret");
    return;
  }
  try {
    const event = Stripe.webhooks.constructEvent(req.body, sig, webhook_secret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.client_reference_id) {
        console.log("User ID missing");
        res.send();
        return;
      }

      await Payment.create({
        amount: (session.amount_total ?? 0) / 100,
        createdAt: new Date(session.created * 1000),
        paymentId: session.id,
        paymentStatus: session.payment_status,
        userId: session.client_reference_id,
      });

      const booking = await Booking.findOneAndUpdate(
        { user: session.client_reference_id },
        {
          stripe_status: session.payment_status,
          transaction_id: session.id,
        }
      );

      const consultant = await User.findById(booking?.consultant);

      if (consultant) {
        consultant.balance += (session.amount_total ?? 0) / 100;
        await consultant.save();
      }

      if (consultant && consultant?.email && !consultant?.stripeAccountId) {
        const stripeAccount = await createStripeConnectExpressAccount(
          consultant?.email
        );

        consultant.stripeAccountId = stripeAccount.accountId;
        await consultant.save();
      }

      //   triggerNotification("PAYMENT_SUCCESS", {
      //     userId: user?._id.toString(),
      //     userEmail: user?.email,
      //   });

      res.send();
    } else if (event.type === "account.external_account.created") {
      const user = await User.findOneAndUpdate(
        { stripeAccountId: event.account },
        {
          stripeOnboardingDone: true,
        }
      );

      //   triggerNotification("ACCOUNT_ONBOARDED", {
      //     userId: user?._id.toString(),
      //     userEmail: user?.email,
      //   });

      res.send();
    } else {
      console.log(`Unhandled event type ${event.type}`);
      res.send();
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(`Webhook Error: ${err}`);
    return;
  }
};

const create_withdraw_request = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { amountInCents } = req.body || {};
  const { id } = req.user || {};

  if (!isValidObjectId(id)) {
    res.status(400).json({
      message: "User Id Invalid",
    });
    return;
  }

  if (!amountInCents) {
    res.status(400).json({
      message: "Amount is required",
    });
    return;
  }

  const withdraw_request = await Withdraw.create({
    user: id,
    amount: amountInCents,
  });

  res.status(200).json({
    message: "Withdraw request created successfully",
    data: withdraw_request,
  });
};

const account_link = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const user = await User.findById(req.user?.id);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (!user.stripeAccountId) {
    res.status(404).json({ message: "Stripe account not found" });
    return;
  }

  const onboardingLink = await getOnboardingLink(user.stripeAccountId);

  if (!onboardingLink.success) {
    res.status(500).json({ message: "Error creating onboarding link" });
    return;
  }

  res.status(200).json(onboardingLink);
};

const withdraw_history = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.user || {};

  if (!isValidObjectId(id)) {
    res.status(400).json({
      message: "User Id Invalid",
    });
    return;
  }

  const withdrawals = await Withdraw.find({
    user: id,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    message: "Withdrawals fetched successfully",
    data: withdrawals.map((withdrawal) => ({
      user: withdrawal.user || null,
      amount: withdrawal.amount || null,
      status: withdrawal.status || null,
      transaction_id: withdrawal.transaction_id || null,
      createdAt: withdrawal.createdAt || null,
    })),
  });
};

const transfer_funds = async (req: Request, res: Response): Promise<void> => {
  const { amountInCents, destinationAccountId } = req.body || {};

  try {
    const transferResponse = await transferToConnectedAccount({
      amountInCents,
      destinationAccountId,
    });
    res.status(200).json(transferResponse);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const get_withdraw_requests = async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  const pageNumber = parseInt(page as string) || 1;
  const limitNumber = parseInt(limit as string) || 10;
  const offset = (pageNumber - 1) * limitNumber;

  const withdrawal_requests = await Withdraw.find()
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limitNumber)
    .populate({
      path: "user",
      select: "name email service phone city country",
      populate: {
        path: "service",
        select: "name",
      },
    });

  const meta = {
    page: pageNumber,
    limit: limitNumber,
    total: await Withdraw.countDocuments(),
    totalPages: Math.ceil((await Withdraw.countDocuments()) / limitNumber),
    hasNextPage:
      pageNumber < Math.ceil((await Withdraw.countDocuments()) / limitNumber),
  };

  res.status(200).json({
    message: "Withdraw requests fetched successfully",
    data: withdrawal_requests,
    meta,
  });
};

const update_withdraw_request = async (req: Request, res: Response) => {
  const { id, status } = req.body;

  if (!status || !["pending", "completed", "failed"].includes(status)) {
    res.status(400).json({
      message:
        "Status is required and must be one of: pending, completed, failed",
    });
    return;
  }

  if (!isValidObjectId(id)) {
    res.status(400).json({
      message: "Withdraw request Id Invalid",
    });
    return;
  }

  const withdraw_request = await Withdraw.findById(id);

  if (!withdraw_request) {
    res.status(404).json({
      message: "Withdraw request not found",
    });
    return;
  }

  withdraw_request.status = status;
  await withdraw_request.save();

  res.status(200).json({
    message: "Withdraw request resolved successfully",
    data: withdraw_request,
  });
};

export {
  stripe_webhook,
  create_withdraw_request,
  account_link,
  transfer_funds,
  withdraw_history,
  get_withdraw_requests,
  update_withdraw_request,
};
