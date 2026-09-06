import { Router } from "express";

import {
  createSetting,
  getPublicSettings,
  getAllSettings,
  getSettingByKey,
  getSettingById,
  updateSetting,
  deleteSetting,
  bulkUpdateSettings,
} from "../controllers/setting.controller.js";

import {
  authUser,
  authorizePermission,
} from "../middlewares/auth.middleware.js";

import { validate } from "../middlewares/validate.middleware.js";
import {
  createSettingRules,
  updateSettingRules,
  bulkUpdateSettingsRules,
} from "../validators/setting.validator.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

// PUBLIC — no auth required
router.route("/public").get(getPublicSettings);

// BULK UPDATE — admin only
router.route("/bulk").patch(
  authUser,
  authorizePermission(PERMISSIONS.MANAGE_SETTINGS),
  validate(bulkUpdateSettingsRules),
  bulkUpdateSettings
);

// GET BY KEY — admin only
router.route("/key/:key").get(
  authUser,
  authorizePermission(PERMISSIONS.MANAGE_SETTINGS),
  getSettingByKey
);

// CRUD — admin only
router.route("/")
  .get(
    authUser,
    authorizePermission(PERMISSIONS.MANAGE_SETTINGS),
    getAllSettings
  )
  .post(
    authUser,
    authorizePermission(PERMISSIONS.MANAGE_SETTINGS),
    validate(createSettingRules),
    createSetting
  );

router.route("/:id")
  .get(
    authUser,
    authorizePermission(PERMISSIONS.MANAGE_SETTINGS),
    getSettingById
  )
  .patch(
    authUser,
    authorizePermission(PERMISSIONS.MANAGE_SETTINGS),
    validate(updateSettingRules),
    updateSetting
  )
  .delete(
    authUser,
    authorizePermission(PERMISSIONS.MANAGE_SETTINGS),
    deleteSetting
  );

export default router;
