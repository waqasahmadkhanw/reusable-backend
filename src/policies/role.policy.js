import { ApiError } from "../utils/ApiError.js";

export const assertSystemRoleMutable = (role, { changingIdentity = false } = {}) => {
  if (!role) throw new ApiError(404, "Role not found");
  if (role.isSystem && changingIdentity) {
    throw new ApiError(403, "System role cannot change name or permissions");
  }
};

export const assertRoleDeletable = (role) => {
  if (!role) throw new ApiError(404, "Role not found");
  if (role.isSystem) throw new ApiError(403, "System roles cannot be deleted");
};

export const assertRoleDeactivatable = (role) => {
  if (!role) throw new ApiError(404, "Role not found");
  if (role.isSystem) throw new ApiError(403, "System roles cannot be deactivated");
};
