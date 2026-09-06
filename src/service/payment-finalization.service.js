import { Payment } from "../models/payment.model.js";
import { Order } from "../models/order.model.js";
import { ApiError } from "../utils/ApiError.js";
import { claimCouponUsageAtomic, withCouponClaimTransaction } from "./coupon-usage.service.js";

export const claimCouponUsage = async (payment, session) => {
  if (!payment?.order) return;
  const order = await Order.findById(payment.order)
    .select("coupon couponCode customer")
    .session(session);
  if (!order?.coupon) return;
  return claimCouponUsageAtomic({ payment, order, session });
};

export const finalizeSuccessfulPayment = async (paymentId, extra = {}, transactionAmount = null) => {
  return withCouponClaimTransaction(async (session) => {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) throw new ApiError(404, "Payment not found");
    if (transactionAmount !== null && Number(transactionAmount) !== Math.round(payment.amount * 100)) {
      throw new ApiError(400, "Payment amount mismatch");
    }
    if (payment.status === "refunded") throw new ApiError(409, "Payment is already refunded");

    if (payment.status !== "completed") {
      payment.status = "completed";
      payment.paidAt = new Date();
      Object.assign(payment, extra);
      await payment.save({ session });
    } else if (Object.keys(extra).length) {
      Object.assign(payment, extra);
      await payment.save({ session });
    }

    if (!payment.couponUsageClaimed) await claimCouponUsage(payment, session);

    if (payment.order) {
      await Order.updateOne(
        { _id: payment.order, status: "pending", paymentStatus: "pending" },
        { $set: { payment: payment._id, paymentStatus: "paid", status: "completed", paidAt: new Date() } },
        { session }
      );
    }

    return payment;
  });
};
