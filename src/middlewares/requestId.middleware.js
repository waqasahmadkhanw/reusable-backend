import crypto from "crypto";

/**
 * Assigns a stable correlation ID to every request.
 * Clients may provide X-Request-Id, but only safe UUID-like values are accepted.
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export const requestId = (req, res, next) => {
  const incoming = String(req.get("x-request-id") || "").trim();
  const id = REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
