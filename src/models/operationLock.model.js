import mongoose from "mongoose";

const operationLockSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  owner: { type: String, required: true, maxlength: 100 },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

operationLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OperationLock = mongoose.model("OperationLock", operationLockSchema);
