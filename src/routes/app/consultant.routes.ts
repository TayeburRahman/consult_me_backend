import {
  get_all_consultants,
  get_consultant_by_category,
} from "@controllers/consultant";
import { Router } from "express";

const router = Router();

router.get("/", get_consultant_by_category);
router.get("/all", get_all_consultants);

export default router;
