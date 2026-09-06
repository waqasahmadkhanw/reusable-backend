import mongoose from "mongoose";

import { Setting } from "../models/setting.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validateMongoId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid MongoDB ID");
  }
};

// =====================================================
// CREATE SETTING (Admin)
// =====================================================
export const createSetting = asyncHandler(async (req, res) => {
  const { key, value, label, group, valueType, isSensitive, isPublic } = req.body;

  if (!key?.trim()) {
    throw new ApiError(400, "Setting key is required");
  }

  const normalizedKey = key.trim().toLowerCase();
  const exists = await Setting.findOne({ key: normalizedKey });
  if (exists) {
    throw new ApiError(409, "Setting with this key already exists");
  }

  const setting = await Setting.create({
    key: normalizedKey,
    value,
    label,
    group,
    valueType,
    isSensitive,
    isPublic,
    updatedBy: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(201, setting, "Setting created successfully")
  );
});

// =====================================================
// GET PUBLIC SETTINGS (no auth)
// Returns only non-sensitive public settings
// =====================================================
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find({
    isPublic: true,
    isActive: true,
    isSensitive: false,
  }).select("key value valueType label group");

  return res.status(200).json(
    new ApiResponse(200, settings, "Public settings fetched successfully")
  );
});

// =====================================================
// GET ALL SETTINGS (Admin)
// =====================================================
export const getAllSettings = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const { group } = req.query;
  const search = String(req.query.search || "").trim().slice(0, 100);
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const query = {};
  if (group) query.group = group;
  if (search) {
    query.$or = [
      { key: { $regex: escapedSearch, $options: "i" } },
      { label: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const settings = await Setting.find(query)
    .sort({ group: 1, key: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Setting.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        pagination: { total, page, pages: Math.ceil(total / limit) },
        count: settings.length,
        settings,
      },
      "Settings fetched successfully"
    )
  );
});

// =====================================================
// GET SETTING BY KEY (Admin)
// =====================================================
export const getSettingByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const normalizedKey = key.trim().toLowerCase();

  const setting = await Setting.findOne({ key: normalizedKey });
  if (!setting) {
    throw new ApiError(404, "Setting not found");
  }

  return res.status(200).json(
    new ApiResponse(200, setting, "Setting fetched successfully")
  );
});

// =====================================================
// GET SETTING BY ID (Admin)
// =====================================================
export const getSettingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const setting = await Setting.findById(id);
  if (!setting) {
    throw new ApiError(404, "Setting not found");
  }

  return res.status(200).json(
    new ApiResponse(200, setting, "Setting fetched successfully")
  );
});

// =====================================================
// UPDATE SETTING (Admin)
// =====================================================
export const updateSetting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const setting = await Setting.findById(id);
  if (!setting) {
    throw new ApiError(404, "Setting not found");
  }

  const allowedFields = ["value", "label", "group", "valueType", "isSensitive", "isPublic", "isActive"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      setting[field] = req.body[field];
    }
  });

  setting.updatedBy = req.user._id;
  await setting.save();

  return res.status(200).json(
    new ApiResponse(200, setting, "Setting updated successfully")
  );
});

// =====================================================
// DELETE SETTING (Admin)
// =====================================================
export const deleteSetting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const setting = await Setting.findById(id);
  if (!setting) {
    throw new ApiError(404, "Setting not found");
  }

  await setting.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, null, "Setting deleted successfully")
  );
});

// =====================================================
// BULK UPDATE SETTINGS (Admin)
// Body: { settings: [{ key, value }] }
// =====================================================
export const bulkUpdateSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;

  if (!Array.isArray(settings) || settings.length === 0) {
    throw new ApiError(400, "Settings array is required");
  }

  const updated = [];
  for (const item of settings) {
    if (!item?.key) throw new ApiError(400, "Each setting update requires a key");
    const key = String(item.key).trim().toLowerCase();
    const setting = await Setting.findOne({ key });
    if (!setting) throw new ApiError(404, `Setting not found: ${key}`);
    setting.value = item.value;
    setting.updatedBy = req.user._id;
    await setting.save();
    updated.push(setting);
  }

  return res.status(200).json(
    new ApiResponse(200, updated, "Settings updated successfully")
  );
});
