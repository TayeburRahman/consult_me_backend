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
    async (data: { sender: string; recipient: string; content: string }) => {
      const { sender, recipient, content } = data;

      const new_message = await Message.create({
        sender,
        recipient,
        content,
      });

      if (active_users[recipient]) {
        io.to(active_users[recipient]).emit("receive_message", new_message);
      }
    }
  );

  socket.on("get_chat_list", async (data: { user_id: string }) => {
    const { user_id } = data;
    console.log("Fetching chat list for user:", user_id);
    try {
      const chatList = await Message.find({
        $or: [{ sender: user_id }, { recipient: user_id }],
      })
        .populate("sender", "name profile_image")
        .populate("recipient", "name profile_image")
        .sort({ createdAt: -1 });

      socket.emit("chat_list", chatList);
    } catch (error) {
      console.log("Error fetching chat list:", error);
      socket.emit("error", { message: "Error fetching chat list" });
    }
  });

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

export default io;
