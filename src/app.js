import express from "express";
import cors from "cors";
import helmet from "helmet";
// import mongoose from "mongoose";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";
import { requestId } from "./middlewares/requestId.middleware.js";
import { csrfProtection } from "./middlewares/csrf.middleware.js";
import { errorHandler } from "./utils/errorHandler.js";
import { sanitizeInputs } from "./middlewares/sanitize.middleware.js";
// import { stripeWebhook } from "./webhooks/stripe.webhook.js";
import healthRoutes from "./routes/health.routes.js";
import { httpLogger } from "./middlewares/httpLogger.middleware.js";
import { globalRateLimiter } from "./middlewares/rateLimit.middleware.js";
import { metricsMiddleware } from "./middlewares/metrics.middleware.js";
import metricsRoutes from "./routes/metrics.routes.js";
import docsRoutes from "./routes/docs.routes.js";

import userRoutes from "./routes/user.route.js";
import profileRoutes from "./routes/profile.routes.js";
import userManagementRoutes from "./routes/userManagement.routes.js";
import roleRoutes from "./routes/role.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import eventRoutes from "./routes/event.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import orderRoutes from "./routes/order.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import securityRoutes from "./routes/security.routes.js";

const app=express();
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) app.set("trust proxy", trustProxy === "true" ? true : Number.isNaN(Number(trustProxy)) ? trustProxy : Number(trustProxy));

app.use(requestId);

const allowedOrigins=[process.env.WEB_URL,process.env.ADMIN_PANEL,process.env.LOCAL_WEB,process.env.LOCAL_ADMIN_PANEL]
  .flatMap(v=>String(v||"").split(","))
  .map(v=>v.trim())
  .filter(Boolean);

app.use(cors({
  origin:(origin,callback)=>{
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") return callback(null, true);
    callback(new ApiError(403,"Origin is not allowed by CORS"));
  },
  credentials:true,
}));
app.use(helmet());
app.use(httpLogger);
app.use(metricsMiddleware);
app.use(hpp());

// Stripe must receive the raw request body before express.json().
// app.post("/api/webhooks/stripe",express.raw({type:"application/json"}),stripeWebhook);

app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(cookieParser());
app.use(csrfProtection);
// Strip Mongo operator keys ($ne, $gt, $where, dot-paths, etc.) from
// user-controlled input before it ever reaches a query.
app.use(sanitizeInputs);

app.use(healthRoutes);
app.use(metricsRoutes);
app.use(docsRoutes);

// Apply the distributed limiter only to API traffic. Health probes remain
// available to load balancers/orchestrators during traffic spikes.
app.use(globalRateLimiter);

app.use("/api/user",userRoutes);
app.use("/api/profile",profileRoutes);
app.use("/api/users",userManagementRoutes);
app.use("/api/roles",roleRoutes);
app.use("/api/settings",settingsRoutes);
app.use("/api/media",mediaRoutes);
app.use("/api/notifications",notificationRoutes);
app.use("/api/announcements",announcementRoutes);
app.use("/api/events",eventRoutes);
app.use("/api/audit-logs",auditLogRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/coupons",couponRoutes);
app.use("/api/payments",paymentRoutes);
app.use("/api/security", securityRoutes);

app.use((req, _res, next) => next(new ApiError(404, "Route not found")));
app.use(errorHandler);

export default app;
