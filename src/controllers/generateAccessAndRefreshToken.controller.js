import { issueSessionTokens } from "../service/auth.service.js";

const generateAccessAndRefreshToken = async (userId, context = {}) => {
  const { accessToken, refreshToken } = await issueSessionTokens({
    userId,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  return { accessToken, refreshToken };
};

export default generateAccessAndRefreshToken;
