import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertNotSelf, assertAdminPreserved, assertRoleExists } from "../policies/user.policy.js";
import { withLastAdminLock } from "../service/last-admin.service.js";
import { revokeAllUserSessions } from "../service/session.service.js";
import { recordAudit } from "../service/audit.service.js";
import ApiFeatures from "../utils/apiFeatures.js";

const SELECT = "-password -resetPasswordToken -resetPasswordExpire";
const id = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new ApiError(400, "Invalid user ID");
};

export const getAllUsers = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(User.find(), req.query).search(["name", "email"]).filter(["role","isActivated"]).sort(["createdAt","updatedAt","name","email","role"]).selectFields(["name","email","phone","bio","profession","address","role","isActivated","createdAt","updatedAt"]).paginate();
  features.query = features.query.select(SELECT);
  const users = await features.query;
  const total = await User.countDocuments(features.query.getFilter());
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  res.status(200).json(new ApiResponse(200, {
    users, pagination: { total, page, pages: Math.ceil(total / limit) }
  }, "Users fetched successfully"));
});

export const getUserById = asyncHandler(async (req, res) => {
  id(req.params.id);
  const user = await User.findById(req.params.id).select(SELECT);
  if (!user) throw new ApiError(404, "User not found");
  res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = "user", phone = "" } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  if (!name?.trim() || !normalizedEmail || !password) throw new ApiError(400, "Name, email and password are required");
  if (await User.exists({ email: normalizedEmail })) throw new ApiError(409, "Email is already registered");
  const normalizedRole = await assertRoleExists({ Role, role });

  const user = await User.create({ name: name.trim(), email: normalizedEmail, password, role: normalizedRole, phone });
  await recordAudit({ req, action: "user.created", resource: "user", resourceId: user._id, statusCode: 201, details: { role: normalizedRole } });
  res.status(201).json(new ApiResponse(201, await User.findById(user._id).select(SELECT), "User created successfully"));
});

export const updateUser = asyncHandler(async (req, res) => {
  id(req.params.id);

  const result = await withLastAdminLock(async () => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");

    const { name, email, phone, bio, role, isActivated } = req.body;
    const previous = { name: user.name, email: user.email, phone: user.phone, bio: user.bio, role: user.role, isActivated: user.isActivated };

    if (name !== undefined) user.name = String(name).trim();
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } })) throw new ApiError(409, "Email is already in use");
      user.email = normalizedEmail;
    }
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;

    let nextRole = user.role;
    let nextActivated = user.isActivated;
    if (role !== undefined) nextRole = await assertRoleExists({ Role, role });
    if (isActivated !== undefined) {
      if (typeof isActivated !== "boolean" && isActivated !== "true" && isActivated !== "false") throw new ApiError(400, "isActivated must be boolean");
      nextActivated = typeof isActivated === "boolean" ? isActivated : isActivated === "true";
    }
    if (role !== undefined || isActivated !== undefined) {
      await assertAdminPreserved({ User, targetUser: user, nextRole, nextActivated });
      user.role = nextRole;
      user.isActivated = nextActivated;
    }

    await user.save();
    if (previous.role !== user.role || previous.isActivated !== user.isActivated) await revokeAllUserSessions(user._id);
    return { user, previous };
  });

  await recordAudit({ req, action: "user.updated", resource: "user", resourceId: result.user._id, details: { before: result.previous, after: { name: result.user.name, email: result.user.email, phone: result.user.phone, bio: result.user.bio, role: result.user.role, isActivated: result.user.isActivated } } });
  res.status(200).json(new ApiResponse(200, await User.findById(result.user._id).select(SELECT), "User updated successfully"));
});

export const deleteUser = asyncHandler(async (req, res) => {
  id(req.params.id);
  assertNotSelf(req.params.id, req.user._id, "You cannot delete your own account");

  const result = await withLastAdminLock(async () => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "admin" && user.isActivated) {
      const activeAdmins = await User.countDocuments({ role: "admin", isActivated: true });
      if (activeAdmins <= 1) throw new ApiError(409, "Cannot delete the last active admin");
    }
    await user.deleteOne();
    await revokeAllUserSessions(user._id);
    return user;
  });

  await recordAudit({ req, action: "user.deleted", resource: "user", resourceId: result._id, details: { role: result.role } });
  res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});

export const changeUserRole = asyncHandler(async (req, res) => {
  id(req.params.id);
  assertNotSelf(req.params.id, req.user._id, "You cannot change your own role");
  const normalizedRole = await assertRoleExists({ Role, role: req.body.role });

  const result = await withLastAdminLock(async () => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    await assertAdminPreserved({ User, targetUser: user, nextRole: normalizedRole, nextActivated: user.isActivated });
    const previousRole = user.role;
    user.role = normalizedRole;
    await user.save();
    if (previousRole !== normalizedRole) await revokeAllUserSessions(user._id);
    return { user, previousRole };
  });

  await recordAudit({ req, action: "user.role.changed", resource: "user", resourceId: result.user._id, details: { from: result.previousRole, to: normalizedRole } });
  res.status(200).json(new ApiResponse(200, { id: result.user._id, role: normalizedRole }, "User role updated successfully"));
});

export const toggleUserActivation = asyncHandler(async (req, res) => {
  id(req.params.id);
  assertNotSelf(req.params.id, req.user._id, "You cannot deactivate your own account");

  const result = await withLastAdminLock(async () => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    const nextActivated = !user.isActivated;
    await assertAdminPreserved({ User, targetUser: user, nextRole: user.role, nextActivated });
    user.isActivated = nextActivated;
    await user.save();
    if (!nextActivated) await revokeAllUserSessions(user._id);
    return user;
  });

  await recordAudit({ req, action: result.isActivated ? "user.activated" : "user.deactivated", resource: "user", resourceId: result._id });
  res.status(200).json(new ApiResponse(200, { id: result._id, isActivated: result.isActivated }, "User activation updated"));
});

