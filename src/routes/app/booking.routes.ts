import { book_an_appointment, get_available_slots } from "@controllers/booking";
import { Router } from "express";

const router = Router();

router.get("/available-slots", get_available_slots);
router.post("/", book_an_appointment);

export default router;
