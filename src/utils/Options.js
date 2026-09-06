const isProduction = process.env.NODE_ENV === "production";

const parseDurationMs = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  const match = String(value).trim().match(/^(\d+)\s*(ms|s|m|h|d|w)?$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = (match[2] || "ms").toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
};

const sameSite = (process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax")).toLowerCase();
if (!new Set(["strict", "lax", "none"]).has(sameSite)) {
  throw new Error("COOKIE_SAME_SITE must be strict, lax, or none");
}
if (sameSite === "none" && !isProduction && process.env.COOKIE_ALLOW_INSECURE_NONE !== "true") {
  // Browsers reject SameSite=None without Secure. Keep local development sane by default.
  // Set COOKIE_ALLOW_INSECURE_NONE=true only when your local HTTPS setup requires it.
}

const baseOptions = {
  httpOnly: true,
  secure: isProduction || process.env.COOKIE_SECURE === "true",
  sameSite,
  path: "/",
  ...(process.env.COOKIE_DOMAIN?.trim() ? { domain: process.env.COOKIE_DOMAIN.trim() } : {}),
};

export const accessCookieOptions = {
  ...baseOptions,
  maxAge: parseDurationMs(process.env.ACCESS_TOKEN_EXPIRY, 15 * 60 * 1000),
};

export const refreshCookieOptions = {
  ...baseOptions,
  maxAge: parseDurationMs(process.env.REFRESH_TOKEN_EXPIRY, 7 * 24 * 60 * 60 * 1000),
};

// Backward-compatible default for existing callers that use `options`.
const options = refreshCookieOptions;
export default options;
