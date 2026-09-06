import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/config/env.js";

const snapshot = { ...process.env };
const restore = () => {
  for (const key of Object.keys(process.env)) if (!(key in snapshot)) delete process.env[key];
  for (const [key, value] of Object.entries(snapshot)) process.env[key] = value;
};

const productionBase = () => {
  Object.assign(process.env, {
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://localhost:27017/test",
    ACCESS_TOKEN_SECRET: "a".repeat(48),
    REFRESH_TOKEN_SECRET: "b".repeat(48),
    WEB_URL: "https://app.example.com",
    COOKIE_SECURE: "true",
    COOKIE_SAME_SITE: "lax",
  });
};

test.afterEach(restore);

test("accepts a valid production configuration", () => {
  productionBase();
  assert.equal(validateEnvironment(), true);
});

test("rejects weak production JWT secrets", () => {
  productionBase();
  process.env.ACCESS_TOKEN_SECRET = "short";
  assert.throws(() => validateEnvironment(), /ACCESS_TOKEN_SECRET/);
});

test("rejects invalid numeric and boolean configuration", () => {
  productionBase();
  process.env.MONGODB_MAX_POOL_SIZE = "0";
  process.env.TRUST_PROXY = "maybe";
  assert.throws(() => validateEnvironment(), /MONGODB_MAX_POOL_SIZE|TRUST_PROXY/);
});

test("requires secure cookies in production", () => {
  productionBase();
  process.env.COOKIE_SECURE = "false";
  assert.throws(() => validateEnvironment(), /COOKIE_SECURE/);
});
