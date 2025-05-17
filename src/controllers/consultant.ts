import { Request, Response } from "express";
import { Booking, Rating, User } from "src/schema";

const get_consultant_by_category = async (req: Request, res: Response) => {
  const { category_id, page, limit } = req.query;

  const pageNumber = parseInt(page as string) || 1;
  const pageSize = parseInt(limit as string) || 10;
  const skip = (pageNumber - 1) * pageSize;

  try {
    const consultants = await User.find(
      { service: category_id },
      { __v: 0, password_hash: 0 }
    )
      .populate("service", { name: 1 })
      .skip(skip)
      .limit(pageSize);

    const totalConsultants = await User.countDocuments({
      service: category_id,
    });

    const uniqueClientIds = await Booking.distinct("client", {
      consultant: category_id,
      status: "upcoming",
      stripe_status: "succeeded",
    });

    const fullConsultantData = await Promise.all(
      consultants.map(async (consultant) => {
        // Fetch the rating data and client count in parallel
        const [rating, totalRatings] = await Promise.all([
          Rating.aggregate([
            { $match: { rated: consultant._id } },
            { $group: { _id: null, averageRating: { $avg: "$rate" } } },
          ]),
          Rating.countDocuments({ rated: consultant._id }),
        ]);

        const averageRating = rating[0] ? rating[0].averageRating : 0;
        const totalClients = uniqueClientIds.length;

        return {
          ...consultant.toObject(),
          total_clients: totalClients,
          rating: {
            average: averageRating,
            total: totalRatings,
          },
        };
      })
    );

    res.json({
      message: "Consultants fetched successfully",
      data: fullConsultantData,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total: totalConsultants,
        totalPages: Math.ceil(totalConsultants / pageSize),
        hasNextPage: skip + pageSize < totalConsultants,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const get_all_consultants = async (req: Request, res: Response) => {
  const { page, limit, query } = req.query;
  const pageNumber = parseInt(page as string) || 1;
  const pageSize = parseInt(limit as string) || 10;
  const skip = (pageNumber - 1) * pageSize;

  try {
    const consultants = await User.find(
      {
        ...(query ? { name: { $regex: query, $options: "i" } } : {}),
        role: "consultant",
      },
      { __v: 0, password_hash: 0 }
    )
      .populate("service", { name: 1 })
      .skip(skip)
      .limit(pageSize);

    const totalConsultants = await User.countDocuments({ role: "consultant" });

    const fullConsultantData = await Promise.all(
      consultants.map(async (consultant) => {
        // Fetch the rating data and client count in parallel
        const [rating, totalRatings] = await Promise.all([
          Rating.aggregate([
            { $match: { rated: consultant._id } },
            { $group: { _id: null, averageRating: { $avg: "$rate" } } },
          ]),
          Rating.countDocuments({ rated: consultant._id }),
        ]);

        const averageRating = rating[0] ? rating[0].averageRating : 0;

        return {
          ...consultant.toObject(),
          total_clients: null,
          rating: {
            average: averageRating,
            total: totalRatings,
          },
        };
      })
    );

    res.json({
      message: "Consultants fetched successfully",
      data: fullConsultantData,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total: totalConsultants,
        totalPages: Math.ceil(totalConsultants / pageSize),
        hasNextPage: skip + pageSize < totalConsultants,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export { get_consultant_by_category, get_all_consultants };
