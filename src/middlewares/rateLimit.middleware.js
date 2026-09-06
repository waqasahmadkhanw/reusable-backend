import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { MongoRateLimitStore } from "../utils/mongoRateLimitStore.js";

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// The shared MongoDB store keeps limits correct across horizontally scaled
// instances. RATE_LIMIT_STORE=memory (or NODE_ENV=test) falls back to
// express-rate-limit's built-in per-process memory store for local runs and
// test suites that boot the app without a database connection.
const useMemoryStore =
  process.env.RATE_LIMIT_STORE === "memory" ||
  (process.env.RATE_LIMIT_STORE !== "mongo" && process.env.NODE_ENV === "test");

const createLimiter = ({ windowMs, max, prefix, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: useMemoryStore ? undefined : new MongoRateLimitStore({ windowMs, prefix }),
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        requestId: req.requestId,
      });
    },
    // A database-backed limiter should fail closed rather than silently
    // falling back to an in-memory counter on individual API instances.
    passOnStoreError: false,
  });

const globalWindowMs = toPositiveInteger(
  process.env.GLOBAL_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);
const globalMax = toPositiveInteger(process.env.GLOBAL_RATE_LIMIT, 300);

const authWindowMs = toPositiveInteger(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);
const authMax = toPositiveInteger(process.env.AUTH_RATE_LIMIT, 10);

const registerWindowMs = toPositiveInteger(
  process.env.REGISTER_RATE_LIMIT_WINDOW_MS,
  60 * 60 * 1000
);
const registerMax = toPositiveInteger(process.env.REGISTER_RATE_LIMIT, 20);

export const globalRateLimiter = createLimiter({
  windowMs: globalWindowMs,
  max: globalMax,
  prefix: "global",
  message: "Too many requests. Please try again later.",
});

export const authRateLimiter = createLimiter({
  windowMs: authWindowMs,
  max: authMax,
  prefix: "auth",
  message: "Too many authentication attempts. Please try again later.",
});

export const registerRateLimiter = createLimiter({
  windowMs: registerWindowMs,
  max: registerMax,
  prefix: "register",
  message: "Too many registration attempts. Please try again later.",
});