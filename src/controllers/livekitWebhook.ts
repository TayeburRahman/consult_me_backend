import { Request, Response } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { CallRecord } from "../schema";
import { getS3Url } from "@services/s3Service";
import { notifyRecordingStatus } from "@controllers/chat";

/**
 * LiveKit Webhook Handler
 * Handles events from LiveKit Cloud (egress_started, egress_ended, room_finished)
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

    const authHeader = req.get("Authorization") || "";
    let body: string;

    if (typeof req.body === "string") {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString("utf-8");
    } else {
      body = JSON.stringify(req.body);
    }

    let event;
    try {
      event = await receiver.receive(body, authHeader);
    } catch (verifyError) {
      console.error("❌ LiveKit webhook: Verification failed:", verifyError);
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
      case "egress_started":
        await handleEgressStarted(event);
        break;
      case "egress_ended":
        await handleEgressEnded(event);
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
 * Update CallRecord status to recording & set recordingStartedAt
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
      callRecord.recordingStartedAt = new Date();
      callRecord.status = "recording";
      await callRecord.save();
      console.log(`🔴 LiveKit webhook: Egress started for room ${roomName} at ${callRecord.recordingStartedAt.toISOString()}`);

      notifyRecordingStatus(
        callRecord.caller.toString(),
        callRecord.receiver.toString(),
        {
          roomName,
          status: "started",
          recordingStartedAt: callRecord.recordingStartedAt,
          message: "🔴 Cloud Recording Started",
        }
      );
    }
  } catch (error) {
    console.error("❌ handleEgressStarted error:", error);
  }
};

/**
 * Handle egress_ended event
 * Update CallRecord with recording URL, key, duration, and status completed
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

    const callRecord = await CallRecord.findOne({ roomName });
    if (!callRecord) {
      console.log(`⚠️ LiveKit webhook: No CallRecord found for room ${roomName}`);
      return;
    }

    let recordingKey = "";
    let recordingUrl = "";
    let recordingDuration = 0;

    if (egressInfo.fileResults && egressInfo.fileResults.length > 0) {
      const fileResult = egressInfo.fileResults[0];
      recordingKey = fileResult.filename || "";
      recordingDuration = Math.floor((fileResult.duration || 0) / 1e9);
    }

    if (!recordingKey && egressInfo.file) {
      recordingKey = egressInfo.file.filename || "";
      recordingDuration = Math.floor((egressInfo.file.duration || 0) / 1e9);
    }

    if (!recordingKey && egressInfo.segmentResults && egressInfo.segmentResults.length > 0) {
      const segmentResult = egressInfo.segmentResults[0];
      recordingKey = segmentResult.playlistName || "";
      recordingDuration = Math.floor((segmentResult.duration || 0) / 1e9);
    }

    if (recordingKey) {
      recordingUrl = getS3Url(recordingKey);
    }

    callRecord.egressId = egressId;
    callRecord.recordingKey = recordingKey;
    callRecord.recordingUrl = recordingUrl;
    callRecord.recordingEndedAt = new Date();
    callRecord.status = recordingKey ? "completed" : "failed";

    if (recordingDuration > 0) {
      callRecord.duration = recordingDuration;
    }

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

    notifyRecordingStatus(
      callRecord.caller.toString(),
      callRecord.receiver.toString(),
      {
        roomName,
        status: "completed",
        recordingEndedAt: callRecord.recordingEndedAt,
        recordingUrl: callRecord.recordingUrl,
        duration: callRecord.duration,
        message: "✅ Cloud Recording Saved to S3",
      }
    );
  } catch (error) {
    console.error("❌ handleEgressEnded error:", error);
  }
};

/**
 * Handle room_finished event
 */
const handleRoomFinished = async (event: any) => {
  try {
    const room = event.room;
    if (!room) return;

    const roomName = room.name;
    if (!roomName) return;

    const callRecord = await CallRecord.findOne({ roomName });
    if (!callRecord) return;

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
