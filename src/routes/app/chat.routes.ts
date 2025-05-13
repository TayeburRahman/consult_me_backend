import { get_chat_list } from "@controllers/chat";
import { Router } from "express";

const router = Router();

router.get("/chat_list", get_chat_list);

export default router;
