import {
  get_all_consultants,
  get_categories,
  get_consultant_by_category,
} from "@controllers/category";
import { Router } from "express";

const router = Router();

router.get("/", get_categories);
router.get("/consultant", get_consultant_by_category);
router.get("/consultant/all", get_all_consultants);

export default router;
