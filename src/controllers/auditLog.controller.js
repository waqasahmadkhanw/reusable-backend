import mongoose from "mongoose";

import { AuditLog } from "../models/auditLog.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validateMongoId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid MongoDB ID");
  }
};

// =====================================================
// GET ALL AUDIT LOGS (Admin)
// =====================================================
export const getAllAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const { action, resource, user, startDate, endDate } = req.query;
  const search = String(req.query.search || "").trim().slice(0, 100);
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const query = {};

  if (search) {
    query.$or = [
      { action: { $regex: escapedSearch, $options: "i" } },
      { resource: { $regex: escapedSearch, $options: "i" } },
    ];
  }
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (user) {
    validateMongoId(user);
    query.user = user;
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) { const date = new Date(startDate); if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid startDate"); query.createdAt.$gte = date; }
    if (endDate) { const date = new Date(endDate); if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid endDate"); query.createdAt.$lte = date; }
    if (query.createdAt.$gte && query.createdAt.$lte && query.createdAt.$gte > query.createdAt.$lte) throw new ApiError(400, "startDate must be before endDate");
  }

  const logs = await AuditLog.find(query)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await AuditLog.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        pagination: { total, page, pages: Math.ceil(total / limit) },
        count: logs.length,
        logs,
      },
      "Audit logs fetched successfully"
    )
  );
});

// =====================================================
// GET SINGLE AUDIT LOG (Admin)
// =====================================================
export const getAuditLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const log = await AuditLog.findById(id).populate("user", "name email");
  if (!log) {
    throw new ApiError(404, "Audit log not found");
  }

  return res.status(200).json(
    new ApiResponse(200, log, "Audit log fetched successfully")
  );
});

// =====================================================
// GET AUDIT LOG SUMMARY / STATS (Admin)
// =====================================================
export const getAuditLogStats = asyncHandler(async (req, res) => {
  const stats = await AuditLog.aggregate([
    {
      $group: {
        _id: "$action",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  const totalLogs = await AuditLog.countDocuments();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalLogs,
        byAction: stats,
      },
      "Audit log stats fetched successfully"
    )
  );
});

// =====================================================
// DELETE AUDIT LOG (Admin)
// =====================================================
export const deleteAuditLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const log = await AuditLog.findById(id);
  if (!log) {
    throw new ApiError(404, "Audit log not found");
  }

  await log.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, null, "Audit log deleted successfully")
  );
});

// =====================================================
// CLEAR AUDIT LOGS (Admin) — optional bulk clear
// =====================================================
export const clearAuditLogs = asyncHandler(async (req, res) => {
  if (req.body?.confirm !== "DELETE_ALL") throw new ApiError(400, "Confirmation is required");
  await AuditLog.deleteMany({});
  return res.status(200).json(
    new ApiResponse(200, null, "Audit logs cleared successfully")
  );
});
