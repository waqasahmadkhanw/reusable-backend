import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const middleware = fs.readFileSync("src/middlewares/rateLimit.middleware.js", "utf8");
const app = fs.readFileSync("src/app.js", "utf8");
const userRoutes = fs.readFileSync("src/routes/user.route.js", "utf8");

 test("rate limiting uses a shared MongoDB store", () => {
  assert.match(middleware, /MongoRateLimitStore/);
  assert.match(middleware, /passOnStoreError:\s*false/);
  assert.match(middleware, /ipKeyGenerator/);
  assert.doesNotMatch(app, /rateLimit\(/);
});

test("health endpoints are outside the global limiter", () => {
  assert.ok(app.indexOf("app.use(healthRoutes)") < app.indexOf("app.use(globalRateLimiter)"));
});

test("authentication and registration limits are distributed", () => {
  assert.match(userRoutes, /authRateLimiter/);
  assert.match(userRoutes, /registerRateLimiter/);
  assert.doesNotMatch(userRoutes, /from "express-rate-limit"/);
});
