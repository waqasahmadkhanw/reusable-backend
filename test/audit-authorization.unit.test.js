import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../src/constants/permissions.js";
import { clearAuditLogsRules } from "../src/validators/auditLog.validator.js";

test("audit log permissions are separated", () => {
  assert.equal(PERMISSIONS.VIEW_ACTIVITY_LOGS, "view_activity_logs");
  assert.equal(PERMISSIONS.MANAGE_ACTIVITY_LOGS, "manage_activity_logs");
  assert.notEqual(PERMISSIONS.VIEW_ACTIVITY_LOGS, PERMISSIONS.MANAGE_ACTIVITY_LOGS);
  assert.ok(ALL_PERMISSIONS.includes(PERMISSIONS.MANAGE_ACTIVITY_LOGS));
  assert.ok(DEFAULT_ROLE_PERMISSIONS.admin.includes(PERMISSIONS.MANAGE_ACTIVITY_LOGS));
});

test("clear audit logs requires explicit confirmation", () => {
  assert.equal(clearAuditLogsRules.confirm.required, true);
  assert.deepEqual(clearAuditLogsRules.confirm.enum, ["DELETE_ALL"]);
});
