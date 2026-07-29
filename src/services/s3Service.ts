import {
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "new-s3-buket2026";

/**
 * Generate a presigned URL for accessing an S3 object
 * @param key - S3 object key (e.g. "recordings/room_123456/output.mp4")
 * @param expiresIn - URL expiry in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL string
 */
const generatePresignedUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
};

/**
 * Build the full S3 URL for a recording
 * @param key - S3 object key
 * @returns Full S3 URL
 */
const getS3Url = (key: string): string => {
  const region = process.env.AWS_S3_REGION || "us-east-1";
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
};

export { generatePresignedUrl, getS3Url, s3Client, BUCKET_NAME };
