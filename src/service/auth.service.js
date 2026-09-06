import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { createSession } from "./session.service.js";
import { getJwtExpirationDate, signAccessToken, signRefreshToken } from "../utils/token.js";

export const issueSessionTokens = async ({ userId, userAgent, ipAddress }) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  // Allocate the session id before signing the refresh token so the token
  // and persisted session are cryptographically bound to the same identifier.
  const sessionId = new mongoose.Types.ObjectId();
  const refreshToken = signRefreshToken({ userId: user._id, sessionId });

  const temporary = await createSession({
    _id: sessionId,
    userId: user._id,
    refreshToken,
    expiresAt: getJwtExpirationDate(refreshToken),
    userAgent,
    ipAddress,
  });
  const accessToken = signAccessToken({
    userId: user._id,
    email: user.email,
    role: user.role,
    sessionId: temporary._id,
  });


  return { user, accessToken, refreshToken, session: temporary };
};
