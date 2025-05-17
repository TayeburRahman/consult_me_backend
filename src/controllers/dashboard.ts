import { AuthenticatedRequest } from "@middleware/auth";
import { Response } from "express";
import { Booking, Rating } from "src/schema";

const user_overview = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.user?.id;

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
      },
    },
    { $unwind: "$user" },
    // Populate the service field
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
        preserveNullAndEmptyArrays: true, // if user.service can be null
      },
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        averageRating: 1,
        ratingCount: "$count",
        name: "$user.name",
        email: "$user.email",
        photo_url: "$user.photo_url",
        price: "$user.price",
        service: "$service.name",
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
};

export { user_overview };
