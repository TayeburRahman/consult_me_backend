import { stripe_webhook } from "@controllers/payments";
import { livekit_webhook } from "@controllers/livekitWebhook";
import express, { Router } from "express";

const router = Router();

router.post("/stripe", express.raw({ type: "application/json" }), stripe_webhook);

// LiveKit webhook — support all content-types (webhook+json, json, raw text/buffer)
router.post(
  "/livekit",
  express.raw({ type: "*/*" }),
  (req, res, next) => {
    Promise.resolve(livekit_webhook(req, res)).catch(next);
  }
);

// Also accept /livekit-json for backward compatibility
router.post(
  "/livekit-json",
  express.json(),
  (req, res, next) => {
    Promise.resolve(livekit_webhook(req, res)).catch(next);
  }
);

export default router;
