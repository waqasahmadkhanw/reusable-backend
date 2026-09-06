import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger.js";

const tempDir = path.resolve(process.env.UPLOAD_TEMP_DIR || "public/temp");
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;

export const cleanupTempFiles = async ({ maxAgeMs = Number(process.env.TEMP_FILE_MAX_AGE_MS || DEFAULT_MAX_AGE_MS) } = {}) => {
  await fs.mkdir(tempDir, { recursive: true });
  const now = Date.now();
  const entries = await fs.readdir(tempDir, { withFileTypes: true });
  let removed = 0;

  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile() || entry.name === ".gitkeep") return;
    const filePath = path.join(tempDir, entry.name);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) return;
    if (now - stat.mtimeMs < maxAgeMs) return;
    await fs.unlink(filePath).then(() => { removed += 1; }).catch(() => {});
  }));

  return removed;
};

export const startTempCleanup = () => {
  const intervalMs = Number(process.env.TEMP_CLEANUP_INTERVAL_MS || 15 * 60 * 1000);
  const run = () => cleanupTempFiles().then((count) => {
    if (count) logger.info("temp_cleanup_completed", { removed: count });
  }).catch((error) => logger.error("temp_cleanup_failed", { error }));

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
};
