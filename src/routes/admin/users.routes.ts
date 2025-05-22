import { get_consultants, get_users, toggle_ban } from "@controllers/users";
import { Router } from "express";

const router = Router();

router.get("/", get_users);
router.get("/consultants", get_consultants);
router.post("/ban", toggle_ban);

export default router;
