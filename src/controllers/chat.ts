import { AuthenticatedRequest } from "@middleware/auth";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { Message } from "src/schema";

const io = new Server();

let active_users: { [key: string]: string } = {};

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("register", (user_id: string) => {
    active_users[user_id] = socket.id;
    console.log(`${user_id} registered with socket ID ${socket.id}`);
    console.log({ active_users });
  });

  socket.on(
    "send_message",
    async (data: {
      sender: string;
      recipient: string;
      content: string;
      type: string;
    }) => {
      const { sender, recipient, content, type } = data;

      const new_message = await Message.create({
        sender,
        recipient,
        content,
        type,
      });

      if (active_users[recipient]) {
        io.to(active_users[recipient]).emit("receive_message", new_message);
      }
    }
  );

  socket.on(
    "get_message_history",
    async (data: { user_id: string; other_user: string }) => {
      const { user_id, other_user } = data;

      try {
        const messages = await Message.find({
          $or: [
            { sender: user_id, recipient: other_user },
            { sender: other_user, recipient: user_id },
          ],
        }).sort({ createdAt: 1 });

        socket.emit("message_history", messages);
      } catch (error) {
        console.log("Error fetching message history:", error);
        socket.emit("error", { message: "Error fetching message history" });
      }
    }
  );

  socket.on(
    "mark_as_read",
    async (data: { sender: string; recipient: string }) => {
      const { sender, recipient } = data;
      try {
        await Message.updateMany(
          {
            sender,
            recipient,
            is_read: false,
          },
          {
            $set: { is_read: true },
          }
        );

        socket.emit("message_read", {
          sender,
          recipient,
        });
      } catch (error) {
        console.log("Error marking messages as read:", error);
        socket.emit("error", { message: "Error marking messages as read" });
      }
    }
  );

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
              { $gt: [{ $cmp: ["$sender", "$recipient"] }, 0] }, // Check if sender > recipient (to create a unique pair)
              { sender: "$recipient", recipient: "$sender" }, // Swap sender and recipient for uniqueness
              { sender: "$sender", recipient: "$recipient" },
            ],
          },
          lastMessage: { $last: "$content" }, // Get the last message
          unreadMessageCount: {
            $sum: {
              $cond: [{ $eq: ["$is_read", false] }, 1, 0],
            },
          },
          sender: { $first: "$sender" }, // Get sender details
          recipient: { $first: "$recipient" }, // Get recipient details
        },
      },
      // Step 3: Lookup sender and recipient details (populate name and photo_url only)
      {
        $lookup: {
          from: "users", // Assuming "users" collection for sender
          localField: "sender",
          foreignField: "_id",
          as: "senderDetails",
        },
      },
      {
        $lookup: {
          from: "users", // Assuming "users" collection for recipient
          localField: "recipient",
          foreignField: "_id",
          as: "recipientDetails",
        },
      },
      // Step 4: Project the data in the desired format (only name and photo_url)
      {
        $project: {
          _id: 0, // Remove the _id field
          sender: {
            name: { $arrayElemAt: ["$senderDetails.name", 0] },
            photo_url: { $arrayElemAt: ["$senderDetails.photo_url", 0] },
          },
          recipient: {
            name: { $arrayElemAt: ["$recipientDetails.name", 0] },
            photo_url: { $arrayElemAt: ["$recipientDetails.photo_url", 0] },
          },
          unread_message_count: "$unreadMessageCount", // Add unread message count
          last_message: "$lastMessage", // Add the last message
        },
      },
      // Step 5: Sort by the most recent message (timestamp)
      {
        $sort: { "sender.createdAt": -1 },
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

export { io, get_chat_list };
