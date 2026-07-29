import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  S3Upload,
  RoomCompositeEgressRequest,
  RoomEgress,
} from "livekit-server-sdk";

/**
 * Initialize RoomServiceClient for room management & Auto Egress
 */
const getRoomServiceClient = () => {
  const livekitUrl = process.env.LIVEKIT_URL || "";
  const apiKey = process.env.LIVEKIT_API_KEY || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";

  // Convert wss:// or ws:// to https:// or http:// for REST API client
  const httpUrl = livekitUrl.replace("wss://", "https://").replace("ws://", "http://");

  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
};

/**
 * Initialize EgressClient for starting on-demand recordings
 */
const getEgressClient = () => {
  const livekitUrl = process.env.LIVEKIT_URL || "";
  const apiKey = process.env.LIVEKIT_API_KEY || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";

  const httpUrl = livekitUrl.replace("wss://", "https://").replace("ws://", "http://");
  return new EgressClient(httpUrl, apiKey, apiSecret);
};

/**
 * Helper to build S3 EncodedFileOutput for LiveKit Egress
 */
const getS3FileOutput = (roomName: string): EncodedFileOutput | null => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION || "us-east-1";
  const accessKey = process.env.AWS_S3_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKey || !secretKey) {
    console.log("--------------------------------------------------");
    console.log(`⚠️ [LIVEKIT RECORDING WARNING] AWS S3 credentials missing in backend environment (.env).`);
    console.log(`⚠️ Bucket: ${bucket ? "Configured" : "MISSING"}, AccessKey: ${accessKey ? "Configured" : "MISSING"}, SecretKey: ${secretKey ? "Configured" : "MISSING"}`);
    console.log("--------------------------------------------------");
    return null;
  }

  return new EncodedFileOutput({
    filepath: `recordings/${roomName}-{time}.mp4`,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: accessKey,
        secret: secretKey,
        bucket: bucket,
        region: region,
      }),
    },
  });
};

/**
 * Automatically create/ensure room exists with Auto Egress (S3 recording) attached
 */
const createRoomWithAutoEgress = async (roomName: string) => {
  const fileOutput = getS3FileOutput(roomName);

  if (!fileOutput) {
    console.warn("⚠️ Skipping Auto Egress configuration due to missing AWS S3 credentials.");
    return;
  }

  try {
    const roomService = getRoomServiceClient();

    console.log("--------------------------------------------------");
    console.log(`🎬 [LIVEKIT RECORDING SETUP] ⏳ Configuring Auto Egress (S3 Recording) for room: ${roomName}`);
    console.log("--------------------------------------------------");

    // Create room with egress auto-recording rule
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes timeout when empty
      egress: new RoomEgress({
        room: new RoomCompositeEgressRequest({
          roomName: roomName,
          layout: "speaker",
          fileOutputs: [fileOutput],
        }),
      }),
    });
    console.log("--------------------------------------------------");
    console.log(`🎥 [LIVEKIT RECORDING SETUP] ✅ Auto Egress (S3 Recording) successfully configured for room: ${roomName}`);
    console.log("--------------------------------------------------");
  } catch (error: any) {
    console.log("--------------------------------------------------");
    console.log(`ℹ️ [LIVEKIT RECORDING SETUP] LiveKit Room status for ${roomName}: ${error?.message || error}`);
    console.log("--------------------------------------------------");
  }
};

/**
 * Explicitly start Room Composite Egress recording on-demand
 */
const startRoomRecording = async (roomName: string) => {
  const fileOutput = getS3FileOutput(roomName);
  if (!fileOutput) return null;

  try {
    const egressClient = getEgressClient();
    console.log("--------------------------------------------------");
    console.log(`🎬 [LIVEKIT RECORDING TRIGGER] ⏳ Triggering manual Room Egress recording for room: ${roomName}`);
    console.log("--------------------------------------------------");

    const info = await egressClient.startRoomCompositeEgress(
      roomName,
      fileOutput,
      { layout: "speaker" }
    );

    console.log("--------------------------------------------------");
    console.log(`🔴 [LIVEKIT RECORDING TRIGGER] ⏺️ Room Egress recording successfully started! Egress ID: ${info.egressId} | Status: ${info.status} | Room: ${roomName}`);
    console.log("--------------------------------------------------");
    return info;
  } catch (error: any) {
    console.log("--------------------------------------------------");
    console.log(`❌ [LIVEKIT RECORDING ERROR] LiveKit Egress Start Failed!`);
    console.log(`❌ Error Message: ${error?.message || error}`);
    console.log(`ℹ️ Note: If self-hosting LiveKit, ensure livekit/egress Docker container is running & connected to Redis.`);
    console.log("--------------------------------------------------");
    return null;
  }
};

/**
 * Generate a LiveKit access token for a user to join a room
 * @param roomName - The name of the LiveKit room
 * @param identity - The unique identity of the participant (user ID)
 * @param userName - Display name of the participant
 * @returns JWT token string
 */
const generateLiveKitToken = async (
  roomName: string,
  identity: string,
  userName?: string
): Promise<string> => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.log("❌ [LIVEKIT ERROR] LIVEKIT_API_KEY or LIVEKIT_API_SECRET missing in backend environment!");
    throw new Error("LiveKit API key or secret is not configured");
  }

  // Ensure room is created with Auto Egress attached before issuing token
  await createRoomWithAutoEgress(roomName);

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: userName || identity,
    ttl: "6h",
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();
  return jwt;
};

export { generateLiveKitToken, createRoomWithAutoEgress, startRoomRecording };
