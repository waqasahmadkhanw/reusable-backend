const REQUIRED_IN_PRODUCTION = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "WEB_URL",
];

const PLACEHOLDER_PATTERNS = [
  /^replace_with_/i,
  /^change_me/i,
  /^your[_-]/i,
  /^example/i,
];

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

const parsePositiveInteger = (name, fallback) => {
  const raw = process.env[name];
  if (isBlank(raw)) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};

const parseNonNegativeInteger = (name, fallback) => {
  const raw = process.env[name];
  if (isBlank(raw)) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  return value;
};

const parseBoolean = (name, fallback) => {
  const raw = process.env[name];
  if (isBlank(raw)) return fallback;
  if (raw === "true" || raw === "false") return raw === "true";
  throw new Error(`${name} must be either true or false`);
};

const parseUrl = (name, { required = false, httpsInProduction = false } = {}) => {
  const raw = process.env[name];
  if (isBlank(raw)) {
    if (required) throw new Error(`${name} is required`);
    return;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  if (httpsInProduction && process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS in production`);
  }
};

const assertSecret = (name, minimumLength = 32) => {
  const value = process.env[name];
  if (isBlank(value)) return;
  if (value.length < minimumLength) throw new Error(`${name} must be at least ${minimumLength} characters`);
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error(`${name} contains a placeholder value`);
  }
};

export const validateEnvironment = () => {
  const production = process.env.NODE_ENV === "production";
  const errors = [];

  for (const key of REQUIRED_IN_PRODUCTION) {
    if (production && isBlank(process.env[key])) errors.push(`${key} is required in production`);
  }

  for (const name of ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"]) {
    try { assertSecret(name); } catch (error) { errors.push(error.message); }
  }

  try { parsePositiveInteger("PORT", 5000); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("MONGODB_MAX_POOL_SIZE", 20); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("MONGODB_MIN_POOL_SIZE", 2); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("MONGODB_SERVER_SELECTION_TIMEOUT_MS", 5000); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("MONGODB_SOCKET_TIMEOUT_MS", 45000); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("MONGODB_HEARTBEAT_MS", 10000); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("READINESS_DB_TIMEOUT_MS", 2000); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("SHUTDOWN_TIMEOUT_MS", 10000); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("PAYMENT_GATEWAY_TIMEOUT_MS", 10000); } catch (e) { errors.push(e.message); }
  try { parsePositiveInteger("SMTP_PORT", 587); } catch (e) { errors.push(e.message); }

  for (const name of [
    "GLOBAL_RATE_LIMIT", "AUTH_RATE_LIMIT", "REGISTER_RATE_LIMIT", "GATEWAY_CALLBACK_RATE_LIMIT",
    "MAX_UPLOAD_SIZE", "MAX_UPLOAD_FILES", "MAX_UPLOAD_FIELDS", "MAX_UPLOAD_PARTS",
    "TEMP_FILE_MAX_AGE_MS", "TEMP_CLEANUP_INTERVAL_MS",
    "GLOBAL_RATE_LIMIT_WINDOW_MS", "AUTH_RATE_LIMIT_WINDOW_MS", "REGISTER_RATE_LIMIT_WINDOW_MS",
  ]) {
    try { parsePositiveInteger(name, undefined); } catch (e) { errors.push(e.message); }
  }

  try { parseBoolean("TRUST_PROXY", false); } catch (e) { errors.push(e.message); }
  try { parseBoolean("COOKIE_SECURE", production); } catch (e) { errors.push(e.message); }
  try { parseBoolean("COOKIE_ALLOW_INSECURE_NONE", false); } catch (e) { errors.push(e.message); }
  try { parseBoolean("JAZZCASH_IS_LIVE", false); } catch (e) { errors.push(e.message); }
  try { parseBoolean("METRICS_ENABLED", false); } catch (e) { errors.push(e.message); }
  if (process.env.METRICS_ENABLED === "true" && isBlank(process.env.METRICS_TOKEN)) errors.push("METRICS_TOKEN is required when METRICS_ENABLED=true");
  if (!isBlank(process.env.METRICS_TOKEN) && String(process.env.METRICS_TOKEN).length < 32) errors.push("METRICS_TOKEN must be at least 32 characters when configured");

  const sameSite = String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  if (!["lax", "strict", "none"].includes(sameSite)) errors.push("COOKIE_SAME_SITE must be lax, strict, or none");
  if (sameSite === "none" && !production && process.env.COOKIE_SECURE !== "true" && process.env.COOKIE_ALLOW_INSECURE_NONE !== "true") {
    errors.push("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true or explicit COOKIE_ALLOW_INSECURE_NONE=true outside production");
  }
  if (production && process.env.COOKIE_SECURE !== "true") errors.push("COOKIE_SECURE must be true in production");
  if (production && sameSite === "none" && process.env.COOKIE_SECURE !== "true") errors.push("SameSite=None cookies must be secure");

  for (const name of ["WEB_URL", "ADMIN_PANEL", "LOCAL_WEB", "LOCAL_ADMIN_PANEL", "RESET_PASSWORD_URL", "STRIPE_SUCCESS_URL", "STRIPE_CANCEL_URL"]) {
    try { parseUrl(name, { required: production && name === "WEB_URL", httpsInProduction: production && name !== "LOCAL_WEB" && name !== "LOCAL_ADMIN_PANEL" }); } catch (e) { errors.push(e.message); }
  }

  const maxPool = parsePositiveInteger("MONGODB_MAX_POOL_SIZE", 20);
  const minPool = parsePositiveInteger("MONGODB_MIN_POOL_SIZE", 2);
  if (maxPool < minPool) errors.push("MONGODB_MAX_POOL_SIZE must be greater than or equal to MONGODB_MIN_POOL_SIZE");

  const accessExpiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";
  const refreshExpiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";
  if (!/^\d+(s|m|h|d|w|y)$/.test(accessExpiry)) errors.push("ACCESS_TOKEN_EXPIRY must use a supported duration such as 15m or 1h");
  if (!/^\d+(s|m|h|d|w|y)$/.test(refreshExpiry)) errors.push("REFRESH_TOKEN_EXPIRY must use a supported duration such as 7d");

  if (errors.length) throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  return true;
};
