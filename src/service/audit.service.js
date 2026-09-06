import { AuditLog } from "../models/auditLog.model.js";
import { logger } from "../utils/logger.js";

const SENSITIVE_PATH_PATTERNS = [
  /\/user\/reset-password\/[^/?#]+/gi,
  /\/user\/verify-email\/[^/?#]+/gi,
  /\/auth\/verify\/[^/?#]+/gi,
  /\/invite\/[^/?#]+/gi,
  /\/magic-login\/[^/?#]+/gi,
];

const sanitizeAuditUrl = (value) => {
  if (typeof value !== "string" || !value) return "";
  let url = value;
  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    url = url.replace(pattern, (match) => match.split("/").slice(0, -1).join("/") + "/:token");
  }
  return url;
};

const sanitizeDetails = (value) => {
  if (!value || typeof value !== "object") return {};
  const blocked = new Set(["password", "token", "accesstoken", "refreshtoken", "csrftoken", "secret", "authorization", "cookie", "set-cookie", "apikey", "clientsecret", "passwordresettoken", "verificationtoken", "signature"]);
  const output = Array.isArray(value) ? [] : {};
  for (const [key, val] of Object.entries(value)) {
    if (blocked.has(key) || blocked.has(key.toLowerCase())) continue;
    const normalizedKey = key.replace(/[-_\s]/g, "").toLowerCase();
    if (blocked.has(normalizedKey) || /(?:token|secret|password|apikey|signature)$/i.test(normalizedKey)) continue;
    if (val && typeof val === "object" && !Array.isArray(val)) output[key] = sanitizeDetails(val);
    else if (Array.isArray(val)) output[key] = val.slice(0, 50);
    else output[key] = val;
  }
  return output;
};

export const recordAudit = async ({ req, action, resource = "", resourceId = null, statusCode = 200, details = {}, user = req?.user } = {}) => {
  try {
    return await AuditLog.create({
      user: user?._id || null,
      userRole: user?.role || "system",
      action,
      resource,
      resourceId,
      ip: req?.ip || req?.socket?.remoteAddress || "",
      method: req?.method || "",
      url: sanitizeAuditUrl(req?.path || req?.originalUrl || req?.url || ""),
      statusCode,
      details: sanitizeDetails(details),
      userAgent: req?.get?.("user-agent") || "",
    });
  } catch (error) {
    // Auditing must never turn a successful business operation into a failed request.
    logger.error("Audit log write failed", { error, requestId: req?.id });
    return null;
  }
};

export const audit = recordAudit;
