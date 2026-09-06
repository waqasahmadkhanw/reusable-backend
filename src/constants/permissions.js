export const PERMISSIONS = {
  READ_USERS: "read_users",
  CREATE_USERS: "create_users",
  UPDATE_USERS: "update_users",
  DELETE_USERS: "delete_users",
  MANAGE_ROLES: "manage_roles",
  MANAGE_PAYMENTS: "manage_payments",
  MANAGE_COUPONS: "manage_coupons",
  MANAGE_MEDIA: "manage_media",
  MANAGE_NOTIFICATIONS: "manage_notifications",
  MANAGE_ANNOUNCEMENTS: "manage_announcements",
  MANAGE_EVENTS: "manage_events",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_ACTIVITY_LOGS: "view_activity_logs",
  MANAGE_ACTIVITY_LOGS: "manage_activity_logs",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  user: [],
};
