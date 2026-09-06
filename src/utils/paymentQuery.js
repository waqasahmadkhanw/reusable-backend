import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "./ApiError.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseDate = (value, label, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `Invalid ${label} date`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
};

export const buildPaymentListFilter = async (query = {}) => {
  const filter = {};
  const allowedStatuses = new Set(["pending", "completed", "failed", "refunded"]);
  const allowedMethods = new Set(["stripe", "easypaisa", "jazzcash", "free", "other"]);

  if (query.status) {
    if (!allowedStatuses.has(String(query.status))) throw new ApiError(400, "Invalid payment status");
    filter.status = String(query.status);
  }
  if (query.paymentMethod) {
    if (!allowedMethods.has(String(query.paymentMethod))) throw new ApiError(400, "Invalid payment method");
    filter.paymentMethod = String(query.paymentMethod);
  }

  if (query.customer) {
    if (!isObjectId(query.customer)) throw new ApiError(400, "Invalid customer ID");
    filter.customer = query.customer;
  }

  if (query.order) {
    if (!isObjectId(query.order)) throw new ApiError(400, "Invalid order ID");
    filter.order = query.order;
  }

  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to", true);
  if (from && to && from > to) throw new ApiError(400, "The from date must be before the to date");
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const search = String(query.search || "").trim();
  if (search) {
    const safe = escapeRegex(search);
    const [matchingUsers, objectIdMatch] = await Promise.all([
      User.find({ $or: [{ name: { $regex: safe, $options: "i" } }, { email: { $regex: safe, $options: "i" } }] })
        .select("_id")
        .limit(100)
        .lean(),
      isObjectId(search) ? mongoose.Types.ObjectId.createFromHexString(search) : null,
    ]);

    const searchConditions = [
      { "items.itemName": { $regex: safe, $options: "i" } },
      { easypaisaTransactionId: { $regex: safe, $options: "i" } },
      { jazzcashTxnRefNo: { $regex: safe, $options: "i" } },
    ];

    if (matchingUsers.length) searchConditions.push({ customer: { $in: matchingUsers.map((user) => user._id) } });
    if (objectIdMatch) searchConditions.push({ _id: objectIdMatch });
    filter.$or = searchConditions;
  }

  return filter;
};
