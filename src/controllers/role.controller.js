import mongoose from "mongoose";
import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { ALL_PERMISSIONS } from "../constants/permissions.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertSystemRoleMutable, assertRoleDeletable, assertRoleDeactivatable } from "../policies/role.policy.js";
import { assertPermissionsAllowed } from "../policies/permission.policy.js";
import { recordAudit } from "../service/audit.service.js";
import { revokeAllUserSessions } from "../service/session.service.js";

const id = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new ApiError(400, "Invalid ID");
};
const slug = (value) => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const getAllPermissions = asyncHandler(async (_, res) =>
  res.status(200).json(new ApiResponse(200, ALL_PERMISSIONS, "Permissions fetched successfully"))
);

export const getAllRoles = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
  if (req.query.search) filter.name = { $regex: String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const [roles, total] = await Promise.all([
    Role.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Role.countDocuments(filter),
  ]);
  res.status(200).json(new ApiResponse(200, { roles, pagination: { total, page, pages: Math.ceil(total / limit) } }, "Roles fetched successfully"));
});

export const getRoleById = asyncHandler(async (req, res) => {
  id(req.params.id);
  const role = await Role.findById(req.params.id);
  if (!role) throw new ApiError(404, "Role not found");
  res.status(200).json(new ApiResponse(200, role, "Role fetched successfully"));
});

export const createRole = asyncHandler(async (req, res) => {
  const { name, description = "", permissions = [] } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Role name is required");
  const normalizedPermissions = assertPermissionsAllowed(permissions, ALL_PERMISSIONS);
  const role = await Role.create({ name: name.trim(), slug: slug(name), description, permissions: normalizedPermissions, createdBy: req.user._id });
  await recordAudit({ req, action: "role.created", resource: "role", resourceId: role._id, statusCode: 201, details: { slug: role.slug, permissions: normalizedPermissions } });
  res.status(201).json(new ApiResponse(201, role, "Role created successfully"));
});

export const updateRole = asyncHandler(async (req, res) => {
  id(req.params.id);
  const role = await Role.findById(req.params.id);
  assertSystemRoleMutable(role, { changingIdentity: req.body.name !== undefined || req.body.permissions !== undefined });

  const before = { name: role.name, slug: role.slug, permissions: role.permissions, isActive: role.isActive };
  if (req.body.name !== undefined) {
    const nextName = String(req.body.name).trim();
    if (!nextName) throw new ApiError(422, "Role name cannot be empty");
    const nextSlug = slug(nextName);
    if (nextSlug !== role.slug) {
      const assigned = await User.exists({ role: role.slug });
      if (assigned) throw new ApiError(409, "Cannot rename a role while users are assigned to it");
      role.name = nextName;
      role.slug = nextSlug;
    } else role.name = nextName;
  }
  if (req.body.description !== undefined) role.description = req.body.description;
  if (req.body.permissions !== undefined) role.permissions = assertPermissionsAllowed(req.body.permissions, ALL_PERMISSIONS);
  role.updatedBy = req.user._id;
  await role.save();
  await recordAudit({ req, action: "role.updated", resource: "role", resourceId: role._id, details: { before, after: { name: role.name, slug: role.slug, permissions: role.permissions, isActive: role.isActive } } });
  res.status(200).json(new ApiResponse(200, role, "Role updated successfully"));
});

export const deleteRole = asyncHandler(async (req, res) => {
  id(req.params.id);
  const role = await Role.findById(req.params.id);
  assertRoleDeletable(role);
  if (await User.exists({ role: role.slug })) throw new ApiError(409, "Cannot delete a role assigned to users");
  await role.deleteOne();
  await recordAudit({ req, action: "role.deleted", resource: "role", resourceId: role._id, details: { slug: role.slug } });
  res.status(200).json(new ApiResponse(200, null, "Role deleted successfully"));
});

export const toggleRoleStatus = asyncHandler(async (req, res) => {
  id(req.params.id);
  const role = await Role.findById(req.params.id);
  assertRoleDeactivatable(role);
  const nextActive = !role.isActive;
  if (!nextActive && await User.exists({ role: role.slug, isActivated: true })) {
    throw new ApiError(409, "Cannot deactivate a role assigned to active users");
  }
  role.isActive = nextActive;
  role.updatedBy = req.user._id;
  await role.save();
  await recordAudit({ req, action: nextActive ? "role.activated" : "role.deactivated", resource: "role", resourceId: role._id, details: { slug: role.slug } });
  res.status(200).json(new ApiResponse(200, role, "Role status updated successfully"));
});

export const assignUserPermissions = asyncHandler(async (req, res) => {
  id(req.params.userId);
  const permissions = assertPermissionsAllowed(req.body.permissions, ALL_PERMISSIONS);
  const user = await User.findById(req.params.userId);
  if (!user) throw new ApiError(404, "User not found");
  user.permissions = permissions;
  await user.save();
  await revokeAllUserSessions(user._id);
  await recordAudit({ req, action: "user.permissions.updated", resource: "user", resourceId: user._id, details: { permissions } });
  res.status(200).json(new ApiResponse(200, { userId: user._id, permissions: user.permissions }, "User permissions updated"));
});

export const getUserPermissions = asyncHandler(async (req, res) => {
  id(req.params.userId);
  const user = await User.findById(req.params.userId).select("name email role permissions");
  if (!user) throw new ApiError(404, "User not found");
  res.status(200).json(new ApiResponse(200, user, "User permissions fetched"));
});
