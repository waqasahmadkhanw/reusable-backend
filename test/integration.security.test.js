import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.GLOBAL_RATE_LIMIT = "1000";

const { default: app } = await import("../src/app.js");
const { setAcceptingTraffic } = await import("../src/utils/lifecycle.js");

let server;
let baseUrl;

test.before(async () => {
  // index.js sets this after startup completes; the test boots app.js directly.
  setAcceptingTraffic(true);
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("health endpoint is public and returns a timestamp", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(typeof body.timestamp, "string");
});

test("readiness exposes dependency state without leaking database details", async () => {
  const response = await fetch(`${baseUrl}/ready`);
  const body = await response.json();
  assert.ok([200, 503].includes(response.status));
  assert.ok(["ready", "not_ready"].includes(body.status));
  assert.ok(["up", "down"].includes(body.checks?.database));
  assert.equal(typeof body.timestamp, "string");
});

test("CSRF endpoint issues a token without requiring authentication", async () => {
  const response = await fetch(`${baseUrl}/api/security/csrf`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(typeof body.data?.csrfToken, "string");
  assert.ok(response.headers.get("set-cookie"));
});

test("cookie-authenticated mutation without CSRF token is rejected", async () => {
  const response = await fetch(`${baseUrl}/api/user/logout-user`, {
    method: "POST",
    headers: { Cookie: "accessToken=fake-access-token; refreshToken=fake-refresh-token", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 403);
});

test("Bearer authentication reaches the authentication layer without CSRF rejection", async () => {
  const response = await fetch(`${baseUrl}/api/payments`, {
    headers: { Authorization: "Bearer deliberately-invalid-token" },
  });
  assert.equal(response.status, 401);
});

test("unknown routes use the centralized error response", async () => {
  const response = await fetch(`${baseUrl}/does-not-exist`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.ok(response.headers.get("x-request-id"));
});

test("security headers are enabled", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.ok(response.headers.get("x-content-type-options"));
  assert.ok(response.headers.get("content-security-policy"));
});
