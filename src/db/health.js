import mongoose from "mongoose";

export const pingDatabase = async ({ timeoutMs = 2000 } = {}) => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;

  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(false), timeoutMs);
  });

  const ping = mongoose.connection.db
    .admin()
    .ping()
    .then(() => true)
    .catch(() => false);

  return Promise.race([ping, timeout]);
};
