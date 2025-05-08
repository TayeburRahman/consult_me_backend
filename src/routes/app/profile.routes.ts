import {
  change_password,
  get_profile,
  update_profile,
} from "@controllers/profile";
import { Router } from "express";
import multer from "multer";

const router = Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/", get_profile);
router.patch("/", upload.single("photo"), update_profile);
router.post("/change-password", change_password);

export default router;
