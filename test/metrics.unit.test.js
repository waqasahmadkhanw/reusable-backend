import test from "node:test";
import assert from "node:assert/strict";
import { recordHttpRequest, renderPrometheusMetrics } from "../src/service/metrics.service.js";

test("metrics render Prometheus-compatible request counters and process gauges", () => {
  recordHttpRequest({ method: "GET", route: "/health", status: 200, durationMs: 12 });
  const output = renderPrometheusMetrics();
  assert.match(output, /api_http_requests_total/);
  assert.match(output, /api_http_request_duration_ms_bucket/);
  assert.match(output, /process_uptime_seconds/);
  assert.match(output, /process_resident_memory_bytes/);
});
