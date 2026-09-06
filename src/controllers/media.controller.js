import mongoose from "mongoose";
import { Media } from "../models/media.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { PERMISSIONS } from "../constants/permissions.js";

const id = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new ApiError(400, "Invalid media ID");
};

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file?.path) throw new ApiError(400, "File is required");
  const uploaded = await uploadOnCloudinary(req.file.path);
  if (!uploaded) throw new ApiError(500, "Cloudinary upload failed");

  try {
    const media = await Media.create({
      uploadedBy: req.user._id,
      publicId: uploaded.public_id,
      url: uploaded.url || uploaded.secure_url,
      secureUrl: uploaded.secure_url || uploaded.url,
      filename: req.file.originalname,
      format: uploaded.format || "",
      resourceType: uploaded.resource_type || "image",
      size: uploaded.bytes || 0,
      width: uploaded.width || 0,
      height: uploaded.height || 0,
      mimeType: req.file.mimetype || "",
      mediaType: req.body.mediaType || "other",
      usage: req.body.usage || "",
      altText: req.body.altText || "",
      isPublic: req.body.isPublic === undefined ? true : req.body.isPublic === true || req.body.isPublic === "true",
    });
    res.status(201).json(new ApiResponse(201, media, "Media uploaded successfully"));
  } catch (error) {
    await deleteFromCloudinary(uploaded.public_id, uploaded.resource_type || "image").catch(() => {});
    throw error;
  }
});

export const getAllMedia = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const canManage = (req.userPermissions || []).includes(PERMISSIONS.MANAGE_MEDIA);
  const filter = { status: "active" };
  if (req.query.mediaType) filter.mediaType = req.query.mediaType;
  if (req.query.usage) filter.usage = req.query.usage;
  if (req.query.uploadedBy) {
    id(req.query.uploadedBy);
    if (!canManage && req.query.uploadedBy !== req.user._id.toString()) throw new ApiError(403, "Not authorized to filter another user's media");
    filter.uploadedBy = req.query.uploadedBy;
  }
  if (!canManage && filter.uploadedBy?.toString() !== req.user._id.toString()) filter.isPublic = true;

  const [media, total] = await Promise.all([
    Media.find(filter).populate("uploadedBy", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Media.countDocuments(filter),
  ]);
  res.status(200).json(new ApiResponse(200, { media, pagination: { total, page, pages: Math.ceil(total / limit) } }, "Media fetched successfully"));
});

export const getMediaById = asyncHandler(async (req, res) => {
  id(req.params.id);
  const media = await Media.findById(req.params.id).populate("uploadedBy", "name email");
  if (!media) throw new ApiError(404, "Media not found");
  const canManage = (req.userPermissions || []).includes(PERMISSIONS.MANAGE_MEDIA);
  const isOwner = media.uploadedBy._id.toString() === req.user._id.toString();
  if (media.status !== "active" || (!media.isPublic && !isOwner && !canManage)) throw new ApiError(404, "Media not found");
  res.status(200).json(new ApiResponse(200, media, "Media fetched successfully"));
});

export const updateMedia = asyncHandler(async (req, res) => {
  id(req.params.id);
  const media = await Media.findById(req.params.id);
  if (!media) throw new ApiError(404, "Media not found");
  if (!(req.userPermissions || []).includes(PERMISSIONS.MANAGE_MEDIA) && media.uploadedBy.toString() !== req.user._id.toString()) throw new ApiError(403, "Not authorized");
  for (const field of ["altText", "usage", "isPublic", "mediaType"]) if (req.body[field] !== undefined) media[field] = req.body[field];
  await media.save();
  res.status(200).json(new ApiResponse(200, media, "Media updated successfully"));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  id(req.params.id);
  const media = await Media.findById(req.params.id);
  if (!media) throw new ApiError(404, "Media not found");
  if (!(req.userPermissions || []).includes(PERMISSIONS.MANAGE_MEDIA) && media.uploadedBy.toString() !== req.user._id.toString()) throw new ApiError(403, "Not authorized");
  media.status = "deleted";
  media.isPublic = false;
  await media.save();
  await deleteFromCloudinary(media.publicId, media.resourceType).catch(() => {});
  res.status(200).json(new ApiResponse(200, null, "Media deleted successfully"));
});
