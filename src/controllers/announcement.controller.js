import mongoose from "mongoose";
import { Announcement } from "../models/announcement.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Role } from "../models/role.model.js";

const id = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, "Invalid announcement ID");
  }
};

const canManage = (doc, user, permissions = []) =>
  permissions.includes("manage_announcements") ||
  doc.author.toString() === user._id.toString();

/**
 * Build the exact visibility predicate used by both collection and
 * single-resource reads. Keeping this centralized prevents a direct-ID
 * request from bypassing the list endpoint's publication/audience rules.
 */
const getVisibleAnnouncementFilter = (user) => ({
  status: "published",
  $or: [
    { audience: "all" },
    { audience: "authenticated" },
    { audience: "role", audienceRole: String(user.role).trim().toLowerCase() },
  ],
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    link = "",
    attachments = [],
    audience = "all",
    audienceRole = "",
  } = req.body;

  if (!title?.trim() || !content?.trim()) {
    throw new ApiError(400, "Title and content are required");
  }

  if (audience === "role") {
    if (
      !(await Role.exists({
        slug: String(audienceRole).trim().toLowerCase(),
        isActive: true,
      }))
    ) {
      throw new ApiError(422, "Audience role does not exist or is inactive");
    }
  }

  const doc = await Announcement.create({
    author: req.user._id,
    title: title.trim(),
    content: content.trim(),
    link,
    attachments,
    audience,
    audienceRole: String(audienceRole).trim().toLowerCase(),
  });

  res.status(201).json(new ApiResponse(201, doc, "Announcement created"));
});

export const getAnnouncements = asyncHandler(async (req, res) => {
  const docs = await Announcement.find(getVisibleAnnouncementFilter(req.user))
    .populate("author", "name email")
    .sort({ isPinned: -1, createdAt: -1 });

  res.status(200).json(new ApiResponse(200, docs, "Announcements fetched"));
});

export const getAnnouncementById = asyncHandler(async (req, res) => {
  id(req.params.id);

  const doc = await Announcement.findOne({
    _id: req.params.id,
    ...getVisibleAnnouncementFilter(req.user),
  }).populate("author", "name email");

  // Return 404 rather than revealing whether a draft/archived or
  // audience-restricted announcement exists.
  if (!doc) throw new ApiError(404, "Announcement not found");

  res.status(200).json(new ApiResponse(200, doc, "Announcement fetched"));
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  id(req.params.id);
  const doc = await Announcement.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Announcement not found");
  if (!canManage(doc, req.user, req.userPermissions)) {
    throw new ApiError(403, "Not authorized");
  }

  for (const field of [
    "title",
    "content",
    "link",
    "attachments",
    "audience",
    "audienceRole",
    "isPinned",
    "status",
  ]) {
    if (req.body[field] !== undefined) doc[field] = req.body[field];
  }

  await doc.save();
  res.status(200).json(new ApiResponse(200, doc, "Announcement updated"));
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  id(req.params.id);
  const doc = await Announcement.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Announcement not found");
  if (!canManage(doc, req.user, req.userPermissions)) {
    throw new ApiError(403, "Not authorized");
  }

  await doc.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Announcement deleted"));
});

export const togglePinAnnouncement = asyncHandler(async (req, res) => {
  id(req.params.id);
  const doc = await Announcement.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Announcement not found");
  if (!canManage(doc, req.user, req.userPermissions)) {
    throw new ApiError(403, "Not authorized");
  }

  doc.isPinned = !doc.isPinned;
  await doc.save();
  res.status(200).json(new ApiResponse(200, doc, "Pin status updated"));
});

export const publishAnnouncement = asyncHandler(async (req, res) => {
  id(req.params.id);
  const doc = await Announcement.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Announcement not found");
  if (!canManage(doc, req.user, req.userPermissions)) {
    throw new ApiError(403, "Not authorized");
  }

  doc.status = "published";
  doc.publishedAt = new Date();
  await doc.save();
  res.status(200).json(new ApiResponse(200, doc, "Announcement published"));
});

export const archiveAnnouncement = asyncHandler(async (req, res) => {
  id(req.params.id);
  const doc = await Announcement.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Announcement not found");
  if (!canManage(doc, req.user, req.userPermissions)) {
    throw new ApiError(403, "Not authorized");
  }

  doc.status = "archived";
  await doc.save();
  res.status(200).json(new ApiResponse(200, doc, "Announcement archived"));
});
