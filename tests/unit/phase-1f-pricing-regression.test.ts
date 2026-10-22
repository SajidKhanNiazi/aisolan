import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatCurrency, parsePriceToMinorUnits } from "@/features/services/types";
import { createServiceClient } from "@/lib/supabase/service";

describe("Phase 1F: Pricing & Rate-Limiter Regression Tests (1F-001 & 1F-002)", () => {
  describe("Task B: 1F-002 — Public Price Formatting & Currency Contract", () => {
    // Four canonical QA services from the test environment:
    const QA_SERVICES = [
      { name: "Classic Haircut", minorUnits: 2200, expectedFormatted: "£22.00", majorEquivalent: 22 },
      { name: "Haircut & Beard", minorUnits: 2800, expectedFormatted: "£28.00", majorEquivalent: 28 },
      { name: "Hair Styling", minorUnits: 1500, expectedFormatted: "£15.00", majorEquivalent: 15 },
      { name: "Beard Trim", minorUnits: 1000, expectedFormatted: "£10.00", majorEquivalent: 10 },
    ];

    it("formats all four QA services correctly from integer minor units to GBP", () => {
      for (const service of QA_SERVICES) {
        const formatted = formatCurrency(service.minorUnits, "GBP", "en-GB");
        expect(formatted).toBe(service.expectedFormatted);
        // Ensure no 100x multiplication occurs (e.g. £2,200 is never emitted)
        expect(formatted).not.toContain("2,200");
        expect(formatted).not.toContain("2,800");
        expect(formatted).not.toContain("1,500");
        expect(formatted).not.toContain("1,000.00");
      }
    });

    it("verifies the data contract: parsePriceToMinorUnits invertibility with formatCurrency", () => {
      for (const service of QA_SERVICES) {
        // Owner enters major units string (e.g. "22.00" or "22")
        const minorParsed = parsePriceToMinorUnits(service.majorEquivalent.toString());
        expect(minorParsed).toBe(service.minorUnits);

        // Public serializer formats minor units for display
        const displayFormatted = formatCurrency(minorParsed, "GBP", "en-GB");
        expect(displayFormatted).toBe(service.expectedFormatted);
      }
    });

    it("supports international currency decimal conventions (EUR, USD, GBP)", () => {
      // UK GBP: Dot decimal separator (£22.00)
      const gbp = formatCurrency(2200, "GBP", "en-GB");
      expect(gbp).toBe("£22.00");

      // US USD: Dot decimal separator ($22.00)
      const usd = formatCurrency(2200, "USD", "en-US");
      expect(usd).toBe("$22.00");

      // German EUR: Comma decimal separator (22,00 €)
      const eurGerman = formatCurrency(2200, "EUR", "de-DE");
      // Normalize non-breaking spaces
      const normalizedEur = eurGerman.replace(/\u00a0/g, " ");
      expect(normalizedEur).toMatch(/22,00\s?€/);
    });

    it("handles zero, small amounts, and fractional pence", () => {
      expect(formatCurrency(0, "GBP", "en-GB")).toBe("£0.00");
      expect(formatCurrency(50, "GBP", "en-GB")).toBe("£0.50");
      expect(formatCurrency(99, "GBP", "en-GB")).toBe("£0.99");
      expect(formatCurrency(2250, "GBP", "en-GB")).toBe("£22.50");
    });
  });

  describe("Task A: 1F-001 — Service Client Initialization & Environment Robustness", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_KEY;
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns null when neither NEXT_PUBLIC_SUPABASE_URL nor SUPABASE_URL is configured", () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test_key";
      const client = createServiceClient();
      expect(client).toBeNull();
    });

    it("returns null when service role key is completely missing (verifying fail-closed state)", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      const client = createServiceClient();
      expect(client).toBeNull();
    });

    it("initializes client successfully when SUPABASE_SERVICE_ROLE_KEY is provided", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-role-key-for-test";
      const client = createServiceClient();
      expect(client).not.toBeNull();
      expect(client?.rpc).toBeDefined();
    });

    it("supports SUPABASE_SERVICE_KEY alias", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_KEY = "dummy-service-role-key-alias";
      const client = createServiceClient();
      expect(client).not.toBeNull();
    });

    it("supports SUPABASE_SECRET_KEY alias", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SECRET_KEY = "dummy-secret-key-alias";
      const client = createServiceClient();
      expect(client).not.toBeNull();
    });

    it("supports SUPABASE_URL server variable without NEXT_PUBLIC_ prefix", () => {
      process.env.SUPABASE_URL = "https://example-server.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-role-key";
      const client = createServiceClient();
      expect(client).not.toBeNull();
    });

    it("strips outer quotes if secret key is pasted with quotes in environment", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = '"dummy-quoted-service-role-key"';
      const client = createServiceClient();
      expect(client).not.toBeNull();
    });
  });
});
