import { AuthenticatedRequest } from "@middleware/auth";
import { Response } from "express";
import { CallRecord, Booking } from "../schema";
import { generatePresignedUrl } from "@services/s3Service";

/**
 * Get all call records for a specific User ID (or current logged in user)
 * 
 * Query params:
 *  - user_id: string (optional, defaults to req.user.id)
 *  - page: number (default 1)
 *  - limit: number (default 20)
 *  - type: "audio" | "video" | "all" (default "all")
 * 
 * Returns full call metadata:
 * 1. kotokhon kotha bolsi (duration in seconds)
 * 2. video naki audio call (callType)
 * 3. consultant ke and tar info (caller / receiver populated with service, name, photo, etc.)
 * 4. booking time (bookingId) and call kokhon kora hoisilo (callStartedAt, callEndedAt)
 * 5. S3 link & presignedUrl for preview and download
 */
const get_call_records = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = (req.query.user_id as string) || (req.params.userId as string) || req.user?.id;
    
    if (!targetUserId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = (req.query.type as string) || "all";
    const skip = (page - 1) * limit;

    // Filter: User must be either caller or receiver
    const query: any = {
      $or: [{ caller: targetUserId }, { receiver: targetUserId }],
    };

    // Filter by call type (audio / video)
    if (type !== "all" && (type === "audio" || type === "video")) {
      query.callType = type;
    }

    // Only show valid call statuses
    query.status = { $in: ["completed", "in_progress", "no_recording"] };

    const [records, total] = await Promise.all([
      CallRecord.find(query)
        .populate({
          path: "caller",
          select: "name photo_url email role service city country price about",
          populate: { path: "service", select: "name icon_url -_id" },
        })
        .populate({
          path: "receiver",
          select: "name photo_url email role service city country price about",
          populate: { path: "service", select: "name icon_url -_id" },
        })
        .populate({
          path: "bookingId",
          select: "date time status remind_before transaction_id",
        })
        .sort({ callStartedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CallRecord.countDocuments(query),
    ]);

    // Attach presigned S3 URLs to each record for streaming & download
    const recordsWithUrls = await Promise.all(
      records.map(async (record: any) => {
        let presignedUrl = null;
        if (record.recordingKey) {
          try {
            presignedUrl = await generatePresignedUrl(record.recordingKey);
          } catch (e) {
            console.error(`Error generating presigned URL for ${record.recordingKey}:`, e);
          }
        }
        return {
          ...record,
          presignedUrl: presignedUrl || record.recordingUrl || null,
        };
      })
    );

    res.json({
      message: "Call records fetched successfully",
      data: recordsWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching call records:", error);
    res.status(500).json({ message: "Error fetching call records" });
  }
};

/**
 * Get a single call record with full details & presigned S3 URL
 */
const get_call_record_detail = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const record = await CallRecord.findById(id)
      .populate({
        path: "caller",
        select: "name photo_url email role service city country price about",
        populate: { path: "service", select: "name icon_url -_id" },
      })
      .populate({
        path: "receiver",
        select: "name photo_url email role service city country price about",
        populate: { path: "service", select: "name icon_url -_id" },
      })
      .populate({
        path: "bookingId",
        select: "date time status remind_before transaction_id",
      });

    if (!record) {
      res.status(404).json({ message: "Call record not found" });
      return;
    }

    // Verify user authorization
    const callerId = (record.caller as any)._id?.toString() || (record.caller as any).toString();
    const receiverId = (record.receiver as any)._id?.toString() || (record.receiver as any).toString();

    if (callerId !== userId && receiverId !== userId && req.user?.role !== "admin") {
      res.status(403).json({ message: "You are not authorized to view this record" });
      return;
    }

    // Generate presigned URL
    let presignedUrl = null;
    if (record.recordingKey) {
      try {
        presignedUrl = await generatePresignedUrl(record.recordingKey);
      } catch (e) {
        console.error("Error generating presigned URL:", e);
      }
    }

    res.json({
      message: "Call record fetched successfully",
      data: {
        ...record.toObject(),
        presignedUrl: presignedUrl || record.recordingUrl || null,
      },
    });
  } catch (error) {
    console.error("Error fetching call record detail:", error);
    res.status(500).json({ message: "Error fetching call record" });
  }
};

/**
 * Generate a presigned S3 URL for a specific call recording ID
 */
const get_presigned_url = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const record = await CallRecord.findById(id);

    if (!record) {
      res.status(404).json({ message: "Call record not found" });
      return;
    }

    if (
      record.caller.toString() !== userId &&
      record.receiver.toString() !== userId &&
      req.user?.role !== "admin"
    ) {
      res.status(403).json({ message: "You are not authorized to access this recording" });
      return;
    }

    if (!record.recordingKey) {
      res.status(404).json({ message: "No recording available for this call" });
      return;
    }

    const presignedUrl = await generatePresignedUrl(record.recordingKey);

    res.json({
      message: "Presigned URL generated successfully",
      data: { presignedUrl, callType: record.callType },
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ message: "Error generating presigned URL" });
  }
};

export { get_call_records, get_call_record_detail, get_presigned_url };
