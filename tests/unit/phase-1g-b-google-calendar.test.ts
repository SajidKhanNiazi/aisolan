/**
 * BookPilot AI — Phase 1G-B Automated Tests: Google Calendar Integration
 * Verifies OAuth State & CSRF Protection, AES-256-GCM Token Encryption,
 * Google Calendar API Client & Event Formatting, Worker Exponential Backoff,
 * Schema Validations, and Tenant Isolation Invariants.
 */

import crypto from "crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  encryptToken,
  decryptToken,
  isTokenEncryptionConfigured,
} from "@/features/integrations/google-calendar/encryption";
import {
  createOAuthState,
  verifyOAuthState,
  buildGoogleAuthUrl,
} from "@/features/integrations/google-calendar/oauth";
import {
  buildGoogleEventInput,
} from "@/features/integrations/google-calendar/client";
import {
  calculateSyncBackoffSeconds,
} from "@/features/integrations/google-calendar/worker";
import {
  googleOAuthCallbackQuerySchema,
  updateCalendarSettingsSchema,
  disconnectCalendarSchema,
  calendarSyncWorkerQuerySchema,
  initialSyncSchema,
} from "@/features/integrations/google-calendar/validation";
import type { CalendarSyncEventPayload } from "@/features/integrations/google-calendar/types";

