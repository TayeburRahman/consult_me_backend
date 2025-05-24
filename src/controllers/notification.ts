import { AuthenticatedRequest } from "@middleware/auth";
import { Response } from "express";
import { Notification } from "../schema";

const get_notification = async (req: AuthenticatedRequest, res: Response) => {
  const notifications = await Notification.find({
    recipientId: req?.user?.id,
  }).populate({
    path: "recipientId",
    select: "name photo_url",
  });

  await Notification.updateMany(
    { recipientId: req?.user?.id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    message: "Notifications fetched successfully",
    data: notifications,
  });
};

const get_notification_count = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const notification_count = await Notification.countDocuments({
    recipientId: req.user?.id,
    isRead: false,
  });

  res.status(200).json({
    message: "Notification count fetched successfully",
    data: notification_count,
  });
};

export { get_notification, get_notification_count };
