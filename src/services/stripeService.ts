import { config } from "dotenv";
import Stripe from "stripe";

config();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error("Stripe secret key is not defined in environment variables");
}
export const createCheckoutSession = async ({
  userId,
  booking_id,
  line_items,
}: {
  userId: string;
  booking_id: string;
  line_items: any;
}) => {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const session = await stripe.checkout.sessions.create({
      client_reference_id: userId,
      metadata: {
        booking_id,
      },
      line_items,
      //   line_items: [
      //     {
      //       price_data: {
      //         currency: "usd",
      //         product_data: {
      //           name: "Avantra",
      //         },
      //         unit_amount: 1000,
      //         recurring: {
      //           interval: "month",
      //         },
      //       },
      //       quantity: 1,
      //     },
      //   ],
      mode: "payment",
      success_url: "http://localhost:3000/success.html",
      cancel_url: "http://localhost:3000/cancel.html",
    });

    return session;
  } catch (error) {
    return error;
  }
};

export const createStripeConnectExpressAccount = async (email: string) => {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    // Create an Express Account for the user
    const account = await stripe.accounts.create({
      type: "express",
      email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    return { success: true, accountId: account.id };
  } catch (error) {
    console.error("Error creating Stripe Connect account:", error);
    return { success: false, error };
  }
};

export const getOnboardingLink = async (accountId: string) => {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "http://localhost:5174",
      return_url: "http://localhost:5174",
      type: "account_onboarding",
    });

    return { success: true, url: accountLink.url };
  } catch (error) {
    console.error("Error creating onboarding link:", error);
    return { success: false, error };
  }
};

export const transferToConnectedAccount = async ({
  amountInCents,
  destinationAccountId,
}: {
  amountInCents: number;
  destinationAccountId: string;
}) => {
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    const transfer = await stripe.transfers.create({
      amount: amountInCents, // Amount in cents
      currency: "usd",
      destination: destinationAccountId, // User's Stripe Connect Account ID
    });

    return { success: true, transfer };
  } catch (error) {
    console.error("Error transferring funds:", error);
    return { success: false, error };
  }
};
