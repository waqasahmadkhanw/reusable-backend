import crypto from "crypto";

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_TOKEN_BYTES = 32;

export const generateCsrfToken = () => crypto.randomBytes(CSRF_TOKEN_BYTES).toString("hex");

export const csrfCookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
  sameSite: (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax")).toLowerCase(),
  path: "/",
  ...(process.env.COOKIE_DOMAIN?.trim() ? { domain: process.env.COOKIE_DOMAIN.trim() } : {}),
  maxAge: 24 * 60 * 60 * 1000,
};

export const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
