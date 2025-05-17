import { user_overview } from "@controllers/dashboard";
import { Router } from "express";

const router = Router();

router.get("/overview", user_overview);

export default router;
