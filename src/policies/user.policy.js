import { ApiError } from "../utils/ApiError.js";

export const assertNotSelf = (targetId, actorId, message = "You cannot modify your own account") => {
  if (String(targetId) === String(actorId)) throw new ApiError(400, message);
};

export const assertAdminPreserved = async ({ User, targetUser, nextRole = targetUser?.role, nextActivated = targetUser?.isActivated }) => {
  if (!targetUser) throw new ApiError(404, "User not found");

  const currentlyActiveAdmin = targetUser.role === "admin" && targetUser.isActivated;
  const willRemainActiveAdmin = nextRole === "admin" && nextActivated === true;

  if (!currentlyActiveAdmin || willRemainActiveAdmin) return;

  const activeAdminCount = await User.countDocuments({ role: "admin", isActivated: true });
  if (activeAdminCount <= 1) {
    throw new ApiError(409, "Cannot remove, demote, or deactivate the last active admin");
  }
};

export const assertRoleExists = async ({ Role, role }) => {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) throw new ApiError(400, "Role is required");
  const exists = await Role.exists({ slug: normalized, isActive: true });
  if (!exists) throw new ApiError(422, "Role does not exist or is inactive");
  return normalized;
};
