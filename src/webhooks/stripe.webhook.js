import stripe from "../config/stripe.js";
import { logger } from "../utils/logger.js";
import { Payment } from "../models/payment.model.js";
import { finalizeSuccessfulPayment } from "../service/payment-finalization.service.js";
import { claimWebhookEvent, markWebhookProcessed, markWebhookFailed } from "../service/webhook.service.js";

const safeError = () => "Webhook processing failed";

export const stripeWebhook = async (req, res) => {
  let event;
  try {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ received: false, message: "Stripe webhook is not configured" });
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).send("Missing Stripe signature");
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Webhook signature verification failed");
  }

  try {
    const claim = await claimWebhookEvent("stripe", event.id, event.type);
    if (claim.duplicate) {
      if (claim.event?.status === "processed") return res.status(200).json({ received: true, duplicate: true });
      return res.status(409).json({ received: false, retry: true, message: "Webhook is already being processed" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = String(session.metadata?.paymentId || "");
      const payment = paymentId ? await Payment.findById(paymentId) : await Payment.findOne({ stripeSessionId: session.id });
      if (!payment || payment.stripeSessionId !== session.id) throw Object.assign(new Error("Payment session mismatch"), { statusCode: 400 });
      if (session.payment_status !== "paid") throw Object.assign(new Error("Stripe session is not paid"), { statusCode: 400 });
      if (String(session.metadata?.orderId || "") !== String(payment.order || "")) throw Object.assign(new Error("Payment order mismatch"), { statusCode: 400 });
      const expectedAmount=Math.round(payment.amount*100);
      if (Number(session.amount_total)!==expectedAmount) throw Object.assign(new Error("Payment amount mismatch"), { statusCode: 400 });
      if (String(session.currency || "").toUpperCase() !== String(payment.currency || "").toUpperCase()) throw Object.assign(new Error("Payment currency mismatch"), { statusCode: 400 });
      await finalizeSuccessfulPayment(payment._id,{stripePaymentIntentId:session.payment_intent||payment.stripePaymentIntentId});
    } else if (event.type === "checkout.session.expired") {
      await Payment.updateOne({ stripeSessionId: event.data.object.id, status: "pending" }, { $set: { status: "failed" } });
    }

    await markWebhookProcessed(claim.event);
    return res.status(200).json({ received: true });
  } catch (error) {
    try { if (event?.id) { const claim = await claimWebhookEvent("stripe", event.id, event.type); if (claim.event) await markWebhookFailed(claim.event, error); } } catch { /* keep webhook response deterministic */ }
    logger.error("Stripe webhook processing failed", { eventId: event?.id, type: event?.type, error });
    return res.status(error.statusCode || 500).json({ received: false, retry: true, message: safeError() });
  }
};
export default stripeWebhook;
