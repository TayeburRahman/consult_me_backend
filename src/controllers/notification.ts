import { Request, Response } from "express";

const get_notification = async (req: Request, res: Response) => {
  res.status(200).json({
    message: "Notifications fetched successfully",
    data: [{}],
  });
};

export { get_notification };
