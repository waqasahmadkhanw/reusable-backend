import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import EmailService from "../service/email.service.js";
import { revokeAllUserSessions } from "../service/session.service.js";

export const getCurrentUser = asyncHandler(async (req, res) => {
  const currentUser = req.user?.toObject?.() ?? req.user;
  currentUser.permissions = req.userPermissions || [];
  res.status(200).json(new ApiResponse(200, currentUser, "Current user fetched successfully"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!name?.trim() || !normalizedEmail) throw new ApiError(400, "Name and email are required");

  const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });
  if (exists) throw new ApiError(409, "Email is already in use");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name: name.trim(), email: normalizedEmail } },
    { new: true, runValidators: true }
  ).select("-password -resetPasswordToken -resetPasswordExpire");

  await revokeAllUserSessions(req.user._id);
  res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  if (!normalizedEmail) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(200).json(new ApiResponse(200, {}, "If the account exists, a reset link has been sent"));

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

  res.status(200).json(new ApiResponse(200, {}, "If the account exists, a reset link has been sent"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!token || !password || password.length < 8) throw new ApiError(400, "Valid token and password are required");

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

  res.status(200).json(new ApiResponse(200, {}, "Password reset successful"));
});

export const deleteUserAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId).catch(() => {});
  user.avatar = "";
  user.avatarPublicId = "";
  await user.save();

  res.status(200).json(new ApiResponse(200, {}, "Avatar deleted successfully"));
});
