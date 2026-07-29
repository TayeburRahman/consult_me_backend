import { stripe_webhook } from "@controllers/payments";
import { livekit_webhook } from "@controllers/livekitWebhook";
import express, { Router } from "express";

const router = Router();

router.post("/", express.raw({ type: "application/json" }), stripe_webhook);

// LiveKit webhook — needs raw body for signature verification
router.post(
  "/livekit",
  express.raw({ type: "application/webhook+json" }),
  (req, res, next) => {
    Promise.resolve(livekit_webhook(req, res)).catch(next);
  }
);

// Also accept application/json for LiveKit webhooks
router.post(
  "/livekit-json",
  express.json(),
  (req, res, next) => {
    Promise.resolve(livekit_webhook(req, res)).catch(next);
  }
);

export default router;
