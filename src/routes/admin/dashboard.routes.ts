import { admin_dashboard } from "@controllers/dashboard";
import { Router } from "express";

const router = Router();

router.get("/", admin_dashboard);

export default router;
