/**
 * Admin/user-management validation rules.
 * IDs are validated separately by controller/policy code because they are route params.
 */
const roleRule = {
  type: "string",
  min: 1,
  max: 50,
  regex: /^[a-z][a-z0-9_-]{0,49}$/i,
};

export const createUserRules = {
  name: { required: true, type: "string", min: 2, max: 100 },
  email: { required: true, type: "email", max: 254 },
  password: { required: true, type: "string", min: 8, max: 128 },
  role: roleRule,
  phone: { type: "string", max: 30, regex: /^[+()\-\s\d.]{7,30}$/ },
};

export const updateUserRules = {
  name: { type: "string", min: 2, max: 100 },
  email: { type: "email", max: 254 },
  phone: { type: "string", max: 30, regex: /^[+()\-\s\d.]{7,30}$/ },
  bio: { type: "string", max: 1000 },
  role: roleRule,
  isActivated: { type: "boolean" },
};

export const changeUserRoleRules = {
  role: { required: true, ...roleRule },
};
