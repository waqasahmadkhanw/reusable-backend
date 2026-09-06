import test from "node:test";
import assert from "node:assert/strict";

test("template smoke test", () => {
  assert.equal(process.env.NODE_ENV === undefined || typeof process.env.NODE_ENV === "string", true);
});
