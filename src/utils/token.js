import crypto from "crypto";
import jwt from "jsonwebtoken";
import { ApiError } from "./ApiError.js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const createOpaqueToken = (bytes = 48) =>
  crypto.randomBytes(bytes).toString("base64url");

export const signAccessToken = ({ userId, email, role, sessionId }) =>
  jwt.sign(
    { _id: String(userId), email, role, sessionId: String(sessionId), tokenType: "access" },
    required("ACCESS_TOKEN_SECRET"),
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
  );

export const signRefreshToken = ({ userId, sessionId }) =>
  jwt.sign(
    { _id: String(userId), sessionId: String(sessionId), tokenType: "refresh" },
    required("REFRESH_TOKEN_SECRET"),
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, required("ACCESS_TOKEN_SECRET"));
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, required("REFRESH_TOKEN_SECRET"));
    if (decoded.tokenType !== "refresh" || !decoded.sessionId || !decoded._id) {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
};

export const getJwtExpirationDate = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) throw new ApiError(500, "Unable to determine token expiration");
  return new Date(decoded.exp * 1000);
};
