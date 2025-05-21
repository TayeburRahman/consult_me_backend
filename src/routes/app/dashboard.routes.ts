import { overview } from "@controllers/dashboard";
import { Router } from "express";

const router = Router();

router.get("/overview", overview);

export default router;
