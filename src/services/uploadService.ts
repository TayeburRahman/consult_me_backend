import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import path from "path";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function (
  file: Express.Multer.File,
  type: "image" | "video" | "raw" | "auto"
) {
  try {
    const fileExtension = path.extname(file.originalname);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        file.path,
        {
          resource_type: type,
          format: fileExtension.replace(".", ""),
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as { secure_url: string });
          }
        }
      );
    });

    return (result as { secure_url: string }).secure_url;
  } catch (error) {
    console.error(error);
    return null;
  }
}
