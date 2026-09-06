import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { openApiDocument } from "../src/docs/openapi.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("OpenAPI contract has required 3.1 metadata and responses", () => {
  assert.equal(openApiDocument.openapi, "3.1.0");
  assert.ok(openApiDocument.info?.title);
  assert.ok(openApiDocument.info?.version);
  assert.ok(Object.keys(openApiDocument.paths ?? {}).length > 0);
});

test("OpenAPI route contract has no registered-route drift", () => {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "check-api-contract.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
