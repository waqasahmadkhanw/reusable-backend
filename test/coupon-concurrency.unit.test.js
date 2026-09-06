import test from "node:test";
import assert from "node:assert/strict";

const source = await import("fs").then(({ readFileSync }) => readFileSync(new URL("../src/service/coupon-usage.service.js", import.meta.url), "utf8"));
const model = await import("fs").then(({ readFileSync }) => readFileSync(new URL("../src/models/couponCustomerUsage.model.js", import.meta.url), "utf8"));

test("coupon customer usage uses a unique coupon/customer counter", () => {
  assert.match(model, /index\(\{ coupon: 1, customer: 1 \}, \{ unique: true \}\)/);
  assert.match(source, /findOneAndUpdate\(/);
  assert.match(source, /usageCount/);
  assert.match(source, /\$expr: \{ \$lt: \["\$usageCount", perUserLimit\] \}/);
});

test("coupon total usage is guarded by an atomic conditional update", () => {
  assert.match(source, /\$expr: \{ \$lt: \["\$usedCount", "\$maxUses"\] \}/);
  assert.match(source, /\$inc: \{ usedCount: 1 \}/);
});

test("coupon ledger and counters are claimed in one transaction", () => {
  assert.match(source, /CouponUsage\.create\(\[/);
  assert.match(source, /withTransaction/);
  assert.match(source, /maxRetries = 3/);
});
