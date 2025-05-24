import { Request, Response } from "express";
import { User } from "../schema";

const get_map_consultants = async (req: Request, res: Response) => {
  try {
    const { sw_lat, sw_lng, ne_lat, ne_lng, category_id } = req.query;

    // Validate query params
    if (!sw_lat || !sw_lng || !ne_lat || !ne_lng || !category_id) {
      res.status(400).json({ error: "Missing required query parameters." });
    }

    // Parse coordinates to float
    const swLat = parseFloat(sw_lat as string);
    const swLng = parseFloat(sw_lng as string);
    const neLat = parseFloat(ne_lat as string);
    const neLng = parseFloat(ne_lng as string);

    if (
      Number.isNaN(swLat) ||
      Number.isNaN(swLng) ||
      Number.isNaN(neLat) ||
      Number.isNaN(neLng)
    ) {
      res.status(400).json({ error: "Invalid coordinates." });
    }

    const consultants = await User.find({
      service: category_id,
      lat: { $gte: swLat, $lte: neLat },
      lng: { $gte: swLng, $lte: neLng },
    });

    res.status(200).json({
      message: "Consultants fetched successfully.",
      data: consultants,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

export { get_map_consultants };
