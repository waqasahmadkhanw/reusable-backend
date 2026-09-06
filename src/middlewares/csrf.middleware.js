import { ApiError } from "../utils/ApiError.js";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  safeEqual,
} from "../utils/csrf.js";
import { csrfCookieOptions } from "../utils/csrf.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = new Set([
  "/api/security/csrf",
  "/api/webhooks/stripe",
]);

const hasAuthenticationCookie = (req) => Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);

export const csrfToken = (req, res) => {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existing || generateCsrfToken();

  if (!existing) res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ success: true, data: { csrfToken: token } });
};

export const clearCsrfCookie = (res) => res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions);

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();

  // Authorization-header clients are not vulnerable to cookie-based CSRF.
  // Browser clients using HttpOnly auth cookies must prove possession of the
  // non-HttpOnly CSRF cookie through a custom header.
  if (!hasAuthenticationCookie(req)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!safeEqual(cookieToken, headerToken)) {
    return next(new ApiError(403, "Invalid CSRF token"));
  }

  return next();
};
