import { ApiError } from "../utils/ApiError.js";

export const assertPermissionsAllowed = (permissions, allPermissions) => {
  if (!Array.isArray(permissions)) throw new ApiError(422, "Permissions must be an array");
  const unique = [...new Set(permissions.map(String))];
  if (!unique.every((permission) => allPermissions.includes(permission))) {
    throw new ApiError(422, "One or more permissions are invalid");
  }
  return unique;
};
