import test from "node:test";
import assert from "node:assert/strict";

test("logger redaction policy source contains sensitive field protection", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/utils/logger.js", import.meta.url), "utf8");
  assert.match(source, /password/);
  assert.match(source, /authorization/);
  assert.match(source, /\[REDACTED\]/);
});
