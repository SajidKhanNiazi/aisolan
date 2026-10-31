import crypto from "node:crypto";
import { getWhatsAppConfig } from "./config";

/**
 * Validates Meta Webhook Verification Challenge (GET /api/integrations/whatsapp/webhook).
 * Compares hub.verify_token securely with configured WHATSAPP_VERIFY_TOKEN.
 * Never logs the token value.
 */
export interface WebhookChallengeParams {
  mode: string | null | undefined;
  token: string | null | undefined;
  challenge: string | null | undefined;
}

export function verifyMetaWebhookChallenge(
  modeOrParams: string | WebhookChallengeParams | null,
  maybeToken?: string | null,
  maybeChallenge?: string | null
): { valid: boolean; challenge?: string; error?: string } {
  let mode: string | null | undefined;
  let token: string | null | undefined;
  let challenge: string | null | undefined;

  if (typeof modeOrParams === "object" && modeOrParams !== null) {
    mode = modeOrParams.mode;
    token = modeOrParams.token;
    challenge = modeOrParams.challenge;
  } else {
    mode = modeOrParams;
    token = maybeToken;
    challenge = maybeChallenge;
  }

  if (mode !== "subscribe") {
    return { valid: false, error: "Unsupported hub.mode (expected 'subscribe')" };
  }

  if (!token || !challenge) {
    return { valid: false, error: "Missing hub.verify_token or hub.challenge" };
  }

  const config = getWhatsAppConfig();
  const configuredToken = config.verifyToken;
  if (!configuredToken || configuredToken.trim().length === 0) {
    return { valid: false, error: "WHATSAPP_VERIFY_TOKEN is not configured" };
  }

  const cleanProvided = token.trim();
  const cleanExpected = configuredToken.trim();

  if (cleanProvided.length !== cleanExpected.length) {
    return { valid: false, error: "Invalid verify token" };
  }

  const match = crypto.timingSafeEqual(
    Buffer.from(cleanProvided, "utf-8"),
    Buffer.from(cleanExpected, "utf-8")
  );

  return match
    ? { valid: true, challenge }
    : { valid: false, error: "Invalid verify token" };
}

/**
 * Validates Meta Webhook Payload Signature (POST /api/integrations/whatsapp/webhook).
 * Meta signs the raw payload with HMAC-SHA256 using the Meta App Secret and places it
 * in the `X-Hub-Signature-256` header formatted as: `sha256=<hex_digest>`.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null
): { valid: boolean; error?: string } {
  if (!signatureHeader) {
    return { valid: false, error: "Missing X-Hub-Signature-256 header" };
  }

  if (!rawBody) {
    return { valid: false, error: "Empty request body" };
  }

  const config = getWhatsAppConfig();
  const appSecret = config.appSecret;
  if (!appSecret || appSecret.trim().length === 0) {
    return { valid: false, error: "WHATSAPP_APP_SECRET is not configured" };
  }

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) {
    return { valid: false, error: "Invalid signature format (expected sha256=...)" };
  }

  const signatureHex = signatureHeader.substring(prefix.length).trim().toLowerCase();
  const expectedHex = crypto
    .createHmac("sha256", appSecret.trim())
    .update(rawBody, "utf-8")
    .digest("hex")
    .toLowerCase();

  if (signatureHex.length !== expectedHex.length) {
    return { valid: false, error: "Signature mismatch" };
  }

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(signatureHex, "utf-8"),
      Buffer.from(expectedHex, "utf-8")
    );
    return valid ? { valid: true } : { valid: false, error: "Signature mismatch" };
  } catch {
    return { valid: false, error: "Failed to compare signature" };
  }
}

