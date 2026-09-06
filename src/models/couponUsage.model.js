import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema({
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  usedAt: { type: Date, default: Date.now },
}, { timestamps: true });

couponUsageSchema.index({ coupon: 1, customer: 1, usedAt: -1 });
export const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);
