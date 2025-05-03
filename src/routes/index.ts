import { Express } from "express";
import * as userRoutes from "./app";
import * as adminRoutes from "./admin";
import webhookRoutes from "./webhook.routes";
import authorize from "@middleware/auth";

const registerUserRoutes = (app: Express) => {
  app.use("/auth", userRoutes.authRoutes);
};
const registerAdminRoutes = (app: Express) => {
  // app.use(
  //   "/admin/categories",
  //   authorize(["admin"]),
  //   adminRoutes.categoriesRoutes
  // );
};

const registerWebhookRoutes = (app: Express) => {
  // app.use("/webhook", webhookRoutes);
};

export { registerUserRoutes, registerAdminRoutes, registerWebhookRoutes };
