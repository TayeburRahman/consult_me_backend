import {
  account_link,
  create_withdraw_request,
  withdraw_history,
} from "@controllers/payments";
import { Router } from "express";

const router = Router();

router.get("/onboarding-link", account_link);
router.post("/withdraw", create_withdraw_request);
router.get("/withdraw-history", withdraw_history);

export default router;
