import crypto from "node:crypto";

/**
 * Bookzello — Phase 1H-D28: WhatsApp Credential Encryption Guard
 * Provides authenticated AES-256-GCM encryption for Meta Cloud API access tokens
 * stored in `whatsapp_connections.credential_reference`.
 *
 * Security Invariants:
 * - Strictly requires WHATSAPP_TOKEN_ENCRYPTION_KEY for credential encryption.
 * - Does NOT silently fall back to WHATSAPP_APP_SECRET.
 * - Validates key length: exactly 32 bytes (256 bits).
 * - Fails closed if the key is missing or invalid.
 * - Authenticated cipher: AES-256-GCM with 96-bit (12-byte) unique IV and 128-bit (16-byte) auth tag.
 * - Plaintext tokens are NEVER logged, returned to client components, or written unencrypted.
 */

export function isWhatsAppTokenEncryptionConfigured(): boolean {
  const envKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim();
  if (!envKey) return false;

  try {
    const key = parseEncryptionKeyString(envKey);
    return key.length === 32;
  } catch {
    return false;
  }
}

function parseEncryptionKeyString(rawKey: string): Buffer {
  // 1. Hex format (64 characters)
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  // 2. Base64 format (44 characters for 32 bytes)
  if (rawKey.length === 44 && /^[A-Za-z0-9+/=]+$/.test(rawKey)) {
    const buf = Buffer.from(rawKey, "base64");
    if (buf.length === 32) return buf;
  }

  // 3. Raw 32-byte UTF-8 string
  const buf = Buffer.from(rawKey, "utf-8");
  if (buf.length === 32) return buf;

  throw new Error(
    "Invalid WHATSAPP_TOKEN_ENCRYPTION_KEY format. Must be exactly 32 bytes (64 hex characters, 44 base64 characters, or 32 raw bytes)."
  );
}

export function getWhatsAppEncryptionKey(): Buffer {
  const envKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim();

  if (envKey) {
    return parseEncryptionKeyString(envKey);
  }

  // Fail closed: No fallback to WHATSAPP_APP_SECRET
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing WHATSAPP_TOKEN_ENCRYPTION_KEY in production. A 32-byte secret key is strictly required to encrypt WhatsApp credentials. Falling back to other secrets is prohibited."
    );
  }

  // Test environment fallback only when explicitly running in test mode
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
    return Buffer.alloc(32, 0x5a); // 32-byte deterministic test key
  }

  throw new Error(
    "Missing WHATSAPP_TOKEN_ENCRYPTION_KEY. A 32-byte secret key is strictly required for WhatsApp credential encryption."
  );
}

/**
 * Encrypts a plaintext Meta WhatsApp access token using AES-256-GCM.
 * Never logs or exposes the input token.
 */
export function encryptWhatsAppToken(plaintext: string): string {
  if (!plaintext || plaintext.trim().length === 0) {
    throw new Error("Cannot encrypt empty token.");
  }

  const key = getWhatsAppEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted WhatsApp credential bundle.
 * Returns the original plaintext access token or throws on tampering.
 */
export function decryptWhatsAppToken(encryptedBundle: string): string {
  if (!encryptedBundle || !encryptedBundle.includes(":")) {
    throw new Error("Malformed encrypted token bundle format.");
  }

  const parts = encryptedBundle.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token segments. Expected iv:authTag:ciphertext.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Empty segment in encrypted token bundle.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== 12) {
    throw new Error("Invalid IV length for AES-GCM (expected 12 bytes).");
  }

  if (authTag.length !== 16) {
    throw new Error("Invalid AuthTag length for AES-GCM (expected 16 bytes).");
  }

  const key = getWhatsAppEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
