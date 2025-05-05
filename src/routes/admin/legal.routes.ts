import { update_legal_info } from "@controllers/legal";
import { Router } from "express";

const router = Router();

router.patch("/", update_legal_info);

export default router;
