import { AuthenticatedRequest } from "@middleware/auth";
import uploadService from "@services/uploadService";
import { Response } from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { Message } from "../schema";

const io = new Server();

let active_users: { [key: string]: string } = {};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("register", (user_id) => {
    active_users[user_id] = socket.id;
    console.log(`${user_id} registered with socket ID ${socket.id}`);
    console.log({ active_users });
  });

  socket.on("send_message", async (data) => {
    const { sender, recipient, content, type, attachments } = data;
    console.log("Received message data:", data);

    try {
      const new_message = await Message.create({
        sender,
        recipient,
        content,
        type,
        attachments,
      });

      // Send the new message to the recipient in real time
      if (active_users[recipient]) {
        io.to(active_users[recipient]).emit("receive_message", new_message);
      }

      // Update the message history for both the sender and recipient in real-time
      const messages = await Message.find({
        $or: [
          { sender: sender, recipient: recipient },
          { sender: recipient, recipient: sender },
        ],
      }).sort({ createdAt: 1 });

      // Send the updated message history to both the sender and recipient
      io.to(active_users[sender]).emit("message_history", messages);
      if (active_users[recipient]) {
        io.to(active_users[recipient]).emit("message_history", messages);
      }
    } catch (error) {
      console.log("Error sending message:", error);
      socket.emit("error", { message: "Error sending message" });
    }
  });

  socket.on("get_message_history", async (data) => {
    const { user_id, other_user } = data;
    console.log("Fetching message history for:", data);
    try {
      // Fetch message history
      const messages = await Message.find({
        $or: [
          { sender: user_id, recipient: other_user },
          { sender: other_user, recipient: user_id },
        ],
      }).sort({ createdAt: -1 });

      // Mark all unread messages as read
      await Message.updateMany(
        {
          $or: [
            { sender: other_user, recipient: user_id, is_read: false },
            { sender: user_id, recipient: other_user, is_read: false },
          ],
        },
        { $set: { is_read: true } }
      );

      // Emit updated message history to the user
      socket.emit("message_history", messages);
    } catch (error) {
      console.log("Error fetching message history:", error);
      socket.emit("error", { message: "Error fetching message history" });
    }
  });

  socket.on("disconnect", () => {
    for (const user_id in active_users) {
      if (active_users[user_id] === socket.id) {
        delete active_users[user_id];
        console.log(`${user_id} unregistered from socket ID ${socket.id}`);
        break;
      }
    }
  });
});

const get_chat_list = async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.id;

  try {
    const ObjectId = mongoose.Types.ObjectId;

    const chatList = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new ObjectId(user_id) },
            { recipient: new ObjectId(user_id) },
          ],
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $gt: [{ $cmp: ["$sender", "$recipient"] }, 0] }, // Ensure unique pair
              { sender: "$recipient", recipient: "$sender" },
              { sender: "$sender", recipient: "$recipient" },
            ],
          },
          lastMessage: { $last: "$content" }, // Get the last message content
          unreadMessageCount: {
            $sum: {
              $cond: [{ $eq: ["$is_read", false] }, 1, 0],
            },
          },
          lastMessageCreatedAt: { $last: "$createdAt" }, // Get the createdAt of the last message
          sender: { $first: "$sender" }, // Get the sender ID
          recipient: { $first: "$recipient" }, // Get the recipient ID
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "recipient",
          foreignField: "_id",
          as: "recipientDetails",
        },
      },
      {
        $project: {
          _id: 0,
          otherUser: {
            $cond: [
              { $eq: ["$sender", new ObjectId(user_id)] }, // Check if the sender is the requester
              {
                id: { $arrayElemAt: ["$recipientDetails._id", 0] },
                name: { $arrayElemAt: ["$recipientDetails.name", 0] },
                photo_url: {
                  $ifNull: [
                    { $arrayElemAt: ["$recipientDetails.photo_url", 0] },
                    null,
                  ],
                },
              },
              {
                id: { $arrayElemAt: ["$senderDetails._id", 0] },
                name: { $arrayElemAt: ["$senderDetails.name", 0] },
                photo_url: {
                  $ifNull: [
                    { $arrayElemAt: ["$senderDetails.photo_url", 0] },
                    null,
                  ],
                },
              },
            ],
          },
          unread_message_count: "$unreadMessageCount",
          last_message: "$lastMessage",
          last_message_created_at: "$lastMessageCreatedAt", // Include the createdAt of the last message
        },
      },
      {
        $sort: { last_message_created_at: -1 }, // Sort by the last message's createdAt
      },
    ]);

    res.status(200).json({
      message: "Chat list fetched successfully",
      data: chatList,
    });
  } catch (error) {
    console.log("Error fetching chat list:", error);
    res.status(500).json({
      message: "Error fetching chat list",
    });
  }
};

const upload_attachments = async (req: AuthenticatedRequest, res: Response) => {
  let images: Express.Multer.File[] | undefined;
  let videos: Express.Multer.File[] | undefined;

  if (req.files && !Array.isArray(req.files)) {
    images = req.files["images"];
    videos = req.files["videos"];
  }

  if (!images && !videos) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const uploadedFiles: string[] = [];

  if (images) {
    for (const image of images) {
      const uploadedFile = await uploadService(image, "image");
      if (uploadedFile) {
        uploadedFiles.push(uploadedFile);
      }
    }
  }

  if (videos) {
    for (const video of videos) {
      const uploadedFile = await uploadService(video, "video");
      if (uploadedFile) {
        uploadedFiles.push(uploadedFile);
      }
    }
  }

  if (uploadedFiles.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  res.status(200).json({
    message: "Files uploaded successfully",
    data: uploadedFiles,
  });
};

export { io, get_chat_list, upload_attachments };
