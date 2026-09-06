import test from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "../src/utils/errorHandler.js";
import { ApiError } from "../src/utils/ApiError.js";

const createResponse = () => {
  const response = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    end() { this.ended = true; return this; },
  };
  return response;
};

test("error handler returns the standard failure envelope", () => {
  const req = { id: "req-123", method: "POST", originalUrl: "/api/example", get: () => undefined };
  const res = createResponse();

  errorHandler(new ApiError(422, "Validation failed", ["email is required"]), req, res, () => {});

  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.body, {
    statusCode: 422,
    success: false,
    data: null,
    message: "Validation failed",
    requestId: "req-123",
    errors: ["email is required"],
  });
});

test("unexpected production failures do not leak internal details", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const req = { id: "req-500", method: "GET", originalUrl: "/api/private", get: () => undefined };
    const res = createResponse();
    errorHandler(new Error("database password leaked"), req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      statusCode: 500,
      success: false,
      data: null,
      message: "Internal Server Error",
      requestId: "req-500",
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("invalid status codes are normalized to 500", () => {
  const req = { id: "req-invalid", method: "GET", originalUrl: "/api/example", get: () => undefined };
  const res = createResponse();
  errorHandler(new ApiError(200, "not an error"), req, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.statusCode, 500);
  assert.equal(res.body.success, false);
});
