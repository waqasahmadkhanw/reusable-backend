import { Session } from "../models/session.model.js";
import { hashToken } from "../utils/token.js";

export const createSession = async ({ _id, userId, refreshToken, expiresAt, userAgent, ipAddress }) =>
  Session.create({
    _id,
    user: userId,
    tokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: String(userAgent || "").slice(0, 1000),
    ipAddress: String(ipAddress || "").slice(0, 100),
    lastUsedAt: new Date(),
  });

export const findActiveSession = async (sessionId, userId) =>
  Session.findOne({
    _id: sessionId,
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("+tokenHash");

export const rotateSession = async ({ sessionId, userId, currentRefreshToken, nextRefreshToken, expiresAt }) => {
  const currentHash = hashToken(currentRefreshToken);
  const nextHash = hashToken(nextRefreshToken);

  const session = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      user: userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
      tokenHash: currentHash,
    },
    {
      $set: {
        tokenHash: nextHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    },
    { new: true }
  ).select("+tokenHash");

  return session;
};

export const revokeSession = async (sessionId, userId) =>
  Session.updateOne(
    { _id: sessionId, user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

export const revokeAllUserSessions = async (userId) =>
  Session.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

export const revokeAllExceptSession = async (userId, sessionId) =>
  Session.updateMany(
    { user: userId, revokedAt: null, _id: { $ne: sessionId } },
    { $set: { revokedAt: new Date() } }
  );

export const deleteUserSessions = async (userId) => Session.deleteMany({ user: userId });
