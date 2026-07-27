import { get_chat_list, upload_attachments, generate_livekit_token } from "@controllers/chat";
import { Router } from "express";
import multer from "multer";

const router = Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/chat_list", get_chat_list);

// LiveKit token generation endpoint
router.post("/livekit-token", (req, res, next) => {
  Promise.resolve(generate_livekit_token(req, res)).catch(next);
});

router.post(
  "/upload",
  upload.fields([
    {
      name: "images",
      maxCount: 10,
    },
    {
      name: "videos",
      maxCount: 10,
    },
  ]),
  (req, res, next) => {
    Promise.resolve(upload_attachments(req, res)).catch(next);
  }
);

export default router;
