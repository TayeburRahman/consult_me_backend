import { Request, Response } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { CallRecord } from "../schema";
import { getS3Url } from "@services/s3Service";

/**
 * LiveKit Webhook Handler
 * Handles events from LiveKit Cloud (egress_ended, room_finished)
 * 
 * LiveKit sends webhook events as POST with:
 * - Header: Authorization (bearer token for verification)
 * - Body: JSON with event type and event data
 */
const livekit_webhook = async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("❌ LiveKit webhook: API key or secret not configured");
      res.status(500).json({ message: "LiveKit credentials not configured" });
      return;
    }

    const receiver = new WebhookReceiver(apiKey, apiSecret);

    // Get the raw body and authorization header
    const authHeader = req.get("Authorization") || "";
    let body: string;

    if (typeof req.body === "string") {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString("utf-8");
    } else {
      body = JSON.stringify(req.body);
    }

    // Verify and parse the webhook event
    let event;
    try {
      event = await receiver.receive(body, authHeader);
    } catch (verifyError) {
      console.error("❌ LiveKit webhook: Verification failed:", verifyError);
      // Still try to parse the event without verification for development
      try {
        event = JSON.parse(body);
        console.warn("⚠️ LiveKit webhook: Proceeding without signature verification (dev mode)");
      } catch {
        res.status(400).json({ message: "Invalid webhook payload" });
        return;
      }
    }

    console.log(`📡 LiveKit webhook received: ${event.event}`, JSON.stringify(event, null, 2));

    switch (event.event) {
      case "egress_ended":
        await handleEgressEnded(event);
        break;
      case "egress_started":
        await handleEgressStarted(event);
        break;
      case "room_finished":
        await handleRoomFinished(event);
        break;
      default:
        console.log(`📡 LiveKit webhook: Unhandled event type: ${event.event}`);
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("❌ LiveKit webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};

/**
 * Handle egress_started event
 * Store the egress ID on the call record
 */
const handleEgressStarted = async (event: any) => {
  try {
    const egressInfo = event.egressInfo;
    if (!egressInfo) return;

    const roomName = egressInfo.roomName;
    const egressId = egressInfo.egressId;

    if (!roomName) return;

    const callRecord = await CallRecord.findOne({ roomName });
    if (callRecord) {
      callRecord.egressId = egressId;
      await callRecord.save();
      console.log(`✅ LiveKit webhook: Egress started for room ${roomName}, egressId: ${egressId}`);
    }
  } catch (error) {
    console.error("❌ handleEgressStarted error:", error);
  }
};

/**
 * Handle egress_ended event
 * Update CallRecord with recording URL, key, and duration
 */
const handleEgressEnded = async (event: any) => {
  try {
    const egressInfo = event.egressInfo;
    if (!egressInfo) return;

    const roomName = egressInfo.roomName;
    const egressId = egressInfo.egressId;

    if (!roomName) {
      console.log("❌ LiveKit webhook: No room name in egress_ended event");
      return;
    }

    // Find the call record by room name
    const callRecord = await CallRecord.findOne({ roomName });
    if (!callRecord) {
      console.log(`⚠️ LiveKit webhook: No CallRecord found for room ${roomName}`);
      return;
    }

    // Extract file info from egress results
    // LiveKit sends file results in different formats depending on the output type
    let recordingKey = "";
    let recordingUrl = "";
    let recordingDuration = 0;

    // Check for file results (Room Composite -> File output)
    if (egressInfo.fileResults && egressInfo.fileResults.length > 0) {
      const fileResult = egressInfo.fileResults[0];
      recordingKey = fileResult.filename || "";
      recordingDuration = Math.floor((fileResult.duration || 0) / 1e9); // nanoseconds to seconds
    }

    // Check for file result (singular - some SDK versions)
    if (!recordingKey && egressInfo.file) {
      recordingKey = egressInfo.file.filename || "";
      recordingDuration = Math.floor((egressInfo.file.duration || 0) / 1e9);
    }

    // Check for segment results
    if (!recordingKey && egressInfo.segmentResults && egressInfo.segmentResults.length > 0) {
      const segmentResult = egressInfo.segmentResults[0];
      recordingKey = segmentResult.playlistName || "";
      recordingDuration = Math.floor((segmentResult.duration || 0) / 1e9);
    }

    if (recordingKey) {
      recordingUrl = getS3Url(recordingKey);
    }

    // Update the call record
    callRecord.egressId = egressId;
    callRecord.recordingKey = recordingKey;
    callRecord.recordingUrl = recordingUrl;
    callRecord.status = recordingKey ? "completed" : "failed";

    // Update duration if we got it from egress and it's more accurate than what we had
    if (recordingDuration > 0) {
      callRecord.duration = recordingDuration;
    }

    // Set callEndedAt if not already set
    if (!callRecord.callEndedAt) {
      callRecord.callEndedAt = new Date();
      if (callRecord.callStartedAt && !callRecord.duration) {
        callRecord.duration = Math.floor(
          (new Date().getTime() - new Date(callRecord.callStartedAt).getTime()) / 1000
        );
      }
    }

    await callRecord.save();
    console.log(`✅ LiveKit webhook: CallRecord updated for room ${roomName} — recording: ${recordingKey}`);
  } catch (error) {
    console.error("❌ handleEgressEnded error:", error);
  }
};

/**
 * Handle room_finished event
 * Update callEndedAt and duration for the call record
 */
const handleRoomFinished = async (event: any) => {
  try {
    const room = event.room;
    if (!room) return;

    const roomName = room.name;
    if (!roomName) return;

    const callRecord = await CallRecord.findOne({ roomName });
    if (!callRecord) {
      console.log(`⚠️ LiveKit webhook: No CallRecord found for room ${roomName}`);
      return;
    }

    // Only update if not already ended
    if (!callRecord.callEndedAt) {
      callRecord.callEndedAt = new Date();
      if (callRecord.callStartedAt) {
        callRecord.duration = Math.floor(
          (new Date().getTime() - new Date(callRecord.callStartedAt).getTime()) / 1000
        );
      }
      await callRecord.save();
      console.log(`✅ LiveKit webhook: Room finished for ${roomName}, duration: ${callRecord.duration}s`);
    }
  } catch (error) {
    console.error("❌ handleRoomFinished error:", error);
  }
};

export { livekit_webhook };
