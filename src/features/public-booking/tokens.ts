import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Generates a high-entropy cryptographically secure random token (32 bytes / 64 hex characters).
 * This token is handed to the customer and never stored in raw form in the database.
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Produces a SHA-256 hex digest of the raw customer management token.
 * Only this digest is stored in `appointment_management_tokens.token_hash`.
 */
export function hashToken(token: string): string {
  const trimmed = token.trim();
  return createHash("sha256").update(trimmed).digest("hex");
}

/**
 * Constant-time comparison of token hashes to eliminate timing attack vectors.
 */
export function timingSafeHashMatch(hashA: string, hashB: string): boolean {
  if (typeof hashA !== "string" || typeof hashB !== "string") {
    return false;
  }
  const bufA = Buffer.from(hashA, "hex");
  const bufB = Buffer.from(hashB, "hex");
  if (bufA.length !== bufB.length || bufA.length !== 32) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Derives a clean, recognizable uppercase booking reference from an appointment UUID.
 * Example: 'APPT-' + 8 chars uppercase -> 'APPT-B1E29F3A'
 */
export function formatBookingReference(appointmentId: string): string {
  const cleanId = appointmentId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `APPT-${cleanId.substring(0, 8)}`;
}

/**
 * Builds the complete customer self-service URL.
 */
export function buildManagementUrl(baseUrl: string, token: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/manage-booking/${token}`;
}
