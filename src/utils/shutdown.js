import mongoose from "mongoose";
import { logger } from "./logger.js";
import { setAcceptingTraffic, setShuttingDown } from "./lifecycle.js";

let shuttingDown = false;

export const createGracefulShutdown = ({ server, stopTempCleanup } = {}) => async (signal = "SIGTERM") => {
  if (shuttingDown) return;
  shuttingDown = true;
  setShuttingDown(true);
  setAcceptingTraffic(false);

  logger.info("graceful_shutdown_started", { signal });

  const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000;
  const forceTimer = setTimeout(() => {
    logger.error("graceful_shutdown_timeout", { timeoutMs });
    process.exit(1);
  }, timeoutMs);
  forceTimer.unref();

  try {
    if (stopTempCleanup) stopTempCleanup();

    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });

      // Node.js exposes these methods on supported runtimes. They prevent
      // keep-alive/idle sockets from delaying shutdown after the drain period.
      if (typeof server.closeIdleConnections === "function") {
        server.closeIdleConnections();
      }
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    logger.info("graceful_shutdown_completed", { signal });
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (error) {
    logger.error("graceful_shutdown_failed", { error });
    clearTimeout(forceTimer);
    process.exit(1);
  }
};
