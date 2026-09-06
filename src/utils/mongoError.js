import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

const isDuplicateKeyError = (error) => error?.code === 11000 || error?.name === "MongoServerError" && error?.code === 11000;

const duplicateFields = (error) => {
  if (error?.keyValue && typeof error.keyValue === "object") return Object.keys(error.keyValue);
  const match = String(error?.message || "").match(/index: ([^ ]+) /i);
  return match?.[1] ? [match[1].replace(/_1$/, "")] : [];
};

export const normalizeMongoError = (error) => {
  if (error instanceof ApiError) return error;

  if (isDuplicateKeyError(error)) {
    const fields = duplicateFields(error);
    return new ApiError(409, fields.length ? `Duplicate value for: ${fields.join(", ")}` : "A record with the same unique value already exists", fields);
  }

  if (error instanceof mongoose.Error.ValidationError || error?.name === "ValidationError") {
    const errors = Object.values(error.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
      value: item.value,
    }));
    return new ApiError(422, "Validation failed", errors);
  }

  if (error instanceof mongoose.Error.CastError || error?.name === "CastError") {
    return new ApiError(400, `Invalid ${error.path || "value"}`);
  }

  if (error?.name === "StrictModeError") return new ApiError(400, "Invalid request field");
  if (error?.name === "DocumentNotFoundError") return new ApiError(404, "Resource not found");

  return error;
};
