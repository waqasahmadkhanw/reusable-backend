import { OAuth2Client } from "google-auth-library";

/**
 * ==========================================
 * GOOGLE OAUTH SERVICE
 * ==========================================
 * Wraps Google Identity Services ID-token
 * verification using the official
 * `google-auth-library` package.
 *
 * Flow:
 *   React SPA  ->  Google Sign-In button  ->  ID token
 *   React SPA  ->  POST /api/user/google-login { idToken }
 *   Backend    ->  verifyGoogleIdToken(idToken)  ->  { email, name, ... }
 *   Backend    ->  find-or-create User  ->  JWT access/refresh tokens
 */

// Lazily create the client so missing env vars don't crash the server
// during local development before Google is configured.
let googleClient = null;

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    const error = new Error(
      "GOOGLE_CLIENT_ID is not configured in environment variables"
    );
    error.statusCode = 500;
    throw error;
  }

  if (!googleClient) {
    googleClient = new OAuth2Client({
      clientId,
      clientSecret: clientSecret || undefined,
    });
  }

  return googleClient;
};

/**
 * Verifies a Google ID token and returns the
 * verified payload (email, name, picture, sub, ...).
 *
 * @param {string} idToken - The Google ID token from the frontend
 * @returns {Promise<object>} Verified token payload
 * @throws {Error} If token is invalid, expired, or audience mismatch
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) {
    const error = new Error("Google ID token is required");
    error.statusCode = 400;
    throw error;
  }

  const client = getGoogleClient();

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      const error = new Error("Invalid Google token payload");
      error.statusCode = 401;
      throw error;
    }

    // Email must be verified by Google to prevent account takeovers
    if (payload.email_verified !== true) {
      const error = new Error("Google email is not verified");
      error.statusCode = 401;
      throw error;
    }

    return payload;
  } catch (err) {
    const error = new Error(err?.message || "Google token verification failed");
    error.statusCode = err?.statusCode || 401;
    throw error;
  }
};

export default { verifyGoogleIdToken };

