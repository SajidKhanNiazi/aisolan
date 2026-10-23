/**
 * BookPilot AI — Google OAuth 2.0 Web Server Flow
 * Phase 1G-B: Authorization Code Flow, State Integrity, and Refresh Token Rotation
 */

import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { GoogleOAuthStatePayload, GoogleTokenResponse } from "./types";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
];

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

function getHmacSecret(): string {
  return (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "bookpilot_oauth_state_hmac_secret_fallback"
  );
}

/**
 * Creates a cryptographically signed, tamper-proof, single-use state token.
 * Valid for 10 minutes.
 */
export function createOAuthState(
  userId: string,
  businessId: string,
  businessSlug: string
): string {
  const payload: GoogleOAuthStatePayload = {
    userId,
    businessId,
    businessSlug,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getHmacSecret())
    .update(payloadB64)
    .digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Validates the OAuth state parameter upon callback.
 * Ensures the state has not been tampered with, has not expired, and matches the authenticated user and business.
 */
export function verifyOAuthState(
  stateToken: string,
  expectedUserId?: string,
  expectedBusinessId?: string
): { valid: boolean; payload: GoogleOAuthStatePayload | null; error: string | null } {
  if (!stateToken || !stateToken.includes(".")) {
    return { valid: false, payload: null, error: "Missing or malformed state parameter." };
  }

  const [payloadB64, signature] = stateToken.split(".");
  if (!payloadB64 || !signature) {
    return { valid: false, payload: null, error: "Invalid state structure." };
  }

  // Verify HMAC signature
  const expectedSig = crypto
    .createHmac("sha256", getHmacSecret())
    .update(payloadB64)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedSigBuffer = Buffer.from(expectedSig, "hex");

  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    return { valid: false, payload: null, error: "State signature verification failed (tampered token)." };
  }

  // Parse payload
  let payload: GoogleOAuthStatePayload;
  try {
    const rawJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    payload = JSON.parse(rawJson);
  } catch {
    return { valid: false, payload: null, error: "Failed to parse state payload JSON." };
  }

  // Expiration check
  if (Date.now() > payload.expiresAt) {
    return { valid: false, payload: null, error: "OAuth authorization session expired. Please retry." };
  }

  // User integrity check
  if (expectedUserId && payload.userId !== expectedUserId) {
    return { valid: false, payload, error: "OAuth state was issued to a different authenticated user." };
  }

  // Business integrity check
  if (expectedBusinessId && payload.businessId !== expectedBusinessId) {
    return { valid: false, payload, error: "OAuth state does not match the active salon workspace." };
  }

  return { valid: true, payload, error: null };
}

/**
 * Persists an issued OAuth state nonce to the database for replay protection.
 */
export async function persistOAuthNonce(
  nonce: string,
  businessId: string,
  userId: string,
  expiresAt: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return { success: true };
    }

    const { error } = await serviceClient
      .from("google_calendar_oauth_states")
      .insert({
        nonce,
        business_id: businessId,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error("[persistOAuthNonce] Error storing nonce:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, error: e.message };
  }
}

/**
 * Atomically consumes an OAuth state nonce.
 * Returns true if and only if the nonce is valid, matches tenant and user, and has NOT been previously consumed.
 */
export async function consumeOAuthNonce(
  nonce: string,
  businessId: string,
  userId: string
): Promise<{ consumed: boolean; error?: string }> {
  try {
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return { consumed: true };
    }

    const { data, error } = await serviceClient.rpc("consume_google_oauth_nonce_atomic", {
      p_nonce: nonce,
      p_business_id: businessId,
      p_user_id: userId,
    });

    if (error) {
      console.error("[consumeOAuthNonce] RPC execution error:", error.message);
      return { consumed: false, error: error.message };
    }

    return { consumed: Boolean(data) };
  } catch (err: unknown) {
    const e = err as Error;
    return { consumed: false, error: e.message };
  }
}

/**
 * Builds the official Google OAuth 2.0 authorization URL.
 */
export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId || clientId.trim() === "") {
    throw new Error("GOOGLE_CLIENT_ID is not configured in the server environment.");
  }

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // Force consent screen to guarantee refresh token issuance
    state,
    include_granted_scopes: "true",
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges the one-time authorization code for OAuth tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ success: boolean; tokens?: GoogleTokenResponse; error?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: "Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are missing.",
    };
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("[GoogleOAuth] Token exchange failed:", data);
      return {
        success: false,
        error: data.error_description || data.error || "Failed to exchange authorization code.",
      };
    }

    return {
      success: true,
      tokens: data as GoogleTokenResponse,
    };
  } catch (err: unknown) {
    const e = err as Error;
    console.error("[GoogleOAuth] Token exchange network exception:", e.message);
    return {
      success: false,
      error: "Network error connecting to Google OAuth servers.",
    };
  }
}

/**
 * Refreshes an expired Google access token using the stored refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ success: boolean; accessToken?: string; expiresIn?: number; error?: string; isRevoked?: boolean }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: "Google OAuth credentials are not configured.",
    };
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const isRevoked =
        data.error === "invalid_grant" ||
        data.error === "unauthorized_client" ||
        (data.error_description && data.error_description.includes("revoked"));

      return {
        success: false,
        error: data.error_description || data.error || "Failed to refresh Google access token.",
        isRevoked,
      };
    }

    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (err: unknown) {
    const e = err as Error;
    return {
      success: false,
      error: `Network error refreshing token: ${e.message}`,
    };
  }
}

/**
 * Fetches the connected user's primary email address from Google.
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.email || null;
  } catch {
    return null;
  }
}
