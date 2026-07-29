import { AuthenticatedRequest } from "@middleware/auth";
import uploadService from "@services/uploadService";
import { generateLiveKitToken, startRoomRecording } from "@services/livekitService";
import { Response } from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { Message, User, CallRecord } from "../schema";

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
      }).sort({ createdAt: -1 });

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

  // ==========================================
  // LiveKit Call Signaling Events
  // ==========================================

  // Caller sends call invite to receiver
  socket.on("call_invite", (data) => {
    const { receiverId } = data;
    console.log(`📞 Call invite from ${data.callerId} to ${receiverId}`, data);

    if (active_users[receiverId]) {
      io.to(active_users[receiverId]).emit("call_invite", data);
      console.log(`📞 Call invite relayed to ${receiverId} (socket: ${active_users[receiverId]})`);
    } else {
      console.log(`📞 Receiver ${receiverId} is offline, cannot relay call invite`);
      // Notify caller that receiver is offline
      socket.emit("call_rejected", {
        callId: data.callId,
        reason: "offline",
        callerId: data.callerId,
      });
    }
  });

  // Receiver accepts call
  socket.on("call_accepted", async (data) => {
    const { callerId } = data;
    console.log(`✅ Call accepted by ${data.receiverId} for caller ${callerId}`, data);

    if (active_users[callerId]) {
      io.to(active_users[callerId]).emit("call_accepted", data);
      console.log(`✅ Call accepted event relayed to caller ${callerId}`);
    }

    // Create a CallRecord when the call is accepted (both parties joining)
    try {
      const roomName = data.roomName || "";
      const isVideo = data.isVideo === true || data.isVideo === "true";
      const receiverId = data.receiverId || "";

      if (roomName && callerId && receiverId) {
        // Check if a record already exists for this room
        const existing = await CallRecord.findOne({ roomName });
        if (!existing) {
          await CallRecord.create({
            roomName,
            callType: isVideo ? "video" : "audio",
            caller: callerId,
            receiver: receiverId,
            callStartedAt: new Date(),
            status: "in_progress",
          });
          console.log(`📝 CallRecord created for room ${roomName} (${isVideo ? "video" : "audio"})`);
        }

        // Trigger recording start check
        await startRoomRecording(roomName);
      }
    } catch (err) {
      console.error("❌ Error creating CallRecord / starting recording on call_accepted:", err);
    }
  });

  // Receiver rejects call
  socket.on("call_rejected", (data) => {
    const { callerId } = data;
    console.log(`❌ Call rejected for caller ${callerId}`, data);

    if (active_users[callerId]) {
      io.to(active_users[callerId]).emit("call_rejected", data);
      console.log(`❌ Call rejected event relayed to caller ${callerId}`);
    }
  });

  // Either party hangs up the call
  socket.on("call_hangup", async (data) => {
    const { callerId, receiverId } = data;
    console.log(`📴 Call hangup`, data);

    // Relay hangup to the other party
    if (active_users[callerId]) {
      io.to(active_users[callerId]).emit("call_hangup", data);
    }
    if (active_users[receiverId]) {
      io.to(active_users[receiverId]).emit("call_hangup", data);
    }

    // Update CallRecord with end time and duration
    try {
      const roomName = data.roomName || data.callId ? `room_${data.callId}` : "";
      if (roomName) {
        const callRecord = await CallRecord.findOne({
          roomName,
          status: "in_progress",
        });
        if (callRecord) {
          callRecord.callEndedAt = new Date();
          if (callRecord.callStartedAt) {
            callRecord.duration = Math.floor(
              (new Date().getTime() - new Date(callRecord.callStartedAt).getTime()) / 1000
            );
          }
          await callRecord.save();
          console.log(`📝 CallRecord updated for room ${roomName} — duration: ${callRecord.duration}s`);
        }
      }
    } catch (err) {
      console.error("❌ Error updating CallRecord on call_hangup:", err);
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

// ==========================================
// LiveKit Token Generation Endpoint
// ==========================================
const generate_livekit_token = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { roomName, identity } = req.body;
  const userId = req.user?.id;

  if (!roomName || !identity) {
    res.status(400).json({ message: "roomName and identity are required" });
    return;
  }

  try {
    // Fetch user name for display in LiveKit room
    const user = await User.findById(userId);
    const userName = user?.name || identity;

    const token = await generateLiveKitToken(roomName, identity, userName);

    console.log(`🎫 LiveKit token generated for user ${identity} in room ${roomName}`);

    res.json({
      message: "LiveKit token generated successfully",
      data: { token },
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    res.status(500).json({ message: "Failed to generate LiveKit token" });
  }
};

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

const notifyRecordingStatus = (user1: string, user2: string, data: any) => {
  try {
    if (user1 && active_users[user1]) {
      io.to(active_users[user1]).emit("recording_status", data);
    }
    if (user2 && active_users[user2]) {
      io.to(active_users[user2]).emit("recording_status", data);
    }
  } catch (err) {
    console.error("Error emitting recording_status:", err);
  }
};

export { io, get_chat_list, upload_attachments, generate_livekit_token, notifyRecordingStatus };

