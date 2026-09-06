import { ALL_PERMISSIONS } from "../constants/permissions.js";

const objectId = /^[a-fA-F0-9]{24}$/;
const roleName = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,49}$/;

export const roleIdRules = {
  id: { required: true, type: "string", regex: objectId },
};

export const userIdRules = {
  userId: { required: true, type: "string", regex: objectId },
};

export const createRoleRules = {
  name: { required: true, type: "string", min: 2, max: 50, regex: roleName },
  description: { type: "string", max: 500 },
  permissions: { type: "array", max: ALL_PERMISSIONS.length, custom: (value) => {
    if (new Set(value).size !== value.length) return "permissions must not contain duplicates";
    if (value.some((permission) => typeof permission !== "string" || !ALL_PERMISSIONS.includes(permission))) {
      return "permissions contains an invalid permission";
    }
    return null;
  } },
};

export const updateRoleRules = {
  name: { type: "string", min: 2, max: 50, regex: roleName },
  description: { type: "string", max: 500 },
  permissions: { type: "array", max: ALL_PERMISSIONS.length, custom: (value) => {
    if (new Set(value).size !== value.length) return "permissions must not contain duplicates";
    if (value.some((permission) => typeof permission !== "string" || !ALL_PERMISSIONS.includes(permission))) {
      return "permissions contains an invalid permission";
    }
    return null;
  } },
};

export const assignUserPermissionsRules = {
  permissions: { required: true, type: "array", max: ALL_PERMISSIONS.length, custom: (value) => {
    if (new Set(value).size !== value.length) return "permissions must not contain duplicates";
    if (value.some((permission) => typeof permission !== "string" || !ALL_PERMISSIONS.includes(permission))) {
      return "permissions contains an invalid permission";
    }
    return null;
  } },
};