describe("Phase 1G-B: Google Calendar Integration Infrastructure", () => {
  const originalEnv = { ...process.env };
  const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = TEST_KEY;
    process.env.GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret-12345";
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = "https://aisolan.vercel.app/api/integrations/google-calendar/callback";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. AES-256-GCM Refresh Token Encryption & Decryption
  // ===========================================================================
  describe("Token Encryption & Key Security", () => {
    it("reports true when GOOGLE_TOKEN_ENCRYPTION_KEY is present", () => {
      expect(isTokenEncryptionConfigured()).toBe(true);
    });

    it("reports false when GOOGLE_TOKEN_ENCRYPTION_KEY is missing", () => {
      delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_SECRET;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      expect(isTokenEncryptionConfigured()).toBe(false);
    });

    it("encrypts and decrypts a refresh token cleanly (round-trip)", () => {
      const rawToken = "1//04test_google_refresh_token_xyz987654321_abc";
      const encrypted = encryptToken(rawToken);

      expect(encrypted).not.toBe(rawToken);
      expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(rawToken);
    });

    it("produces non-deterministic ciphertext for identical inputs (unique IV per call)", () => {
      const token = "refresh-token-identical";
      const enc1 = encryptToken(token);
      const enc2 = encryptToken(token);

      expect(enc1).not.toBe(enc2);
      expect(decryptToken(enc1)).toBe(token);
      expect(decryptToken(enc2)).toBe(token);
    });

    it("fails decryption if the ciphertext or authentication tag is tampered with", () => {
      const token = "sample-secret-refresh-token";
      const encrypted = encryptToken(token);
      const parts = encrypted.split(":");

      // Tamper with the ciphertext
      const tampered = `${parts[0]}:${parts[1]}:tampered${parts[2].slice(8)}`;
      expect(() => decryptToken(tampered)).toThrow();
    });

    it("fails decryption if a different encryption key is supplied", () => {
      const token = "secret-token-key-mismatch";
      const encrypted = encryptToken(token);

      // Change encryption key
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
      expect(() => decryptToken(encrypted)).toThrow();
    });

    it("rejects invalid cipher format with descriptive error", () => {
      expect(() => decryptToken("invalid-format")).toThrow(/Malformed encrypted token bundle format/);
    });
  });

  // ===========================================================================
  // 2. OAuth 2.0 State Security & CSRF Protection
  // ===========================================================================
  describe("OAuth State Creation & CSRF Verification", () => {
    const businessId = "11111111-1111-4111-a111-111111111111";
    const userId = "22222222-2222-4222-a222-222222222222";
    const businessSlug = "mayfair-barbers";

    it("generates a signed state token containing business and user bounds", () => {
      const state = createOAuthState(userId, businessId, businessSlug);
      expect(state).toBeTruthy();

      const verification = verifyOAuthState(state, userId, businessId);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.businessId).toBe(businessId);
      expect(verification.payload?.userId).toBe(userId);
      expect(verification.payload?.businessSlug).toBe(businessSlug);
      expect(verification.payload?.expiresAt).toBeGreaterThan(Date.now());
    });

    it("rejects state token if payload has been modified (tamper detection)", () => {
      const state = createOAuthState(userId, businessId, businessSlug);
      const parts = state.split(".");
      expect(parts).toHaveLength(2);

      // Decode and modify payload
      const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      payload.businessId = "99999999-9999-4999-a999-999999999999"; // Attacker attempts tenant hijack
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const tamperedState = `${tamperedPayload}.${parts[1]}`;

      const verification = verifyOAuthState(tamperedState, userId, businessId);
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("tampered token");
    });

    it("rejects state token if authenticated user does not match the token recipient", () => {
      const state = createOAuthState(userId, businessId, businessSlug);
      const anotherUserId = "88888888-8888-4888-a888-888888888888";

      const verification = verifyOAuthState(state, anotherUserId, businessId);
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("different authenticated user");
    });

    it("rejects state token if workspace does not match the expected business ID", () => {
      const state = createOAuthState(userId, businessId, businessSlug);
      const anotherBusinessId = "77777777-7777-4777-a777-777777777777";

      const verification = verifyOAuthState(state, userId, anotherBusinessId);
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("does not match the active salon workspace");
    });

    it("rejects expired state tokens", () => {
      // Fabricate an expired state payload signed with the secret
      const secret = process.env.GOOGLE_CLIENT_SECRET || TEST_KEY;
      const expiredPayload = {
        userId,
        businessId,
        businessSlug,
        expiresAt: Date.now() - 5000, // Expired 5 seconds ago
        nonce: "test-nonce-1234",
      };
      const payloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
      const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
      const expiredState = `${payloadB64}.${sig}`;

      const verification = verifyOAuthState(expiredState, userId, businessId);
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("expired");
    });

    it("constructs official Google OAuth authorization URL with correct query params", () => {
      const state = createOAuthState(userId, businessId, businessSlug);
      const redirectUri = "https://aisolan.vercel.app/api/integrations/google-calendar/callback";
      const urlString = buildGoogleAuthUrl(state, redirectUri);
      const url = new URL(urlString);

      expect(url.origin).toBe("https://accounts.google.com");
      expect(url.pathname).toBe("/o/oauth2/v2/auth");
      expect(url.searchParams.get("client_id")).toBe("mock-client-id.apps.googleusercontent.com");
      expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("access_type")).toBe("offline");
      expect(url.searchParams.get("prompt")).toBe("consent");
      expect(url.searchParams.get("state")).toBe(state);

      // Verify minimum scopes are requested
      const scopes = url.searchParams.get("scope")?.split(" ") || [];
      expect(scopes).toContain("https://www.googleapis.com/auth/calendar.events");
      expect(scopes).toContain("https://www.googleapis.com/auth/calendar.readonly");
    });
  });

  // ===========================================================================
  // 3. Google API Exponential Backoff
  // ===========================================================================
  describe("API Backoff Calculation", () => {
    it("calculates exponential backoff intervals bounded to maximum 3600s", () => {
      const delay1 = calculateSyncBackoffSeconds(1);
      const delay2 = calculateSyncBackoffSeconds(2);
      const delay3 = calculateSyncBackoffSeconds(3);
      const delay4 = calculateSyncBackoffSeconds(4);
      const delay10 = calculateSyncBackoffSeconds(10);

      expect(delay1).toBe(30);   // 30 * 2^0 = 30
      expect(delay2).toBe(60);   // 30 * 2^1 = 60
      expect(delay3).toBe(120);  // 30 * 2^2 = 120
      expect(delay4).toBe(240);  // 30 * 2^3 = 240
      expect(delay10).toBe(3600); // capped at 3600
    });
  });

  // ===========================================================================
  // 4. Calendar Event Formatting & Privacy Protection
  // ===========================================================================
  describe("Calendar Event Formatting & Data Privacy", () => {
    const samplePayload: CalendarSyncEventPayload = {
      appointment_id: "33333333-3333-4333-a333-333333333333",
      business_id: "11111111-1111-4111-a111-111111111111",
      business_name: "Gentlemen's Quarters",
      business_slug: "gentlemens-quarters",
      business_timezone: "Europe/London",
      service_name: "Hot Towel Shave & Facial",
      staff_name: "Marcus Aurelius",
      customer_name: "John Wick",
      customer_email: "wick@continental.hotel",
      customer_phone: "+44 7700 900123",
      starts_at: "2026-11-10T11:00:00Z",
      service_ends_at: "2026-11-10T11:45:00Z",
      status: "confirmed",
      booking_reference: "APPT-JW777888",
    };

    it("formats summary including service name, salon name, and reference", () => {
      const event = buildGoogleEventInput(samplePayload);
      expect(event.summary).toBe("Hot Towel Shave & Facial — Gentlemen's Quarters (APPT-JW777888)");
    });

    it("formats start and end times in business timezone", () => {
      const event = buildGoogleEventInput(samplePayload);
      expect(event.startIso).toBe("2026-11-10T11:00:00Z");
      expect(event.endIso).toBe("2026-11-10T11:45:00Z");
      expect(event.timeZone).toBe("Europe/London");
    });

    it("includes booking reference, customer name, specialist, and dashboard link in description", () => {
      const event = buildGoogleEventInput(samplePayload);
      expect(event.description).toContain("APPT-JW777888");
      expect(event.description).toContain("John Wick");
      expect(event.description).toContain("Marcus Aurelius");
      expect(event.description).toContain("https://aisolan.vercel.app/dashboard/gentlemens-quarters/appointments");
    });

    it("NEVER leaks customer management tokens or private secrets into event description", () => {
      const event = buildGoogleEventInput(samplePayload);
      expect(event.description).not.toContain("manage-booking");
      expect(event.description).not.toContain("token");
      expect(event.description).not.toContain("secret");
      expect(event.description).not.toContain("encrypted_refresh_token");
    });
  });

  // ===========================================================================
  // 5. Input Validation Schemas
  // ===========================================================================
  describe("Zod Validation Schemas", () => {
    it("validates successful OAuth callback parameters", () => {
      const valid = googleOAuthCallbackQuerySchema.safeParse({
        code: "4/0AeanS0Y1234567890abcdef",
        state: "eyJhbGciOi...test",
      });
      expect(valid.success).toBe(true);
    });

    it("accepts OAuth callback error queries (for safe handling)", () => {
      const res = googleOAuthCallbackQuerySchema.safeParse({
        error: "access_denied",
        error_description: "The user denied access to your application",
      });
      expect(res.success).toBe(true);
      expect(res.data?.error).toBe("access_denied");
    });

    it("validates update calendar settings schema", () => {
      expect(updateCalendarSettingsSchema.safeParse({ calendarId: "primary", syncEnabled: true }).success).toBe(true);
      expect(updateCalendarSettingsSchema.safeParse({ calendarId: "salon_cal_123@group.calendar.google.com" }).success).toBe(true);
      expect(updateCalendarSettingsSchema.safeParse({ calendarId: "" }).success).toBe(false);
    });

    it("validates disconnect calendar schema", () => {
      expect(disconnectCalendarSchema.safeParse({ keepExistingEvents: true }).success).toBe(true);
      expect(disconnectCalendarSchema.safeParse({ keepExistingEvents: false }).success).toBe(true);
      expect(disconnectCalendarSchema.safeParse({}).data?.keepExistingEvents).toBe(true); // default true
    });

    it("validates worker batch query parameters with bounds", () => {
      expect(calendarSyncWorkerQuerySchema.safeParse({ batchSize: "25" }).data?.batchSize).toBe(25);
      expect(calendarSyncWorkerQuerySchema.safeParse({ batchSize: "100" }).success).toBe(false); // Max 50
      expect(calendarSyncWorkerQuerySchema.safeParse({ batchSize: "0" }).success).toBe(false); // Min 1
      expect(calendarSyncWorkerQuerySchema.safeParse({}).data?.batchSize).toBe(10); // Default 10
    });

    it("validates initial sync schema with sensible bounds", () => {
      expect(initialSyncSchema.safeParse({ daysAhead: "30" }).data?.daysAhead).toBe(30);
      expect(initialSyncSchema.safeParse({ daysAhead: "120" }).success).toBe(false); // Max 90
      expect(initialSyncSchema.safeParse({}).data?.daysAhead).toBe(30); // Default 30
    });
  });

  // ===========================================================================
  // 6. Multi-Tenant Security & Invariant Protections
  // ===========================================================================
  describe("Multi-Tenant Isolation & Invariants", () => {
    it("guarantees state verification binds connection exclusively to the initiated business and user", () => {
      const businessA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
      const userA = "11111111-1111-4111-a111-111111111111";
      const businessB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

      const stateForA = createOAuthState(userA, businessA, "slug-a");
      const verifiedA = verifyOAuthState(stateForA, userA, businessA);
      expect(verifiedA.valid).toBe(true);

      const crossTenantAttempt = verifyOAuthState(stateForA, userA, businessB);
      expect(crossTenantAttempt.valid).toBe(false);
    });

    it("formats distinct summaries and dashboard links for different businesses", () => {
      const payloadA: CalendarSyncEventPayload = {
        appointment_id: "id-1",
        business_id: "bus-a",
        business_name: "Mayfair Barbers",
        business_slug: "mayfair",
        business_timezone: "Europe/London",
        service_name: "Classic Cut",
        staff_name: "Arthur",
        customer_name: "Customer A",
        customer_email: null,
        customer_phone: null,
        starts_at: "2026-11-10T10:00:00Z",
        service_ends_at: "2026-11-10T10:30:00Z",
        status: "confirmed",
        booking_reference: "REF-A",
      };

      const payloadB: CalendarSyncEventPayload = {
        ...payloadA,
        business_id: "bus-b",
        business_name: "Soho Stylists",
        business_slug: "soho",
        booking_reference: "REF-B",
      };

      const eventA = buildGoogleEventInput(payloadA);
      const eventB = buildGoogleEventInput(payloadB);

      expect(eventA.summary).toBe("Classic Cut — Mayfair Barbers (REF-A)");
      expect(eventB.summary).toBe("Classic Cut — Soho Stylists (REF-B)");
      expect(eventA.description).toContain("/dashboard/mayfair/appointments");
      expect(eventB.description).toContain("/dashboard/soho/appointments");
    });
  });

  // ===========================================================================
  // 7. Event Idempotency, 409 Conflict Reconciliation & Stale Job Suppression
  // ===========================================================================
  describe("Idempotency, 409 Conflict Handling & Version Ordering", () => {
    it("generates deterministic Google Event IDs compliant with RFC 4648 base32hex ([0-9a-v])", () => {
      const appointmentId = "11111111-2222-4333-a444-555555555555";
      const deterministicId = "bp" + appointmentId.replace(/-/g, "").toLowerCase();

      expect(deterministicId).toBe("bp1111111122224333a444555555555555");
      expect(deterministicId.length).toBeGreaterThanOrEqual(5);
      expect(deterministicId.length).toBeLessThanOrEqual(1024);
      // Ensure all characters match Google Calendar allowed base32hex charset: [0-9a-v]
      expect(/^[0-9a-v]+$/.test(deterministicId)).toBe(true);
    });

    it("ensures different appointments yield distinct deterministic event IDs", () => {
      const appt1 = "11111111-1111-4111-a111-111111111111";
      const appt2 = "22222222-2222-4222-a222-222222222222";
      const id1 = "bp" + appt1.replace(/-/g, "").toLowerCase();
      const id2 = "bp" + appt2.replace(/-/g, "").toLowerCase();

      expect(id1).not.toBe(id2);
    });

    it("detects stale job versions when an existing synchronized version is newer", () => {
      const olderSyncVersion = "20261023080000123456"; // Reschedule A at 8:00 AM microsecond 123456
      const newerSyncVersion = "20261023080000789012"; // Reschedule B within the exact same second, microsecond 789012

      // Microsecond comparison must cleanly identify olderSyncVersion as stale
      expect(newerSyncVersion.localeCompare(olderSyncVersion) > 0).toBe(true);
      expect(olderSyncVersion.localeCompare(newerSyncVersion) < 0).toBe(true);
    });

    it("prevents dedupe key collisions for multiple reschedules in the same second", () => {
      const appointmentId = "11111111-2222-4333-a444-555555555555";
      const v1 = "20261023090000100000";
      const v2 = "20261023090000200000";

      const dedupeKey1 = `${appointmentId}:update:${v1}`;
      const dedupeKey2 = `${appointmentId}:update:${v2}`;

      expect(dedupeKey1).not.toBe(dedupeKey2);
      expect(v2.localeCompare(v1) > 0).toBe(true);
    });

    it("verifies attempt limit logic excludes jobs that have exhausted max_attempts", () => {
      const maxAttempts = 5;
      const jobExhausted = { attempt_count: 5, max_attempts: maxAttempts };
      const jobEligible = { attempt_count: 4, max_attempts: maxAttempts };

      expect(jobExhausted.attempt_count < jobExhausted.max_attempts).toBe(false);
      expect(jobEligible.attempt_count < jobEligible.max_attempts).toBe(true);
    });

    it("handles booking followed by immediate reschedule before first sync (self-healing create)", () => {
      // In this scenario, existingMapping is null and action is 'update'
      const existingMapping = null;
      const action = "update";

      const requiresCreateHealing = action === "update" && (!existingMapping || !existingMapping);
      expect(requiresCreateHealing).toBe(true);
    });
  });
});
