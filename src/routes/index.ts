import { Express } from "express";
import * as userRoutes from "./app";
import * as adminRoutes from "./admin";
import webhookRoutes from "./webhook.routes";
import authorize from "@middleware/auth";

const registerUserRoutes = (app: Express) => {
  app.use("/auth", userRoutes.authRoutes);
  app.use("/category", authorize(["user"]), userRoutes.categoryRoutes);
  app.use(
    "/profile",
    authorize(["user", "consultant"]),
    userRoutes.profileRoutes
  );
};
const registerAdminRoutes = (app: Express) => {
  app.use("/admin/category", authorize(["admin"]), adminRoutes.categoryRoutes);
};

const registerWebhookRoutes = (app: Express) => {
  // app.use("/webhook", webhookRoutes);
};

export { registerUserRoutes, registerAdminRoutes, registerWebhookRoutes };
