import { Router } from "express";
import { createStripePayment,createEasyPaisaPayment,handleEasyPaisaConfirmation,createJazzCashPayment,handleJazzCashReturn,getMyPayments,getAllPayments,getPaymentById,refundPayment } from "../controllers/payment.controller.js";
import { authUser,authorizePermission } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import rateLimit from "express-rate-limit";
import { validate } from "../middlewares/validate.middleware.js";
import { createPaymentRules, refundPaymentRules } from "../validators/payment.validator.js";
const router=Router();
// These two endpoints are unauthenticated by necessity (the gateway calls
// them directly) but each hit makes a server-to-server call to the
// gateway's status API, so an open door here can burn through gateway
// rate limits / quota. Cap it generously above normal callback volume.
const gatewayCallbackLimiter=rateLimit({windowMs:15*60*1000,max:Number(process.env.GATEWAY_CALLBACK_RATE_LIMIT||60),standardHeaders:true,legacyHeaders:false});
const refundLimiter=rateLimit({windowMs:15*60*1000,max:Number(process.env.PAYMENT_REFUND_RATE_LIMIT||30),standardHeaders:true,legacyHeaders:false});
router.post("/stripe/checkout",authUser,validate(createPaymentRules),createStripePayment);
router.post("/easypaisa/checkout",authUser,validate(createPaymentRules),createEasyPaisaPayment);
router.post("/easypaisa/webhook",gatewayCallbackLimiter,handleEasyPaisaConfirmation);
router.post("/jazzcash/checkout",authUser,validate(createPaymentRules),createJazzCashPayment);
router.all("/jazzcash/return",gatewayCallbackLimiter,handleJazzCashReturn);
router.get("/me",authUser,getMyPayments);
router.get("/",authUser,authorizePermission(PERMISSIONS.MANAGE_PAYMENTS),getAllPayments);
router.get("/:id",authUser,getPaymentById);
router.post("/:id/refund",authUser,authorizePermission(PERMISSIONS.MANAGE_PAYMENTS),refundLimiter,validate(refundPaymentRules),refundPayment);
export default router;
