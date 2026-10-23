/**
 * BookPilot AI — Refresh Token Encryption Guard
 * Phase 1G-B: AES-256-GCM Authenticated Encryption for Google OAuth Refresh Tokens
 * Guarantees that refresh tokens are never stored as plaintext in the database or logs.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Checks whether token encryption key is explicitly configured in environment.
 */
export function isTokenEncryptionConfigured(): boolean {
  const envKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  return Boolean(envKey && envKey.trim().length > 0);
}

/**
 * Derives or extracts a valid 32-byte (256-bit) encryption key from the environment.
 */
export function getEncryptionKey(): Buffer {
  const envKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (envKey && envKey.trim().length > 0) {
    const trimmed = envKey.trim();
    // If provided as a 64-char hex string
    if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
      return Buffer.from(trimmed, "hex");
    }
    // If provided as a 32-char ascii string or base64
    if (trimmed.length === 32) {
      return Buffer.from(trimmed, "utf-8");
    }
    // Hash arbitrary length secret to deterministic 32 bytes
    return crypto.createHash("sha256").update(trimmed).digest();
  }

  // In test or local development environments, use a secure deterministic fallback key
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    return crypto.createHash("sha256").update("bookpilot_dev_test_calendar_key_2026").digest();
  }

  throw new Error(
    "Missing GOOGLE_TOKEN_ENCRYPTION_KEY in production. A 32-byte secret key is strictly required to encrypt OAuth tokens."
  );
}

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * Output format: `${ivHex}:${authTagHex}:${ciphertextHex}`
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext || plaintext.trim() === "") {
    throw new Error("Cannot encrypt empty token.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects format: `${ivHex}:${authTagHex}:${ciphertextHex}`
 */
export function decryptToken(encryptedBundle: string): string {
  if (!encryptedBundle || !encryptedBundle.includes(":")) {
    throw new Error("Malformed encrypted token bundle format.");
  }

  const parts = encryptedBundle.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token segments. Expected iv:authTag:ciphertext.");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
