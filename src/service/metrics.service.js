const counters = new Map();
const latency = { count: 0, sumMs: 0, buckets: new Map() };

const bucketBounds = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

const inc = (name, value = 1) => counters.set(name, (counters.get(name) || 0) + value);

export const recordHttpRequest = ({ method, route, status, durationMs }) => {
  inc("http_requests_total");
  inc(`http_requests_total|method=${method}|status=${status}`);
  if (route) inc(`http_requests_total|method=${method}|route=${route}|status=${status}`);
  latency.count += 1;
  latency.sumMs += durationMs;
  for (const bound of bucketBounds) {
    if (durationMs <= bound) latency.buckets.set(bound, (latency.buckets.get(bound) || 0) + 1);
  }
  latency.buckets.set("+Inf", (latency.buckets.get("+Inf") || 0) + 1);
};

export const recordMetric = (name, value = 1) => inc(name, value);

const labelEscape = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

export const renderPrometheusMetrics = () => {
  const lines = [
    "# HELP api_http_requests_total Total HTTP requests handled by the API.",
    "# TYPE api_http_requests_total counter",
  ];
  for (const [key, value] of counters) {
    const [, ...parts] = key.split("|");
    const labels = parts.map((part) => {
      const [k, v] = part.split("=");
      return `${k}=\"${labelEscape(v)}\"`;
    }).join(",");
    lines.push(`api_http_requests_total${labels ? `{${labels}}` : ""} ${value}`);
  }

  lines.push("# HELP api_http_request_duration_ms HTTP request duration in milliseconds.");
  lines.push("# TYPE api_http_request_duration_ms histogram");
  for (const bound of bucketBounds) lines.push(`api_http_request_duration_ms_bucket{le="${bound}"} ${latency.buckets.get(bound) || 0}`);
  lines.push(`api_http_request_duration_ms_bucket{le="+Inf"} ${latency.buckets.get("+Inf") || 0}`);
  lines.push(`api_http_request_duration_ms_sum ${latency.sumMs}`);
  lines.push(`api_http_request_duration_ms_count ${latency.count}`);

  lines.push("# HELP process_uptime_seconds Process uptime in seconds.");
  lines.push("# TYPE process_uptime_seconds gauge");
  lines.push(`process_uptime_seconds ${process.uptime()}`);
  lines.push("# HELP process_resident_memory_bytes Resident memory size in bytes.");
  lines.push("# TYPE process_resident_memory_bytes gauge");
  lines.push(`process_resident_memory_bytes ${process.memoryUsage().rss}`);
  return `${lines.join("\n")}\n`;
};
