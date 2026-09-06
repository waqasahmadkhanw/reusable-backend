import test from "node:test";
import assert from "node:assert/strict";
import { createRoleRules, updateRoleRules, assignUserPermissionsRules, roleIdRules } from "../src/validators/role.validator.js";
import { ALL_PERMISSIONS } from "../src/constants/permissions.js";

test("role validators allow valid role payloads", () => {
  assert.equal(createRoleRules.name.regex.test("Content Manager"), true);
  assert.equal(createRoleRules.permissions.custom([ALL_PERMISSIONS[0]]) ?? null, null);
  assert.equal(updateRoleRules.description.max, 500);
  assert.equal(assignUserPermissionsRules.permissions.required, true);
});

test("role validators reject invalid permission values and duplicate permissions", () => {
  assert.match(assignUserPermissionsRules.permissions.custom([ALL_PERMISSIONS[0], ALL_PERMISSIONS[0]]), /duplicates/);
  assert.match(assignUserPermissionsRules.permissions.custom(["not_a_permission"]), /invalid permission/);
});

test("role ID rule requires a Mongo ObjectId", () => {
  assert.equal(roleIdRules.id.regex.test("507f1f77bcf86cd799439011"), true);
  assert.equal(roleIdRules.id.regex.test("invalid-id"), false);
});
