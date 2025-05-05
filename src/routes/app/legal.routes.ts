import { get_legal_info } from "@controllers/legal";
import { Router } from "express";

const router = Router();

router.get("/", get_legal_info);

export default router;
