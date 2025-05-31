import {
  add_category,
  delete_category,
  get_categories,
  update_category,
} from "@controllers/category";
import { Router } from "express";
import multer from "multer";

const router = Router();

const upload = multer({
  dest: "uploads/",
});

router.get("/", get_categories);
router.post("/add", upload.single("icon"), add_category);
router.patch("/update", upload.single("icon"), update_category);
router.delete("/delete", upload.single("icon"), delete_category);

export default router;
