import { Express } from "express";
import * as userRoutes from "./app";
import * as adminRoutes from "./admin";
import webhookRoutes from "./webhook.routes";
import authorize from "@middleware/auth";

const registerUserRoutes = (app: Express) => {
  app.use("/auth", userRoutes.authRoutes);
  app.use(
    "/category",
    authorize(["user", "consultant"]),
    userRoutes.categoryRoutes
  );
  app.use("/consultant", authorize(["user"]), userRoutes.consultantRoutes);
  app.use(
    "/profile",
    authorize(["user", "consultant", "admin"]),
    userRoutes.profileRoutes
  );
  app.use("/legal", userRoutes.legalRoutes);
  app.use(
    "/booking",
    authorize(["user", "consultant"]),
    userRoutes.bookingRoutes
  );
  app.use("/chat", authorize(["user", "consultant"]), userRoutes.chatRoutes);
  app.use(
    "/dashboard",
    authorize(["user", "consultant"]),
    userRoutes.dashboardRoutes
  );
  app.use(
    "/notifications",
    authorize(["user", "consultant", "admin"]),
    userRoutes.notificationRoutes
  );
  app.use("/map", authorize(["user"]), userRoutes.mapRoutes);
  app.use("/payments", authorize(["consultant"]), userRoutes.paymentsRoutes);
};
const registerAdminRoutes = (app: Express) => {
  app.use("/admin/category", authorize(["admin"]), adminRoutes.categoryRoutes);
  app.use("/admin/legal", authorize(["admin"]), adminRoutes.legalRoutes);
  app.use("/admin/users", authorize(["admin"]), adminRoutes.usersRoutes);
  app.use("/admin/payments", authorize(["admin"]), adminRoutes.paymentsRoutes);
};

const registerWebhookRoutes = (app: Express) => {
  app.use("/webhook", webhookRoutes);
};

export { registerUserRoutes, registerAdminRoutes, registerWebhookRoutes };
