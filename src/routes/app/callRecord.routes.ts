import {
  get_call_records,
  get_call_record_detail,
  get_presigned_url,
} from "@controllers/callRecord";
import { Router } from "express";

const router = Router();

// Get all call records for authenticated user (paginated)
router.get("/", (req, res, next) => {
  Promise.resolve(get_call_records(req, res)).catch(next);
});

// Get presigned URL for a recording (must be before /:id to avoid route conflict)
router.get("/presigned-url/:id", (req, res, next) => {
  Promise.resolve(get_presigned_url(req, res)).catch(next);
});

// Get a single call record detail
router.get("/:id", (req, res, next) => {
  Promise.resolve(get_call_record_detail(req, res)).catch(next);
});

export default router;
