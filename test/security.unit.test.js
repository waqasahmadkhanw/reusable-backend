import test from "node:test";
import assert from "node:assert/strict";

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "test-access-secret-minimum";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret-minimum";

const { hashToken, createOpaqueToken, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, getJwtExpirationDate } = await import("../src/utils/token.js");
const { safeEqual } = await import("../src/utils/csrf.js");
const { validate } = await import("../src/middlewares/validate.middleware.js");
const { assertPermissionsAllowed } = await import("../src/policies/permission.policy.js");
const { assertSystemRoleMutable, assertRoleDeletable, assertRoleDeactivatable } = await import("../src/policies/role.policy.js");

const runMiddleware = (middleware, req) => new Promise((resolve) => {
  middleware(req, {}, (error) => resolve(error || null));
});

test("opaque tokens are unpredictable and token hashes are deterministic", () => {
  const a = createOpaqueToken();
  const b = createOpaqueToken();
  assert.notEqual(a, b);
  assert.equal(hashToken(a), hashToken(a));
  assert.notEqual(hashToken(a), hashToken(b));
});

test("access and refresh tokens are typed and verifiable with separate secrets", () => {
  const access = signAccessToken({ userId: "507f1f77bcf86cd799439011", email: "user@example.com", role: "student", sessionId: "507f1f77bcf86cd799439012" });
  const refresh = signRefreshToken({ userId: "507f1f77bcf86cd799439011", sessionId: "507f1f77bcf86cd799439012" });

  const accessPayload = verifyAccessToken(access);
  const refreshPayload = verifyRefreshToken(refresh);

  assert.equal(accessPayload.tokenType, "access");
  assert.equal(refreshPayload.tokenType, "refresh");
  assert.equal(accessPayload.sessionId, "507f1f77bcf86cd799439012");
  assert.ok(getJwtExpirationDate(refresh) instanceof Date);
  assert.throws(() => verifyRefreshToken(access), /Invalid or expired refresh token/);
});

test("CSRF comparison uses timing-safe semantics and rejects missing values", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual(undefined, "abc"), false);
  assert.equal(safeEqual("abc", undefined), false);
});

test("strict validation rejects unknown fields and invalid values", async () => {
  const middleware = validate({
    email: { required: true, type: "email" },
    age: { type: "integer", min: 18, max: 120 },
  });

  let error = await runMiddleware(middleware, { body: { email: "bad", age: 17 } });
  assert.equal(error?.statusCode, 422);

  error = await runMiddleware(middleware, { body: { email: "user@example.com", age: 25, admin: true } });
  assert.equal(error?.statusCode, 422);

  error = await runMiddleware(middleware, { body: { email: "user@example.com", age: 25 } });
  assert.equal(error, null);
});

test("permission policy rejects unknown permissions and returns unique permissions", () => {
  assert.deepEqual(assertPermissionsAllowed(["READ", "READ", "WRITE"], ["READ", "WRITE"]), ["READ", "WRITE"]);
  assert.throws(() => assertPermissionsAllowed(["DELETE"], ["READ", "WRITE"]), /invalid/);
});

test("role policy protects system roles", () => {
  const systemRole = { isSystem: true };
  assert.throws(() => assertSystemRoleMutable(systemRole, { changingIdentity: true }), /System role/);
  assert.throws(() => assertRoleDeletable(systemRole), /System roles/);
  assert.throws(() => assertRoleDeactivatable(systemRole), /System roles/);
  assert.doesNotThrow(() => assertSystemRoleMutable(systemRole, { changingIdentity: false }));
});
