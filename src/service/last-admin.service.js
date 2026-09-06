import crypto from "crypto";
import { OperationLock } from "../models/operationLock.model.js";
import { ApiError } from "../utils/ApiError.js";

const KEY = "rbac:last-active-admin";
const LEASE_MS = 15_000;

export const withLastAdminLock = async (work) => {
  const owner = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + LEASE_MS);
  let lock;
  try {
    lock = await OperationLock.findOneAndUpdate(
    { key: KEY, $or: [{ expiresAt: { $lte: new Date() } }, { expiresAt: { $exists: false } }] },
    { $set: { key: KEY, owner, expiresAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "Another administrator security change is in progress");
    throw error;
  }

  if (!lock || lock.owner !== owner) throw new ApiError(409, "Another administrator security change is in progress");

  try {
    return await work();
  } finally {
    await OperationLock.deleteOne({ key: KEY, owner });
  }
};
