import {
  add_review,
  get_all_consultants,
  get_consultant_by_category,
} from "@controllers/consultant";
import { Router } from "express";

const router = Router();

router.get("/", get_consultant_by_category);
router.get("/all", get_all_consultants);
router.post("/review", add_review);

export default router;
