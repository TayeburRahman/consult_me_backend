import { get_notification } from "@controllers/notification";
import { Router } from "express";

const router = Router();

router.get("/", get_notification);

export default router;
