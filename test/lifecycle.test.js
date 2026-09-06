import assert from "node:assert/strict";
import test from "node:test";
import {
  isAcceptingTraffic,
  isShuttingDown,
  setAcceptingTraffic,
  setShuttingDown,
} from "../src/utils/lifecycle.js";

test("readiness lifecycle defaults to not accepting traffic", () => {
  setAcceptingTraffic(false);
  setShuttingDown(false);
  assert.equal(isAcceptingTraffic(), false);
  assert.equal(isShuttingDown(), false);
});

test("lifecycle enters accepting state after startup", () => {
  setAcceptingTraffic(true);
  assert.equal(isAcceptingTraffic(), true);
  setAcceptingTraffic(false);
});

test("shutdown state can block readiness", () => {
  setAcceptingTraffic(true);
  setShuttingDown(true);
  assert.equal(isShuttingDown(), true);
  assert.equal(isAcceptingTraffic(), true);
  setShuttingDown(false);
  setAcceptingTraffic(false);
});
