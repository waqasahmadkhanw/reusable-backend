import { ApiError } from "./ApiError.js";
import { normalizeMongoError } from "./mongoError.js";
import fs from "fs/promises";
import { logger } from "./logger.js";

const STATUS_MESSAGES = {
  400: "Bad request",
  401: "Authentication required",
  403: "Forbidden",
  404: "Resource not found",
  409: "Conflict",
  422: "Validation failed",
  429: "Too many requests",
};

const cleanupUploadedFiles = async (req) => {
  const files = [];
  if (req.file?.path) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  if (req.files && typeof req.files === "object" && !Array.isArray(req.files)) {
    for (const list of Object.values(req.files)) if (Array.isArray(list)) files.push(...list);
  }
  await Promise.all(files.map((file) => file?.path ? fs.unlink(file.path).catch(() => {}) : null));
};

export const errorHandler = (err, req, res, _next) => {
  void cleanupUploadedFiles(req);
  const normalized = normalizeMongoError(err);
  const statusCode = Number(normalized?.statusCode) || 500;
  const isOperational = normalized instanceof ApiError && normalized.statusCode < 500;
  const isProduction = process.env.NODE_ENV === "production";

  const requestId = req.id || req.get("x-request-id") || undefined;
  const logPayload = {
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    name: normalized?.name,
    message: normalized?.message,
    stack: normalized?.stack,
  };

  if (statusCode >= 500) logger.error("Unhandled request error", logPayload);
  else logger.warn("Request error", logPayload);

  if (res.headersSent) return res.end();

  const response = {
    statusCode: statusCode >= 400 && statusCode <= 599 ? statusCode : 500,
    success: false,
    data: null,
    message: isProduction && !isOperational
      ? "Internal Server Error"
      : normalized?.message || STATUS_MESSAGES[statusCode] || "Internal Server Error",
  };

  if (requestId) response.requestId = requestId;
  if (Array.isArray(normalized?.errors) && normalized.errors.length && (isOperational || !isProduction)) {
    response.errors = normalized.errors;
  }

  return res.status(response.statusCode).json(response);
};
