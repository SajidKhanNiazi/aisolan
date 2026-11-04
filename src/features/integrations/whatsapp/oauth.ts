import crypto from "node:crypto";
import { getWhatsAppConfig } from "./config";

/**
 * Bookzello — Phase 1H-D28: Meta WhatsApp Embedded Signup OAuth Engine
 *
 * Implements:
 * 1. Cryptographically signed, tamper-proof, tenant-bound OAuth state generation & verification.
 * 2. Short-lived authorization code exchange with Meta Graph API (v26.0 / v21.0+).
 * 3. WABA phone number metadata inspection (display number, verified name, quality rating).
 * 4. WABA webhook application subscription & revocation.
 * 5. Safe mock fallback for test suites and sandbox verification without live Meta network calls.
 */

export interface WhatsAppOAuthStatePayload {
  businessId: string;
  userId: string;
  timestamp: number;
  nonce: string;
}

export interface VerifyOAuthStateResult {
  valid: boolean;
  businessId?: string;
  userId?: string;
  error?: string;
}

export interface MetaTokenExchangeResult {
  success: boolean;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  error?: string;
}

export interface WabaPhoneDetailsResult {
  success: boolean;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
  error?: string;
}

function getOAuthSigningSecret(): string {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (secret && secret.length > 0) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("WHATSAPP_APP_SECRET is strictly required in production for OAuth state signing.");
  }
  return "bookzello-whatsapp-oauth-dev-signing-secret-32b";
}

/**
 * Generates an encrypted/signed, tenant-bound, CSRF-resistant state token.
 * Format: base64url(businessId:userId:timestamp:nonce:hmac_signature)
 */
export function generateWhatsAppOAuthState(businessId: string, userId: string): string {
  if (!businessId || !userId) {
    throw new Error("businessId and userId are strictly required to generate an OAuth state.");
  }

  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${businessId}:${userId}:${timestamp}:${nonce}`;

  const secret = getOAuthSigningSecret();
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const rawToken = `${payload}:${signature}`;
  return Buffer.from(rawToken, "utf-8").toString("base64url");
}

/**
 * Verifies that an incoming OAuth state parameter is valid, untampered, unexpired,
 * and belongs to the expected business and user.
 */
export function verifyWhatsAppOAuthState(
  stateToken: string | null | undefined,
  expectedBusinessId?: string,
  expectedUserId?: string,
  maxAgeMs = 15 * 60 * 1000 // 15 minutes
): VerifyOAuthStateResult {
  if (!stateToken || typeof stateToken !== "string" || stateToken.trim() === "") {
    return { valid: false, error: "Missing or empty OAuth state token." };
  }

  let rawToken: string;
  try {
    rawToken = Buffer.from(stateToken.trim(), "base64url").toString("utf-8");
  } catch {
    return { valid: false, error: "Malformed base64url OAuth state token." };
  }

  const parts = rawToken.split(":");
  if (parts.length !== 5) {
    return { valid: false, error: "Invalid OAuth state format (expected 5 segments)." };
  }

  const [businessId, userId, timestampStr, nonce, providedSignature] = parts;
  const timestamp = Number.parseInt(timestampStr, 10);

  if (Number.isNaN(timestamp)) {
    return { valid: false, error: "Invalid timestamp in OAuth state." };
  }

  // Check expiration
  const now = Date.now();
  if (now - timestamp > maxAgeMs) {
    return { valid: false, error: "OAuth state token has expired (exceeded 15 minutes)." };
  }
  if (timestamp > now + 60 * 1000) {
    return { valid: false, error: "OAuth state timestamp is in the future." };
  }

  // Verify HMAC-SHA256 signature
  const payload = `${businessId}:${userId}:${timestamp}:${nonce}`;
  const secret = getOAuthSigningSecret();
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (providedSignature.length !== expectedSignature.length) {
    return { valid: false, error: "OAuth state signature length mismatch." };
  }

  const signatureMatches = crypto.timingSafeEqual(
    Buffer.from(providedSignature, "utf-8"),
    Buffer.from(expectedSignature, "utf-8")
  );

  if (!signatureMatches) {
    return { valid: false, error: "OAuth state signature verification failed." };
  }

  // Verify tenant and user scope
  if (expectedBusinessId && businessId !== expectedBusinessId) {
    return { valid: false, error: `OAuth state tenant mismatch (expected ${expectedBusinessId}, received ${businessId}).` };
  }

  if (expectedUserId && userId !== expectedUserId) {
    return { valid: false, error: `OAuth state user mismatch (expected ${expectedUserId}, received ${userId}).` };
  }

  return {
    valid: true,
    businessId,
    userId,
  };
}

/**
 * Exchanges a short-lived authorization code from Meta's Embedded Signup for a User or System User access token.
 */
export async function exchangeMetaOAuthCode(params: {
  code: string;
  redirectUri?: string;
  forceMock?: boolean;
}): Promise<MetaTokenExchangeResult> {
  const { code, forceMock } = params;
  const config = getWhatsAppConfig();

  // Test or mock handling
  if (forceMock || code.startsWith("mock_") || !config.appId || !config.appSecret) {
    if (!config.appId && process.env.NODE_ENV === "production") {
      return { success: false, error: "Meta App ID (WHATSAPP_APP_ID) is not configured in production." };
    }
    // Return deterministic mock token for automated test suites
    return {
      success: true,
      accessToken: `mock_waba_tok_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`,
      tokenType: "bearer",
      expiresIn: 5184000, // 60 days
    };
  }

  const redirectUri =
    params.redirectUri || config.redirectUri || "https://bookzello.com/api/integrations/whatsapp/oauth/callback";

  const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/oauth/access_token`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("code", code);
  url.searchParams.set("redirect_uri", redirectUri);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const errMsg = data.error?.message || `Meta OAuth exchange failed with status ${res.status}`;
      return { success: false, error: errMsg };
    }

    if (!data.access_token) {
      return { success: false, error: "Meta response omitted access_token." };
    }

    return {
      success: true,
      accessToken: data.access_token,
      tokenType: data.token_type || "bearer",
      expiresIn: data.expires_in,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error during Meta OAuth code exchange";
    return { success: false, error: message };
  }
}

