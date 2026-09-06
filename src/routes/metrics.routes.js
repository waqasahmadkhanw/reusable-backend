import express from "express";
import crypto from "node:crypto";
import { renderPrometheusMetrics } from "../service/metrics.service.js";

const router = express.Router();

router.get("/metrics", (req, res) => {
  if (process.env.METRICS_ENABLED !== "true") return res.status(404).end();
  const expected = process.env.METRICS_TOKEN || "";
  const supplied = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return res.status(200).send(renderPrometheusMetrics());
});

export default router;
