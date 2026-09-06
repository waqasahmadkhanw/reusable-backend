import { Router } from "express";
import { getAllAuditLogs,getAuditLogById,getAuditLogStats,deleteAuditLog,clearAuditLogs } from "../controllers/auditLog.controller.js";
import { authUser,authorizePermission } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { clearAuditLogsRules } from "../validators/auditLog.validator.js";

const router=Router();

router.use(authUser);

// Read-only audit access is intentionally separate from destructive actions.
router.get("/",authorizePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS),getAllAuditLogs);
router.get("/stats",authorizePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS),getAuditLogStats);
router.get("/:id",authorizePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS),getAuditLogById);

// Destructive audit-log operations require the dedicated management permission.
router.delete("/clear",authorizePermission(PERMISSIONS.MANAGE_ACTIVITY_LOGS),validate(clearAuditLogsRules),clearAuditLogs);
router.delete("/:id",authorizePermission(PERMISSIONS.MANAGE_ACTIVITY_LOGS),deleteAuditLog);

export default router;
