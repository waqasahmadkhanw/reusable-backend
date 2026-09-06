/**
 * ==========================================
 * AUDIT LOG VALIDATION RULES
 * ==========================================
 * Consumed by the reusable `validate` middleware.
 * (Audit log creation is internal via service; no body validators needed
 * for read routes. This file documents any future create/clear payloads.)
 */

export const clearAuditLogsRules = {
  confirm: {
    required: true,
    type: "string",
    enum: ["DELETE_ALL"],
  },
};
