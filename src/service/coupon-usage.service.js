import mongoose from "mongoose";
import { Coupon } from "../models/coupon.model.js";
import { CouponUsage } from "../models/couponUsage.model.js";
import { CouponCustomerUsage } from "../models/couponCustomerUsage.model.js";
import { Payment } from "../models/payment.model.js";
import { ApiError } from "../utils/ApiError.js";

const isRetryableDuplicate = (error) => error?.code === 11000;

/**
 * Atomically claims one successful coupon use.
 *
 * Both the per-user counter and global coupon counter are guarded by
 * conditional updates. The usage ledger is created in the same transaction,
 * so a failed claim rolls back all counters.
 */
export const claimCouponUsageAtomic = async ({ payment, order, session }) => {
  if (!payment?.order || !order?.coupon) return false;

  const coupon = await Coupon.findById(order.coupon).session(session);
  if (!coupon) throw new ApiError(409, "Coupon no longer exists");

  const customerId = payment.customer;
  const perUserLimit = Number(coupon.maxUsesPerUser || 1);

  // A conditional atomic increment prevents two concurrent transactions from
  // both passing the same per-user limit.
  let userCounter;
  try {
    userCounter = await CouponCustomerUsage.findOneAndUpdate(
      {
        coupon: coupon._id,
        customer: customerId,
        $expr: { $lt: ["$usageCount", perUserLimit] },
      },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
      { new: true, upsert: true, session, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (isRetryableDuplicate(error)) {
      throw new ApiError(409, "Coupon usage limit for this user was reached");
    }
    throw error;
  }

  if (!userCounter) {
    throw new ApiError(409, "Coupon usage limit for this user was reached");
  }

  const totalFilter = coupon.maxUses > 0
    ? { _id: coupon._id, $expr: { $lt: ["$usedCount", "$maxUses"] } }
    : { _id: coupon._id };

  const updatedCoupon = await Coupon.findOneAndUpdate(
    totalFilter,
    { $inc: { usedCount: 1 } },
    { new: true, session }
  );

  if (!updatedCoupon) {
    throw new ApiError(409, "Coupon usage limit was reached");
  }

  await CouponUsage.create([{
    coupon: coupon._id,
    customer: customerId,
    payment: payment._id,
    order: order._id,
  }], { session });

  await Payment.updateOne(
    { _id: payment._id, couponUsageClaimed: false },
    {
      $set: {
        couponUsageClaimed: true,
        coupon: coupon._id,
        couponCode: order.couponCode || "",
      },
    },
    { session }
  );

  return true;
};

/**
 * Executes a transaction with a small retry budget for the unique-index race
 * that can occur when two first-time uses of the same coupon/customer arrive
 * simultaneously.
 */
export const withCouponClaimTransaction = async (work, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (error) {
      lastError = error;
      if (!isRetryableDuplicate(error) || attempt === maxRetries) throw error;
    } finally {
      await session.endSession();
    }
  }
  throw lastError;
};
