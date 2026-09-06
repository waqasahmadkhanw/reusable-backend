import { ApiError } from "../utils/ApiError.js";

/**
 * Reusable boundary validator.
 *
 * Rules support:
 * required, type, min, max, enum, regex, email, url, and custom(value, req).
 * `strict: true` rejects fields not declared by the rule set.
 */
const validate = (rules, { source = "body", strict = true } = {}) => {
  return (req, _, next) => {
    const errors = [];
    const input = req[source] || {};

    if (typeof input !== "object" || Array.isArray(input)) {
      return next(new ApiError(422, "Validation failed", [`${source} must be an object`]));
    }

    if (strict) {
      for (const field of Object.keys(input)) {
        if (!Object.prototype.hasOwnProperty.call(rules, field)) {
          errors.push(`${field} is not allowed`);
        }
      }
    }

    for (const [field, rule] of Object.entries(rules)) {
      const value = input[field];
      const missing = value === undefined || value === null || (typeof value === "string" && value.trim() === "");

      if (rule.required && missing) {
        errors.push(`${field} is required`);
        continue;
      }
      if (missing) continue;

      if (rule.type === "email") {
        if (typeof value !== "string" || value.length > (rule.max ?? 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          errors.push(`${field} must be a valid email`);
          continue;
        }
      } else if (rule.type === "url") {
        if (typeof value !== "string" || (rule.max && value.length > rule.max)) {
          errors.push(`${field} must be a valid URL`);
          continue;
        }
        try {
          const url = new URL(value.trim());
          if (!rule.protocols?.includes(url.protocol)) {
            const protocols = rule.protocols || ["http:", "https:"];
            if (!protocols.includes(url.protocol)) throw new Error("Unsupported protocol");
          }
        } catch {
          errors.push(`${field} must be a valid URL`);
          continue;
        }
      } else if (rule.type === "number") {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          errors.push(`${field} must be a number`);
          continue;
        }
      } else if (rule.type === "integer") {
        if (!Number.isInteger(value)) {
          errors.push(`${field} must be an integer`);
          continue;
        }
      } else if (rule.type === "array") {
        if (!Array.isArray(value)) {
          errors.push(`${field} must be an array`);
          continue;
        }
      } else if (rule.type === "object") {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          errors.push(`${field} must be an object`);
          continue;
        }
      } else if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be a ${rule.type}`);
        continue;
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(", ")}`);
        continue;
      }

      const comparableLength = typeof value === "string" || Array.isArray(value) ? value.length : value;
      if (rule.min !== undefined && comparableLength < rule.min) {
        errors.push(`${field} must be at least ${rule.min}${typeof comparableLength === "number" ? "" : " characters"}`);
      }
      if (rule.max !== undefined && comparableLength > rule.max) {
        errors.push(`${field} must not exceed ${rule.max}${typeof comparableLength === "number" ? "" : " characters"}`);
      }

      if (rule.regex && (typeof value !== "string" || !rule.regex.test(value.trim()))) {
        errors.push(`${field} is invalid`);
      }

      if (typeof rule.custom === "function") {
        const customError = rule.custom(value, req);
        if (customError) errors.push(customError);
      }
    }

    if (errors.length) return next(new ApiError(422, "Validation failed", errors));
    next();
  };
};

export { validate };
