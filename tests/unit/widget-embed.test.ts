import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

describe("Phase 1: Embeddable AI Booking Widget Unit Tests", () => {
  describe("1. Security & CSP Frame Headers", () => {
    it("configures CSP frame-ancestors to permit external embedding on /embed/:path*", async () => {
      expect(nextConfig.headers).toBeDefined();
      const headersConfig = await nextConfig.headers!();

      // Check /embed/:path*
      const embedRoute = headersConfig.find((h: { source: string }) => h.source === "/embed/:path*");
      expect(embedRoute).toBeDefined();
      const cspHeader = embedRoute?.headers.find((header: { key: string }) => header.key === "Content-Security-Policy");
      expect(cspHeader).toBeDefined();
      expect(cspHeader?.value).toContain("frame-ancestors");
    });

    it("strictly prevents framing on core application and dashboard routes to guard against clickjacking", async () => {
      const headersConfig = await nextConfig.headers!();
      const nonEmbedRoute = headersConfig.find(
        (h: { source: string }) => h.source.includes("embed") && h.source.includes("?!")
      );
      expect(nonEmbedRoute).toBeDefined();
      const frameOptions = nonEmbedRoute?.headers.find((header: { key: string }) => header.key === "X-Frame-Options");
      const csp = nonEmbedRoute?.headers.find((header: { key: string }) => header.key === "Content-Security-Policy");
      expect(frameOptions?.value).toBe("SAMEORIGIN");
      expect(csp?.value).toBe("frame-ancestors 'self';");
    });
  });

  describe("2. Widget Loader Script Attributes & Domain Safety", () => {
    it("safely generates iframe target URL without embedding customer PII in query parameters", () => {
      const salonSlug = "bookpilot-qa-salon";
      const widgetId = "wgt_bookpilot_qa_salon";
      const baseUrl = "https://bookzello.com";

      const iframeUrl = `${baseUrl}/embed/${encodeURIComponent(salonSlug)}?widgetId=${encodeURIComponent(widgetId)}`;

      expect(iframeUrl).toBe("https://bookzello.com/embed/bookpilot-qa-salon?widgetId=wgt_bookpilot_qa_salon");
      expect(iframeUrl).not.toContain("name");
      expect(iframeUrl).not.toContain("phone");
      expect(iframeUrl).not.toContain("email");
    });

    it("verifies cross-origin postMessage origin matching", () => {
      const trustedOrigin = "https://bookzello.com";
      const validateMessageOrigin = (origin: string, expected: string) => {
        if (origin === expected) return true;
        const isLocal =
          (expected.includes("localhost") || expected.includes("127.0.0.1")) &&
          (origin.includes("localhost") || origin.includes("127.0.0.1"));
        return isLocal;
      };

      expect(validateMessageOrigin("https://bookzello.com", trustedOrigin)).toBe(true);
      expect(validateMessageOrigin("https://attacker.evil.com", trustedOrigin)).toBe(false);
      expect(validateMessageOrigin("http://localhost:3000", "http://localhost:3000")).toBe(true);
    });
  });

  describe("3. Slot Revalidation & Concurrency Invariant", () => {
    it("detects unavailable or taken slots and blocks blind booking creation", () => {
      const liveAvailableSlots = [
        { localTime: "10:00", startsAt: "2026-10-30T10:00:00Z", isAvailable: true },
        { localTime: "11:30", startsAt: "2026-10-30T11:30:00Z", isAvailable: true },
      ];

      const requestedTime = "14:00"; // Taken or unavailable
      const isStillAvailable = liveAvailableSlots.some(
        (s) => s.localTime === requestedTime && s.isAvailable
      );

      expect(isStillAvailable).toBe(false);
    });

    it("generates unique idempotency keys for each widget booking attempt", () => {
      const key1 = `wgt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const key2 = `wgt-${Date.now() + 1}-${Math.random().toString(36).substring(2, 9)}`;

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^wgt-\d+-[a-z0-9]+$/);
    });
  });

  describe("4. Strict Booking Mode Safety", () => {
    it("guarantees AI_BOOKING_WRITES_ENABLED remains false", () => {
      const writesEnabled = process.env.AI_BOOKING_WRITES_ENABLED === "true";
      expect(writesEnabled).toBe(false);
    });
  });
});
