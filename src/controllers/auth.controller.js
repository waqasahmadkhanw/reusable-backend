import crypto from "crypto";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import EmailService from "../service/email.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolvePermissions } from "../middlewares/auth.middleware.js";
import { issueSessionTokens } from "../service/auth.service.js";
import { findActiveSession, revokeAllUserSessions, revokeSession, rotateSession } from "../service/session.service.js";
import { getJwtExpirationDate, hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token.js";
import { accessCookieOptions, refreshCookieOptions } from "../utils/Options.js";
import { logger } from "../utils/logger.js";

const publicUser = (query) => query.select("-password -resetPasswordToken -resetPasswordExpire");


export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!name?.trim() || !normalizedEmail || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }
  if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");
  if (await User.exists({ email: normalizedEmail })) {
    throw new ApiError(409, "Email is already registered");
  }

  let user;
  try {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "user",
      avatar: "",
    });
  } catch (error) {
    // A concurrent registration may pass the exists() check above and hit the
    // unique index here. Surface it as a conflict, not a 500.
    if (error?.code === 11000) throw new ApiError(409, "Email is already registered");
    throw error;
  }

  if (req.file?.path) {
    try {
      const uploaded = await uploadOnCloudinary(req.file.path);
      if (uploaded) {
        user.avatar = uploaded.secure_url || uploaded.url || "";
        user.avatarPublicId = uploaded.public_id || "";
        await user.save();
      }
    } catch (error) {
      logger.warn("Registration avatar upload failed", { error, requestId: req.id });
    }
  }

  const createdUser = await publicUser(User.findById(user._id));
  EmailService.sendWelcomeEmail(createdUser).catch((error) =>
    logger.warn("Welcome email failed", { error, requestId: req.id })
  );

  return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) throw new ApiError(400, "Old and new passwords are required");
  if (newPassword.length < 6) throw new ApiError(400, "New password must be at least 6 characters");

  const user = await User.findById(req.user._id).select("+password");
  if (!user || !(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();
  await revokeAllUserSessions(user._id);

  return res
    .status(200)
    .clearCookie("accessToken", accessCookieOptions)
    .clearCookie("refreshToken", refreshCookieOptions)
    .json(new ApiResponse(200, {}, "Password changed successfully. Please sign in again."));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  if (!normalizedEmail) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email: normalizedEmail });
  const generic = "If the account exists, a reset link has been sent";
  if (!user) return res.status(200).json(new ApiResponse(200, {}, generic));

  const token = user.generatePasswordResetToken();
  await user.save();

  const base = (process.env.RESET_PASSWORD_URL || `${process.env.WEB_URL || "http://localhost:3000"}/reset-password`).trim();
  const resetLink = base.includes("{token}")
    ? base.replace("{token}", encodeURIComponent(token))
    : `${base}${base.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;

  try {
    await EmailService.sendResetPasswordEmail(user, resetLink);
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    throw new ApiError(500, "Unable to send reset email");
  }

  return res.status(200).json(new ApiResponse(200, {}, generic));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!token || !password || password.length < 8) {
    throw new ApiError(400, "Valid token and password are required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+password +resetPasswordToken +resetPasswordExpire");

  if (!user) throw new ApiError(400, "Invalid or expired reset token");

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  await revokeAllUserSessions(user._id);

  return res
    .status(200)
    .clearCookie("accessToken", accessCookieOptions)
    .clearCookie("refreshToken", refreshCookieOptions)
    .json(new ApiResponse(200, {}, "Password reset successful"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  if (!normalizedEmail || !password) throw new ApiError(400, "Email and password are required");

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await issueSessionTokens({
    userId: user._id,
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });

  const loggedInUserDoc = await publicUser(User.findById(user._id));
  const loggedInUser = loggedInUserDoc?.toObject?.() ?? loggedInUserDoc;
  loggedInUser.permissions = await resolvePermissions(user);

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json(new ApiResponse(200, { user: loggedInUser }, "Login successful"));
});

export const logoutUser = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (incomingRefreshToken) {
    try {
      const decoded = verifyRefreshToken(incomingRefreshToken);
      const session = await findActiveSession(decoded.sessionId, decoded._id);
      if (session) {
        const matches = session.tokenHash === hashToken(incomingRefreshToken);
        if (matches) await revokeSession(decoded.sessionId, decoded._id);
      }
    } catch {
      // Logout is intentionally idempotent. Invalid/expired refresh tokens
      // should still result in both authentication cookies being cleared.
    }
  }

  return res
    .status(200)
    .clearCookie("refreshToken", refreshCookieOptions)
    .clearCookie("accessToken", accessCookieOptions)
    .json(new ApiResponse(200, {}, "Logout successful"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Refresh token is required");

  const decoded = verifyRefreshToken(incomingRefreshToken);
  const session = await findActiveSession(decoded.sessionId, decoded._id);
  if (!session) throw new ApiError(401, "Session is invalid or expired");

  const tokenHash = hashToken(incomingRefreshToken);
  if (session.tokenHash !== tokenHash) {
    await revokeSession(decoded.sessionId, decoded._id);
    throw new ApiError(401, "Refresh token reuse detected");
  }

  const user = await User.findById(decoded._id);
  if (!user || !user.isActivated) {
    await revokeSession(decoded.sessionId, decoded._id);
    throw new ApiError(401, "Session is invalid");
  }

  const refreshToken = signRefreshToken({ userId: user._id, sessionId: session._id });
  const accessToken = signAccessToken({
    userId: user._id,
    email: user.email,
    role: user.role,
    sessionId: session._id,
  });

  const rotated = await rotateSession({
    sessionId: session._id,
    userId: user._id,
    currentRefreshToken: incomingRefreshToken,
    nextRefreshToken: refreshToken,
    expiresAt: getJwtExpirationDate(refreshToken),
  });

  if (!rotated) {
    await revokeSession(session._id, user._id);
    throw new ApiError(401, "Refresh token reuse detected");
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json(new ApiResponse(200, {}, "Access token refreshed"));
});
