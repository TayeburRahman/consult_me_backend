import { AuthenticatedRequest } from "@middleware/auth";
import { Response } from "express";
import { Notification } from "src/schema";

const get_notification = async (req: AuthenticatedRequest, res: Response) => {
  const notifications = await Notification.find({
    recipientId: req?.user?.id,
  }).populate({
    path: "recipientId",
    select: "name photo_url",
  });

  res.status(200).json({
    message: "Notifications fetched successfully",
    data: notifications,
  });
};

export { get_notification };
