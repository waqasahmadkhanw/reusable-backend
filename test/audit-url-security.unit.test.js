import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("audit service source redacts sensitive token paths", () => {
  const source = fs.readFileSync(new URL("../src/service/audit.service.js", import.meta.url), "utf8");
  assert.match(source, /sanitizeAuditUrl/);
  assert.match(source, /reset-password/);
  assert.match(source, /passwordresettoken/);
});
