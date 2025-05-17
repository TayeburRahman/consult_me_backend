import { AuthenticatedRequest } from "@middleware/auth";
import { Response } from "express";
import { Rating, User } from "src/schema";

const user_overview = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.user?.id;

  const top_consultants = await Rating.aggregate([
    {
      $group: {
        _id: "$rated",
        // averageRating: { $avg: "$rate" },
        // count: { $sum: 1 },
      },
    },
    // { $sort: { averageRating: -1 } },
    // { $limit: 5 },
    // {
    //   $lookup: {
    //     from: "users",
    //     localField: "_id",
    //     foreignField: "_id",
    //     as: "user",
    //   },
    // },
    // { $unwind: "$user" },
    // {
    //   $project: {
    //     _id: 0,
    //     userId: "$_id",
    //     averageRating: 1,
    //     ratingCount: "$count",
    //     userName: "$user.name",
    //     userEmail: "$user.email",
    //   },
    // },
  ]);

  res.status(200).json({
    message: "User overview fetched successfully",
    data: {
      top_consultants,
      upcomming_consultations: [],
    },
  });
};

export { user_overview };
