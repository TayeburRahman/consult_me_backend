import { config } from "dotenv";
import express, { Response } from "express";
import http from "http";
import cors from "cors";
import {
  registerAdminRoutes,
  registerUserRoutes,
  registerWebhookRoutes,
} from "./routes";
import startDB from "./db";
import logger from "@utils/logger";
import "@services/notificationService";
import { io } from "@controllers/chat";

// Load environment variables
config();

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  // Optionally shut down app
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start DB connection
startDB();

// Init express app
const app = express();
app.use(cors({ origin: "*" }));
registerWebhookRoutes(app); // Should be before body parsing if needed
app.use(express.json());
app.use(logger);

// Register API routes
registerUserRoutes(app);
registerAdminRoutes(app);

// Root route
app.get("/", (_, res: Response) => {
  res.json({
    message: "Hello, this is the root route for Consult Me Backend 🙌",
  });
});

// HTTP Server with Socket.io
const server = http.createServer(app);
io.attach(server);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
   console.log(` app listening http://${process.env.HOST}:${process.env.PORT}`);
});
