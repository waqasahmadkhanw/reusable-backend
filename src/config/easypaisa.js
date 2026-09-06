/**
 * ==========================================
 * EASYPAISA CONFIGURATION
 * ==========================================
 * Centralized EasyPaisa (HBL) gateway settings.
 * Reference: https://developers.easypaisa.com.bd
 * Values come from environment variables.
 */

const easypaisaConfig = {
  // Merchant account
  merchantAccount: process.env.EASYPAISA_MERCHANT_ACCOUNT || "",
  merchantPassword: process.env.EASYPAISA_MERCHANT_PASSWORD || "",

  // Store identifier (for HBL / Ezuda)
  storeId: process.env.EASYPAISA_STORE_ID || "",
  storePassword: process.env.EASYPAISA_STORE_PASSWORD || "",

  // API endpoints (sandbox by default)
  baseUrl:
    process.env.EASYPAISA_BASE_URL ||
    "https://sandbox.easypaisa.com.pk",
  paymentApi:
    process.env.EASYPAISA_PAYMENT_API ||
    "/easypaisa/generate-hmac-token-gateway",
  mobileCheckoutApi:
    process.env.EASYPAISA_MOBILE_CHECKOUT_API ||
    "/easypaisa/validate-mobile-checkout-gateway",
  statusApi:
    process.env.EASYPAISA_STATUS_API ||
    "/easypaisa/get-payment-status-gateway",
  refundApi:
    process.env.EASYPAISA_REFUND_API ||
    "/easypaisa/refund-gateway",

  // Windows / initials
  initials: process.env.EASYPAISA_INITIALS || "VI",

  // Webhook / callback base
  websiteUrl: process.env.WEB_URL || "http://localhost:3000",

  // Currency this gateway charges (PKR)
  currency: "PKR",
};

export default easypaisaConfig;

