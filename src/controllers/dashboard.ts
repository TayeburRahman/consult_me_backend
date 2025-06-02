import { AuthenticatedRequest } from "@middleware/auth";
import { Response } from "express";
import { Booking, Notification, Rating, User } from "../schema";

const overview = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.user?.id;
  const role = req.user?.role;

  if (role === "user") {
    const top_consultants = await Rating.aggregate([
      {
        $group: {
          _id: "$rated",
          averageRating: { $avg: "$rate" },
          count: { $sum: 1 },
        },
      },
      { $sort: { averageRating: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                password_hash: 0,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "categories",
          localField: "user.service",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: 1,
          ratingCount: "$count",
          user: "$user",
          service: "$service",
        },
      },
    ]);

    const upcoming_consultations = await Booking.find({
      user: id,
      status: "upcoming",
      date: { $gte: new Date() },
    }).populate({
      path: "consultant",
      select: "name photo_url",
    });

    res.status(200).json({
      message: "User overview fetched successfully",
      data: {
        top_consultants,
        upcoming_consultations,
      },
    });
  }

  if (role === "consultant") {
    const upcoming_consultations = await Booking.find({
      consultant: id,
      status: "upcoming",
      date: { $gte: new Date() },
    }).populate({
      path: "user",
      select: "name photo_url",
    });

    const completed_bookings = await Booking.countDocuments({
      consultant: id,
      status: "completed",
    });

    const pending_bookings = upcoming_consultations.length;

    const bookings_today = await Booking.countDocuments({
      consultant: id,
      status: "upcoming",
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });

    const total_earnings = await Booking.find({
      consultant: id,
      stripe_status: "succeeded",
      status: "completed",
    }).populate("consultant", "price");

    res.status(200).json({
      message: "User overview fetched successfully",
      data: {
        upcoming_consultations,
        completed_bookings,
        pending_bookings,
        bookings_today,
        total_earnings: total_earnings.reduce(
          (acc, booking: any) => acc + booking.consultant.price,
          0
        ),
      },
    });
  }
};

const admin_dashboard = async (req: AuthenticatedRequest, res: Response) => {
  const { user_year, consult_year, earning_year } = req.query;

  const totalEarningsResult = await Booking.aggregate([
    {
      $match: {
        stripe_status: "paid",
      },
    },
    {
      $lookup: {
        from: "users", // the collection name for UserSchema, usually 'users'
        localField: "consultant",
        foreignField: "_id",
        as: "consultant_data",
      },
    },
    {
      $unwind: "$consultant_data", // since lookup returns an array, unwind to get the object
    },
    {
      $group: {
        _id: null,
        total_earnings: { $sum: "$consultant_data.price" },
      },
    },
  ]);
  const total_earnings = totalEarningsResult[0]?.total_earnings || 0;

  const data = {
    total_users: await User.countDocuments({ role: "user" }),
    total_consultants: await User.countDocuments({ role: "consultant" }),
    total_earnings,
  };

  res.status(200).json({
    message: "Admin dashboard fetched successfully",
    data,
  });
};

export { overview, admin_dashboard };
