const bearerAuth = { type: "http", scheme: "bearer", bearerFormat: "JWT" };
const cookieAuth = { type: "apiKey", in: "cookie", name: "accessToken" };
const security = [{ bearerAuth: [] }, { cookieAuth: [] }];

const response = (description) => ({ description });
const pathItem = (summary, method = "get", secured = true) => ({
  [method]: {
    summary,
    security: secured ? security : [],
    responses: {
      "200": response("Successful response"),
      "400": response("Bad request"),
      "401": response("Authentication required"),
      "403": response("Forbidden"),
      "404": response("Resource not found"),
      "422": response("Validation failed"),
      "500": response("Internal server error"),
    },
  },
});

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "MERN Reusable Backend API",
    version: "1.0.0",
    description:
      "Production-oriented reusable MERN backend API. Authentication supports JWT access/refresh tokens with secure cookies and bearer clients. Business modules are intentionally domain-neutral.",
  },
  servers: [{ url: "/", description: "Current API server" }],
  tags: [
    { name: "Health", description: "Liveness and readiness probes" },
    { name: "Security", description: "CSRF and security helpers" },
    { name: "Authentication", description: "Registration, login and sessions" },
    { name: "Users", description: "User profile and administration" },
    { name: "Roles", description: "Roles and permissions" },
    { name: "Payments", description: "Payment and refund operations" },
    { name: "Orders", description: "Order operations" },
    { name: "Media", description: "Media upload and management" },
    { name: "Notifications", description: "User notifications" },
    { name: "Announcements", description: "Announcements" },
    { name: "Events", description: "Events" },
    { name: "Audit Logs", description: "Activity/audit logs" },
    { name: "Observability", description: "Metrics endpoint" },
  ],
  components: {
    securitySchemes: { bearerAuth, cookieAuth },
    parameters: {
      Id: { name: "id", in: "path", required: true, schema: { type: "string" } },
      Page: { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
      Limit: { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed" },
          requestId: { type: "string" },
          errors: { type: "array", items: { type: "object" } },
        },
      },
      Health: { type: "object", properties: { status: { type: "string" } } },
      CsrfToken: { type: "object", properties: { csrfToken: { type: "string" } } },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    },
    responses: {
      BadRequest: { description: "Bad request" },
      Unauthorized: { description: "Authentication required" },
      Forbidden: { description: "Insufficient permissions" },
      NotFound: { description: "Resource not found" },
      ValidationError: { description: "Validation failed" },
      ServerError: { description: "Internal server error" },
    },
  },
  paths: {
    "/health": { ...pathItem("Liveness probe", "get", false), get: { ...pathItem("Liveness probe", "get", false).get, tags: ["Health"] } },
    "/ready": { ...pathItem("Database readiness probe", "get", false), get: { ...pathItem("Database readiness probe", "get", false).get, tags: ["Health"] } },
    "/api/security/csrf": { ...pathItem("Get a CSRF token", "get", false), get: { ...pathItem("Get a CSRF token", "get", false).get, tags: ["Security"] } },

    "/api/user/register": { ...pathItem("Register a user", "post", false), post: { ...pathItem("Register a user", "post", false).post, tags: ["Authentication"], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } }, "multipart/form-data": { schema: { type: "object" } } } } } },
    "/api/user/login": { ...pathItem("Login", "post", false), post: { ...pathItem("Login", "post", false).post, tags: ["Authentication"] } },
    "/api/user/refresh-token": { ...pathItem("Refresh access token", "post", false), post: { ...pathItem("Refresh access token", "post", false).post, tags: ["Authentication"] } },
    "/api/user/me": { ...pathItem("Get current user"), get: { ...pathItem("Get current user").get, tags: ["Authentication"] } },
    "/api/user/password": { ...pathItem("Change current password", "patch"), patch: { ...pathItem("Change current password", "patch").patch, tags: ["Authentication"] } },
    "/api/user/account": { ...pathItem("Update current account", "patch"), patch: { ...pathItem("Update current account", "patch").patch, tags: ["Authentication"] } },
    "/api/user/logout": { ...pathItem("Logout", "post", false), post: { ...pathItem("Logout", "post", false).post, tags: ["Authentication"] } },
    "/api/user/forgot-password": { ...pathItem("Request password reset", "post", false), post: { ...pathItem("Request password reset", "post", false).post, tags: ["Authentication"] } },
    "/api/user/reset-password/{token}": { ...pathItem("Reset password", "post", false), post: { ...pathItem("Reset password", "post", false).post, tags: ["Authentication"], parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }] } },
    "/api/user/avatar": { ...pathItem("Delete user avatar", "delete"), delete: { ...pathItem("Delete user avatar", "delete").delete, tags: ["Authentication"] } },

    "/api/profile": { get: { ...pathItem("Get current profile").get, tags: ["Users"] }, patch: { ...pathItem("Update current profile", "patch").patch, tags: ["Users"] } },
    "/api/profile/avatar": { post: { ...pathItem("Upload profile avatar", "post").post, tags: ["Users"] }, delete: { ...pathItem("Remove profile avatar", "delete").delete, tags: ["Users"] } },
    "/api/profile/socials": { patch: { ...pathItem("Update social links", "patch").patch, tags: ["Users"] } },
    "/api/profile/account": { delete: { ...pathItem("Delete current account", "delete").delete, tags: ["Users"] } },

    "/api/users": { get: { ...pathItem("List users").get, tags: ["Users"] }, post: { ...pathItem("Create user", "post").post, tags: ["Users"] } },
    "/api/users/{id}": { get: { ...pathItem("Get user").get, tags: ["Users"] }, patch: { ...pathItem("Update user", "patch").patch, tags: ["Users"] }, delete: { ...pathItem("Delete user", "delete").delete, tags: ["Users"] } },
    "/api/users/{id}/role": { patch: { ...pathItem("Change user role", "patch").patch, tags: ["Users"] } },
    "/api/users/{id}/activation": { patch: { ...pathItem("Toggle user activation", "patch").patch, tags: ["Users"] } },

    "/api/roles": { get: { ...pathItem("List roles").get, tags: ["Roles"] }, post: { ...pathItem("Create role", "post").post, tags: ["Roles"] } },
    "/api/roles/permissions": { get: { ...pathItem("List permissions").get, tags: ["Roles"] } },
    "/api/roles/{id}": { get: { ...pathItem("Get role").get, tags: ["Roles"] }, put: { ...pathItem("Update role", "put").put, tags: ["Roles"] }, delete: { ...pathItem("Delete role", "delete").delete, tags: ["Roles"] } },
    "/api/roles/{id}/toggle-status": { patch: { ...pathItem("Toggle role status", "patch").patch, tags: ["Roles"] } },
    "/api/roles/users/{userId}/permissions": { get: { ...pathItem("Get user permissions").get, tags: ["Roles"] }, patch: { ...pathItem("Assign user permissions", "patch").patch, tags: ["Roles"] } },

    "/api/settings/public": { get: { ...pathItem("Get public settings", "get", false).get, tags: ["Users"] } },
    "/api/settings/bulk": { patch: { ...pathItem("Bulk update settings", "patch").patch, tags: ["Users"] } },
    "/api/settings/key/{key}": { get: { ...pathItem("Get setting by key").get, tags: ["Users"], parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }] } },
    "/api/settings": { get: { ...pathItem("Get settings").get, tags: ["Users"] }, post: { ...pathItem("Create setting", "post").post, tags: ["Users"] } },
    "/api/settings/{id}": { get: { ...pathItem("Get setting").get, tags: ["Users"] }, patch: { ...pathItem("Update setting", "patch").patch, tags: ["Users"] }, delete: { ...pathItem("Delete setting", "delete").delete, tags: ["Users"] } },
    "/api/media": { get: { ...pathItem("List media").get, tags: ["Media"] }, post: { ...pathItem("Upload media", "post").post, tags: ["Media"] } },
    "/api/media/{id}": { get: { ...pathItem("Get media").get, tags: ["Media"] }, patch: { ...pathItem("Update media", "patch").patch, tags: ["Media"] }, delete: { ...pathItem("Delete media", "delete").delete, tags: ["Media"] } },
    "/api/notifications": { get: { ...pathItem("List current notifications").get, tags: ["Notifications"] } },
    "/api/notifications/send": { post: { ...pathItem("Send notification", "post").post, tags: ["Notifications"] } },
    "/api/notifications/unread-count": { get: { ...pathItem("Get unread count").get, tags: ["Notifications"] } },
    "/api/notifications/mark-all-read": { patch: { ...pathItem("Mark all notifications read", "patch").patch, tags: ["Notifications"] } },
    "/api/notifications/{id}/read": { patch: { ...pathItem("Mark notification read", "patch").patch, tags: ["Notifications"] } },
    "/api/notifications/{id}": { delete: { ...pathItem("Delete notification", "delete").delete, tags: ["Notifications"] } },
    "/api/announcements": { get: { ...pathItem("List announcements").get, tags: ["Announcements"] }, post: { ...pathItem("Create announcement", "post").post, tags: ["Announcements"] } },
    "/api/announcements/{id}": { get: { ...pathItem("Get announcement").get, tags: ["Announcements"] }, put: { ...pathItem("Update announcement", "put").put, tags: ["Announcements"] }, delete: { ...pathItem("Delete announcement", "delete").delete, tags: ["Announcements"] } },
    "/api/announcements/{id}/pin": { patch: { ...pathItem("Toggle announcement pin", "patch").patch, tags: ["Announcements"] } },
    "/api/announcements/{id}/publish": { patch: { ...pathItem("Publish announcement", "patch").patch, tags: ["Announcements"] } },
    "/api/announcements/{id}/archive": { patch: { ...pathItem("Archive announcement", "patch").patch, tags: ["Announcements"] } },
    "/api/events": { get: { ...pathItem("List events").get, tags: ["Events"] }, post: { ...pathItem("Create event", "post").post, tags: ["Events"] } },
    "/api/events/{id}": { get: { ...pathItem("Get event").get, tags: ["Events"] }, put: { ...pathItem("Update event", "put").put, tags: ["Events"] }, delete: { ...pathItem("Delete event", "delete").delete, tags: ["Events"] } },
    "/api/events/{id}/status": { patch: { ...pathItem("Update event status", "patch").patch, tags: ["Events"] } },
    "/api/audit-logs": { get: { ...pathItem("List audit logs").get, tags: ["Audit Logs"] } },
    "/api/audit-logs/stats": { get: { ...pathItem("Get audit statistics").get, tags: ["Audit Logs"] } },
    "/api/audit-logs/{id}": { get: { ...pathItem("Get audit log").get, tags: ["Audit Logs"] }, delete: { ...pathItem("Delete audit log", "delete").delete, tags: ["Audit Logs"] } },
    "/api/audit-logs/clear": { delete: { ...pathItem("Clear audit logs", "delete").delete, tags: ["Audit Logs"] } },
    "/api/orders/me": { get: { ...pathItem("List current user's orders").get, tags: ["Orders"] } },
    "/api/orders": { get: { ...pathItem("List all orders").get, tags: ["Orders"] } },
    "/api/orders/{id}": { get: { ...pathItem("Get order").get, tags: ["Orders"] } },
    "/api/orders/{id}/cancel": { patch: { ...pathItem("Cancel order", "patch").patch, tags: ["Orders"] } },
    "/api/coupons": { get: { ...pathItem("List coupons").get, tags: ["Payments"] }, post: { ...pathItem("Create coupon", "post").post, tags: ["Payments"] } },
    "/api/coupons/{id}": { get: { ...pathItem("Get coupon").get, tags: ["Payments"] }, patch: { ...pathItem("Update coupon", "patch").patch, tags: ["Payments"] }, delete: { ...pathItem("Delete coupon", "delete").delete, tags: ["Payments"] } },
    "/api/payments": { get: { ...pathItem("List payments").get, tags: ["Payments"] } },
    "/api/payments/me": { get: { ...pathItem("List current user's payments").get, tags: ["Payments"] } },
    "/api/payments/{id}": { get: { ...pathItem("Get payment").get, tags: ["Payments"] } },
    "/api/payments/{id}/refund": { post: { ...pathItem("Refund payment", "post").post, tags: ["Payments"] } },
    "/api/payments/stripe/checkout": { post: { ...pathItem("Create Stripe checkout", "post").post, tags: ["Payments"] } },
    "/api/payments/easypaisa/checkout": { post: { ...pathItem("Create EasyPaisa checkout", "post").post, tags: ["Payments"] } },
    "/api/payments/easypaisa/webhook": { post: { ...pathItem("EasyPaisa callback", "post", false).post, tags: ["Payments"] } },
    "/api/payments/jazzcash/checkout": { post: { ...pathItem("Create JazzCash checkout", "post").post, tags: ["Payments"] } },
    "/api/payments/jazzcash/return": { post: { ...pathItem("JazzCash callback", "post", false).post, tags: ["Payments"] }, get: { ...pathItem("JazzCash callback", "get", false).get, tags: ["Payments"] } },
    "/api/webhooks/stripe": { post: { ...pathItem("Stripe webhook", "post", false).post, tags: ["Payments"] } },
    "/metrics": { get: { ...pathItem("Prometheus-compatible metrics", "get", false).get, tags: ["Observability"] } },
  },
};

// Keep path parameter declarations synchronized with OpenAPI path templates.
for (const [route, item] of Object.entries(openApiDocument.paths)) {
  const names = [...route.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!names.length) continue;
  const existing = new Set((item.parameters ?? []).filter((param) => param.in === "path").map((param) => param.name));
  item.parameters = [
    ...(item.parameters ?? []),
    ...names
      .filter((name) => !existing.has(name))
      .map((name) => ({
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      })),
  ];
}
