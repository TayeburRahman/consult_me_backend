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

  // Default years to current year if not provided
  const userYear = Number(user_year) || new Date().getFullYear();
  const consultYear = Number(consult_year) || new Date().getFullYear();
  const earningYear = Number(earning_year) || new Date().getFullYear();

  // 1) User growth: monthly counts, split by isSubscribed
  const userData = await User.aggregate([
    {
      $match: {
        role: "user",
        createdAt: {
          $gte: new Date(`${userYear}-01-01T00:00:00Z`),
          $lte: new Date(`${userYear}-12-31T23:59:59.999Z`),
        },
      },
    },
    {
      $project: {
        month: { $month: "$createdAt" },
        isSubscribed: 1,
      },
    },
    {
      $group: {
        _id: { month: "$month", subscribed: "$isSubscribed" },
        count: { $sum: 1 },
      },
    },
  ]);

  const activeUsersChart = Array(12).fill(0);
  const inactiveUsersChart = Array(12).fill(0);

  userData.forEach(({ _id, count }) => {
    const monthIndex = _id.month - 1;
    if (_id.subscribed) activeUsersChart[monthIndex] = count;
    else inactiveUsersChart[monthIndex] = count;
  });

  const user_growth = {
    year: userYear,
    chart: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      legends: ["Active", "Inactive"],
      data: [activeUsersChart, inactiveUsersChart],
    },
  };

  // 2) Consultant growth: monthly counts of consultants created
  const consultantData = await User.aggregate([
    {
      $match: {
        role: "consultant",
        createdAt: {
          $gte: new Date(`${consultYear}-01-01T00:00:00Z`),
          $lte: new Date(`${consultYear}-12-31T23:59:59.999Z`),
        },
      },
    },
    {
      $project: { month: { $month: "$createdAt" } },
    },
    {
      $group: {
        _id: "$month",
        count: { $sum: 1 },
      },
    },
  ]);

  const consultant_growth_chart = Array(12).fill(0);
  consultantData.forEach(({ _id, count }) => {
    consultant_growth_chart[_id - 1] = count;
  });

  const consultant_growth = {
    year: consultYear,
    chart: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      data: consultant_growth_chart,
    },
  };

  // 3) Earnings growth: monthly total earnings by summing consultant prices from bookings with succeeded payments

  const earningsData = await Booking.aggregate([
    {
      $match: {
        stripe_status: "paid",
        date: {
          $gte: new Date(`${earningYear}-01-01T00:00:00Z`),
          $lte: new Date(`${earningYear}-12-31T23:59:59.999Z`),
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "consultant",
        foreignField: "_id",
        as: "consultant_data",
      },
    },
    { $unwind: "$consultant_data" },
    {
      $project: {
        month: { $month: "$date" },
        price: "$consultant_data.price",
      },
    },
    {
      $group: {
        _id: "$month",
        total: { $sum: "$price" },
      },
    },
  ]);

  const earning_growth_chart = Array(12).fill(0);
  earningsData.forEach(({ _id, total }) => {
    earning_growth_chart[_id - 1] = total;
  });

  const earning_growth = {
    year: earningYear,
    chart: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      data: earning_growth_chart,
    },
  };

  // Get totals
  const total_users = await User.countDocuments({ role: "user" });
  const total_consultants = await User.countDocuments({ role: "consultant" });

  const totalEarningsResult = await Booking.aggregate([
    {
      $match: {
        stripe_status: "succeeded",
        status: "completed",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "consultant",
        foreignField: "_id",
        as: "consultant_data",
      },
    },
    { $unwind: "$consultant_data" },
    {
      $group: {
        _id: null,
        total_earnings: { $sum: "$consultant_data.price" },
      },
    },
  ]);
  const total_earnings = totalEarningsResult[0]?.total_earnings || 0;

  // Respond
  res.status(200).json({
    message: "Admin dashboard fetched successfully",
    data: {
      total_users,
      total_consultants,
      total_earnings,
      user_growth,
      consultant_growth,
      earning_growth,
    },
  });
};

export { overview, admin_dashboard };
