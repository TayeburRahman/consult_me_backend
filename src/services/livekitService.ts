import { AccessToken } from "livekit-server-sdk";

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

export { generateLiveKitToken };
