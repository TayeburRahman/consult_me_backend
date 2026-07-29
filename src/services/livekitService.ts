import {
  AccessToken,
  RoomServiceClient,
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
 * Automatically create/ensure room exists with Auto Egress (S3 recording) attached
 */
const createRoomWithAutoEgress = async (roomName: string) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION || "us-east-1";
  const accessKey = process.env.AWS_S3_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKey || !secretKey) {
    console.warn("⚠️ AWS S3 credentials missing. Skipping Auto Egress configuration.");
    return;
  }

  try {
    const roomService = getRoomServiceClient();

    const fileOutput = new EncodedFileOutput({
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
    console.log(`🎥 Auto Egress (S3 Recording) successfully configured for room: ${roomName}`);
  } catch (error: any) {
    // If room already exists, LiveKit will return notice, which is fine
    console.log(`ℹ️ LiveKit Room create status for ${roomName}:`, error?.message || error);
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

export { generateLiveKitToken, createRoomWithAutoEgress };
