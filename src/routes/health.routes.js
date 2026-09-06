import express from "express";
import { pingDatabase } from "../db/health.js";
import { isAcceptingTraffic, isShuttingDown } from "../utils/lifecycle.js";

const router = express.Router();

// Liveness: process is running. Keep this cheap and independent of dependencies.
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    service: process.env.APP_NAME || "API",
    timestamp: new Date().toISOString(),
  });
});

// Readiness: traffic should only be routed here after startup completed and
// while the process is not draining during graceful shutdown.
router.get("/ready", async (_req, res) => {
  if (!isAcceptingTraffic() || isShuttingDown()) {
    return res.status(503).json({
      success: false,
      status: "not_ready",
      checks: { application: "draining" },
      timestamp: new Date().toISOString(),
    });
  }

  const dbReady = await pingDatabase({
    timeoutMs: Number(process.env.READINESS_DB_TIMEOUT_MS) || 2000,
  });

  const status = dbReady ? "ready" : "not_ready";

  return res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    status,
    checks: {
      application: "up",
      database: dbReady ? "up" : "down",
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