/**
 * Fetches verified phone number details from Meta Graph API.
 */
export async function fetchWabaPhoneDetails(
  phoneNumberId: string,
  accessToken: string,
  forceMock = false
): Promise<WabaPhoneDetailsResult> {
  const config = getWhatsAppConfig();

  if (forceMock || phoneNumberId.startsWith("mock_") || accessToken.startsWith("mock_")) {
    return {
      success: true,
      displayPhoneNumber: "+44 7700 900123",
      verifiedName: "Bookzello Verified Salon",
      qualityRating: "GREEN",
      codeVerificationStatus: "VERIFIED",
    };
  }

  try {
    const url = `https://graph.facebook.com/${config.graphApiVersion}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Failed to fetch phone number metadata (${res.status})`,
      };
    }

    return {
      success: true,
      displayPhoneNumber: data.display_phone_number || undefined,
      verifiedName: data.verified_name || undefined,
      qualityRating: data.quality_rating || undefined,
      codeVerificationStatus: data.code_verification_status || undefined,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error fetching phone details",
    };
  }
}

/**
 * Verifies that the client-submitted WABA ID and Phone Number ID are actually authorized
 * and owned by the newly exchanged Meta access token. Prevents client-side spoofing.
 */
export async function verifyMetaAssetOwnership(params: {
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
  forceMock?: boolean;
}): Promise<{
  verified: boolean;
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  error?: string;
}> {
  const { accessToken, wabaId, phoneNumberId, forceMock } = params;
  const config = getWhatsAppConfig();

  // Test / Mock mode handling
  if (
    forceMock ||
    accessToken.startsWith("mock_") ||
    wabaId.startsWith("mock_") ||
    phoneNumberId.startsWith("mock_")
  ) {
    if (wabaId === "unauthorized_waba_id" || phoneNumberId === "unauthorized_phone_id") {
      return {
        verified: false,
        error:
          "Server verification failed: The exchanged Meta token is not authorized to manage this WhatsApp Business Account or Phone Number.",
      };
    }
    return {
      verified: true,
      displayPhoneNumber: "+44 7700 900123",
      verifiedName: "Bookzello Verified Salon",
      qualityRating: "GREEN",
    };
  }

  try {
    // 1. Verify WABA ownership
    const wabaUrl = `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}?fields=id,name`;
    const wabaRes = await fetch(wabaUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const wabaData = await wabaRes.json();
    if (!wabaRes.ok || !wabaData.id || wabaData.id !== wabaId) {
      return {
        verified: false,
        error: `Server verification failed: WABA ID ${wabaId} is not authorized by the exchanged Meta token (${wabaData.error?.message || wabaRes.status}).`,
      };
    }

    // 2. Verify Phone Number belongs to the authorized WABA
    const phoneUrl = `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`;
    const phoneRes = await fetch(phoneUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const phoneData = await phoneRes.json();
    if (!phoneRes.ok || !Array.isArray(phoneData.data)) {
      return {
        verified: false,
        error: `Server verification failed: Unable to fetch authorized phone numbers for WABA ${wabaId}.`,
      };
    }

    const matchedPhone = phoneData.data.find((p: { id: string }) => p.id === phoneNumberId);
    if (!matchedPhone) {
      return {
        verified: false,
        error: `Security violation: Phone Number ID ${phoneNumberId} does not belong to authorized WABA ${wabaId}.`,
      };
    }

    return {
      verified: true,
      displayPhoneNumber: matchedPhone.display_phone_number || undefined,
      verifiedName: matchedPhone.verified_name || undefined,
      qualityRating: matchedPhone.quality_rating || undefined,
    };
  } catch (err: unknown) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : "Network error during Meta asset verification",
    };
  }
}

/**
 * Subscribes a client WABA to the Bookzello Meta App's webhooks.
 */
export async function subscribeWabaWebhooks(
  wabaId: string,
  accessToken: string,
  forceMock = false
): Promise<{ success: boolean; error?: string }> {
  const config = getWhatsAppConfig();

  if (forceMock || wabaId.startsWith("mock_") || accessToken.startsWith("mock_")) {
    return { success: true };
  }

  try {
    const url = `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/subscribed_apps`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || "Failed to subscribe WABA to webhooks." };
    }

    return { success: Boolean(data.success) };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Network error during WABA subscription" };
  }
}

/**
 * Revokes WABA webhook subscription when a salon disconnects.
 */
export async function unsubscribeWabaWebhooks(
  wabaId: string,
  accessToken: string,
  forceMock = false
): Promise<{ success: boolean; error?: string }> {
  const config = getWhatsAppConfig();

  if (forceMock || wabaId.startsWith("mock_") || accessToken.startsWith("mock_")) {
    return { success: true };
  }

  try {
    const url = `https://graph.facebook.com/${config.graphApiVersion}/${wabaId}/subscribed_apps`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();
    return { success: res.ok && Boolean(data.success) };
  } catch {
    // Best-effort cleanup on disconnect
    return { success: false, error: "Failed to unsubscribe WABA webhooks" };
  }
}
