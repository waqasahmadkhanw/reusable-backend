import { Router } from "express";
import { createCoupon,getAllCoupons,getCouponById,updateCoupon,deleteCoupon } from "../controllers/coupon.controller.js";
import { authUser,authorizePermission } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
const router=Router();
router.use(authUser,authorizePermission(PERMISSIONS.MANAGE_COUPONS));
router.route("/").get(getAllCoupons).post(createCoupon);
router.route("/:id").get(getCouponById).patch(updateCoupon).delete(deleteCoupon);
export default router;
