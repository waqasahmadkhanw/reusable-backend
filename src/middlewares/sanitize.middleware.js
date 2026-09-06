/**
 * ==========================================
 * NOSQL INJECTION SANITIZATION
 * ==========================================
 * Strips any object key that starts with "$" (Mongo operators like
 * $ne, $gt, $where) or contains "." (dot-path injection) from
 * req.body / req.query / req.params, recursively.
 *
 * IMPORTANT: this mutates objects/arrays IN PLACE. It never does
 * `req.query = ...` because Express 5 exposes req.query as a
 * getter-only property — reassigning it throws. Popular packages
 * like express-mongo-sanitize assume Express 4 semantics and will
 * crash on Express 5 for this exact reason, so this is a small
 * hand-rolled replacement rather than a dependency.
 */
const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = sanitizeValue(value[i]);
    return value;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
        continue;
      }
      value[key] = sanitizeValue(value[key]);
    }
    return value;
  }
  return value;
};

export const sanitizeInputs = (req, _res, next) => {
  if (req.body && typeof req.body === "object") sanitizeValue(req.body);
  if (req.query && typeof req.query === "object") sanitizeValue(req.query);
  if (req.params && typeof req.params === "object") sanitizeValue(req.params);
  next();
};

export default sanitizeInputs;
