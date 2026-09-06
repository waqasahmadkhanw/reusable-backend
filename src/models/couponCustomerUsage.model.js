import mongoose from "mongoose";

const couponCustomerUsageSchema = new mongoose.Schema({
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  usageCount: { type: Number, default: 0, min: 0 },
  lastUsedAt: { type: Date, default: null },
}, { timestamps: true });

// One counter per coupon/customer pair. The counter is updated atomically
// inside the same MongoDB transaction that creates the usage ledger row.
couponCustomerUsageSchema.index({ coupon: 1, customer: 1 }, { unique: true });

export const CouponCustomerUsage = mongoose.model("CouponCustomerUsage", couponCustomerUsageSchema);
