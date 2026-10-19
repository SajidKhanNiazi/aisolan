import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnv, validatePublishableKey } from "@/lib/env";

describe("Publishable Key Security Validator (validatePublishableKey)", () => {
  it("should accept a valid modern publishable key starting with sb_publishable_", () => {
    const result = validatePublishableKey("sb_publishable_1234567890abcdef123456");
    expect(result.valid).toBe(true);
    expect(result.key).toBe("sb_publishable_1234567890abcdef123456");
    expect(result.error).toBeNull();
  });

  it("should accept a valid legacy anon JWT starting with eyJ", () => {
    const legacyJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.mockSignature12345";
    const result = validatePublishableKey(legacyJwt);
    expect(result.valid).toBe(true);
    expect(result.key).toBe(legacyJwt);
    expect(result.error).toBeNull();
  });

  it("CRITICAL: should strictly reject a secret key starting with sb_secret_", () => {
    const result = validatePublishableKey("sb_secret_mockSecretKey1234567890");
    expect(result.valid).toBe(false);
    expect(result.key).toBeNull();
    expect(result.error).toContain("Security Violation");
    // Ensure the raw secret key is never leaked in the error message
    expect(result.error).not.toContain("mockSecretKey1234567890");
  });

  it("CRITICAL: should strictly reject any key containing service_role", () => {
    const result = validatePublishableKey("custom_service_role_token_12345");
    expect(result.valid).toBe(false);
    expect(result.key).toBeNull();
    expect(result.error).toContain("Security Violation");
  });

  it("should reject an empty or missing key", () => {
    expect(validatePublishableKey("").valid).toBe(false);
    expect(validatePublishableKey(null).valid).toBe(false);
    expect(validatePublishableKey(undefined).valid).toBe(false);
  });

  it("should reject a malformed key that lacks standard prefix or JWT format", () => {
    const result = validatePublishableKey("random-invalid-string-123");
    expect(result.valid).toBe(false);
    expect(result.key).toBeNull();
    expect(result.error).toContain("Malformed key");
  });

  it("should reject a truncated or short publishable key", () => {
    const result = validatePublishableKey("sb_publishable_short");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Malformed publishable key");
  });
});

describe("Environment Utility Security & Conflict Handling (getEnv)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return default app URL when NEXT_PUBLIC_APP_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const env = getEnv();
    expect(env.appUrl).toBe("http://localhost:3000");
  });

  it("should report Supabase isConfigured as false when keys are missing without throwing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const env = getEnv();
    expect(env.supabase.isConfigured).toBe(false);
    expect(env.supabase.publishableKey).toBeNull();
    expect(env.supabase.error).toBeNull();
  });

  it("CRITICAL: should block configuration and record safe error if secret key is in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_unauthorized_key";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const env = getEnv();
    expect(env.supabase.isConfigured).toBe(false);
    expect(env.supabase.publishableKey).toBeNull();
    expect(env.supabase.error).toContain("Security Violation");
  });

  it("should flag an error when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY conflict", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_validKeyOne123456789";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_validKeyTwo123456789";

    const env = getEnv();
    expect(env.supabase.isConfigured).toBe(false);
    expect(env.supabase.publishableKey).toBeNull();
    expect(env.supabase.error).toContain("Conflicting environment variables");
  });

  it("should successfully configure when a valid publishable key is supplied", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_validKeyOne123456789";

    const env = getEnv();
    expect(env.supabase.isConfigured).toBe(true);
    expect(env.supabase.publishableKey).toBe("sb_publishable_validKeyOne123456789");
    expect(env.supabase.error).toBeNull();
  });
});
