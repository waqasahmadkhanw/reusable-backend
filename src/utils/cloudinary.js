import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { logger } from "./logger.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;
  try {
    const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    logger.error("Cloudinary upload failed", { error });
    return null;
  }
};

export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    logger.error("Cloudinary delete failed", { error });
    return null;
  }
};
