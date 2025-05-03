import { stripe_webhook } from "@controllers/orders";
import express, { Router } from "express";

const router = Router();

router.post("/", express.raw({ type: "application/json" }), stripe_webhook);

export default router;
