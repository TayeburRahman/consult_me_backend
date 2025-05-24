import {
  get_notification,
  get_notification_count,
} from "@controllers/notification";
import { Router } from "express";

const router = Router();

router.get("/", get_notification);
router.get("/count", get_notification_count);

export default router;
