import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js";
import { Session } from "../models/session.model.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.js";
const resolvePermissions = async (user) => {
  const role = await Role.findOne({ slug: user.role, isActive: true }).select("permissions").lean();
  if (!role) throw new ApiError(403, "Assigned role is invalid or inactive");
  return [...new Set([...(role.permissions || []), ...(user.permissions || [])])];
};

const authUser = async (req, _, next) => {
  try {
    const authorization = req.header("Authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = req.cookies?.accessToken || bearerToken;
    if (!token) throw new ApiError(401, "Authentication required");

    const decoded = verifyAccessToken(token);
    if (decoded.tokenType !== "access" || !decoded.sessionId) {
      throw new ApiError(401, "Invalid access token");
    }

    const session = await Session.findOne({
      _id: decoded.sessionId,
      user: decoded._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!session) throw new ApiError(401, "Session is invalid or expired");

    const user = await User.findById(decoded._id).select("-password -resetPasswordToken -resetPasswordExpire");
    if (!user) throw new ApiError(401, "User not found");
    if (!user.isActivated) throw new ApiError(403, "Account is not activated");

    req.user = user;
    req.userPermissions = await resolvePermissions(user);
    req.authSession = session;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired access token"));
  }
};

const authorizeRoles = (...allowedRoles) => (req, _, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  if (!allowedRoles.includes(req.user.role)) return next(new ApiError(403, "Access denied"));
  next();
};

const authorizePermission = (...requiredPermissions) => (req, _, next) => {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  if (!requiredPermissions.length) return next();
  const permissions = req.userPermissions || [];
  if (!requiredPermissions.every((permission) => permissions.includes(permission))) {
    return next(new ApiError(403, "Permission denied"));
  }
  next();
};

export { authUser, authorizeRoles, authorizePermission, resolvePermissions };
