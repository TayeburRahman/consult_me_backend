import { get_map_consultants } from "@controllers/map";
import { Router } from "express";

const router = Router();

router.get("/", get_map_consultants);

export default router;
