import { RateLimit } from "../models/rateLimit.model.js";

/**
 * MongoDB-backed express-rate-limit store.
 * All application instances share the same counters, so limits remain
 * effective when the API is horizontally scaled.
 */
export class MongoRateLimitStore {
  constructor({ windowMs }) {
    this.windowMs = windowMs;
    this.prefix = "rate-limit";
  }

  init(options) {
    if (options?.prefix) this.prefix = options.prefix;
  }

  async increment(key) {
    const namespacedKey = `${this.prefix}:${key}`;
    const now = new Date();
    const resetAt = new Date(now.getTime() + this.windowMs);

    const active = await RateLimit.findOneAndUpdate(
      { key: namespacedKey, resetAt: { $gt: now } },
      { $inc: { hits: 1 } },
      { new: true }
    ).lean();

    if (active) {
      return { totalHits: active.hits, resetTime: active.resetAt };
    }

    try {
      const created = await RateLimit.create({
        key: namespacedKey,
        hits: 1,
        resetAt,
      });
      return { totalHits: created.hits, resetTime: created.resetAt };
    } catch (error) {
      // Another API instance may have created the counter concurrently.
      if (error?.code !== 11000) throw error;

      const retried = await RateLimit.findOneAndUpdate(
        { key: namespacedKey, resetAt: { $gt: new Date() } },
        { $inc: { hits: 1 } },
        { new: true }
      ).lean();

      if (retried) {
        return { totalHits: retried.hits, resetTime: retried.resetAt };
      }

      // The unique document may still exist after its TTL window expired.
      // Replace that stale window atomically instead of recursively retrying.
      const replaced = await RateLimit.findOneAndUpdate(
        { key: namespacedKey, resetAt: { $lte: new Date() } },
        { $set: { hits: 1, resetAt } },
        { new: true }
      ).lean();

      if (!replaced) throw error;
      return { totalHits: replaced.hits, resetTime: replaced.resetAt };
    }
  }

  async decrement(key) {
    const namespacedKey = `${this.prefix}:${key}`;
    await RateLimit.updateOne(
      { key: namespacedKey, hits: { $gt: 0 } },
      { $inc: { hits: -1 } }
    );
  }

  async resetKey(key) {
    await RateLimit.deleteOne({ key: `${this.prefix}:${key}` });
  }

  async resetAll() {
    await RateLimit.deleteMany({ key: { $regex: `^${escapeRegex(this.prefix)}:` } });
  }
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
