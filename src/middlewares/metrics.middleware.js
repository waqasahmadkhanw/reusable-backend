import { recordHttpRequest } from "../service/metrics.service.js";

export const metricsMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const route = req.route?.path || req.path || "unknown";
    recordHttpRequest({ method: req.method, route, status: res.statusCode, durationMs });
  });
  next();
};
