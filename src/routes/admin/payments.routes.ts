import {
  get_withdraw_requests,
  transfer_funds,
  update_withdraw_request,
} from "@controllers/payments";
import { Router } from "express";

const router = Router();

router.post("/transfer-funds", transfer_funds);
router.get("/withdraw-requests", get_withdraw_requests);
router.patch("/withdraw-requests/update", update_withdraw_request);

export default router;
