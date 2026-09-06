/**
 * ==========================================
 * JAZZCASH CONFIGURATION
 * ==========================================
 * Centralized JazzCash payment gateway settings.
 * Reference: https://developer.jazzcash.com.pk
 * Values come from environment variables.
 */

const jazzcashConfig = {
  // Endpoint
  baseUrl:
    process.env.JAZZCASH_BASE_URL ||
    "https://sandbox.jazzcash.com.pk",
  // Production: https://payments.jazzcash.com.pk

  // Merchant identifier
  merchantId: process.env.JAZZCASH_MERCHANT_ID || "",
  // e.g. "JU1842982797" (beware legacy all-caps pattern)

  // Integrity salt (secret used to sign requests)
  integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || "",

  // Live / sandbox flag derived from environment
  isLive: process.env.JAZZCASH_IS_LIVE === "true",

  // Currency charged by JazzCash
  currency: "PKR",

  // Default language
  language: "EN",

  // Version per JazzCash docs
  version: "1.1",

  // Web return / success url base
  websiteUrl: process.env.WEB_URL || "http://localhost:3000",
};

export default jazzcashConfig;

