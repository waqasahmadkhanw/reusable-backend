import { requireStripe } from "../config/stripe.js";
import { ApiError } from "../utils/ApiError.js";

const assertHttpsUrl = (value, name) => {
  if (!value) throw new ApiError(500, `${name} is not configured`);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error();
  } catch { throw new ApiError(500, `${name} must be a valid URL`); }
};

export const createCheckoutSession = async ({ items, customerEmail, currency = "usd", successUrl, cancelUrl, metadata = {}, idempotencyKey }) => {
  if (!Array.isArray(items) || !items.length) throw new ApiError(400, "At least one checkout item is required");
  assertHttpsUrl(successUrl, "STRIPE_SUCCESS_URL"); assertHttpsUrl(cancelUrl, "STRIPE_CANCEL_URL");
  const normalizedCurrency=String(currency).toLowerCase();
  const lineItems=items.map(item=>{const amount=Number(item.amount),quantity=Number(item.quantity||1);if(!Number.isFinite(amount)||amount<0||!Number.isInteger(quantity)||quantity<1)throw new ApiError(400,"Invalid checkout amount or quantity");return {price_data:{currency:normalizedCurrency,product_data:{name:String(item.itemName||item.name||"Item").slice(0,500)},unit_amount:Math.round(amount*100)},quantity};});
  return requireStripe().checkout.sessions.create({payment_method_types:["card"],mode:"payment",customer_email:customerEmail,line_items:lineItems,metadata,success_url:successUrl,cancel_url:cancelUrl},idempotencyKey?{idempotencyKey}:undefined);
};

export const createRefund = async ({ paymentIntentId, amount, reason, idempotencyKey }) => {
  if (!paymentIntentId) throw new ApiError(409,"Stripe payment intent ID is required");
  const cents=Math.round(Number(amount)*100); if(!Number.isInteger(cents)||cents<=0)throw new ApiError(400,"Invalid refund amount");
  return requireStripe().refunds.create({payment_intent:paymentIntentId,amount:cents,reason:reason||"requested_by_customer"},idempotencyKey?{idempotencyKey}:undefined);
};
