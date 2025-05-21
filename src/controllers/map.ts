import { Request, Response } from "express";

const get_map_consultants = async (req: Request, res: Response) => {
  res.status(200).json({
    message: "Map consultants fetched successfully",
  });
};

export { get_map_consultants };
