const SENSITIVE_KEYS = new Set([
  "password", "passwd", "token", "accesstoken", "refreshtoken", "csrftoken",
  "secret", "authorization", "cookie", "set-cookie", "apikey", "api_key",
  "clientsecret", "stripe-signature", "signature", "smtp_password",
]);

const isSensitiveKey = (key) => SENSITIVE_KEYS.has(String(key).replace(/[-_]/g, "").toLowerCase()) ||
  SENSITIVE_KEYS.has(String(key).toLowerCase());

const serialize = (value, key = "") => {
  if (isSensitiveKey(key)) return "[REDACTED]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack, code: value.code };
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => serialize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([k, v]) => [k, serialize(v, k)]));
  }
  return value;
};

const write = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: process.env.APP_NAME || "api",
    message,
    ...serialize(meta),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export const logger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== "production") write("debug", message, meta);
  },
};
