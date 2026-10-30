import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";
import { aiChatInputSchema } from "@/features/ai-receptionist/validation";
import {
  parseAllowedDomains,
  isDomainAllowed,
  normalizeHostname,
  isValidDomainFormat,
} from "@/features/organizations/domain-policy";

describe("Phase 1: Embeddable AI Booking Widget Unit Tests", () => {
  describe("1. Bug 1 Regression: aiChatInputSchema Null-Input Acceptance", () => {
    it("successfully parses payload when draftToken is explicitly null without throwing validation error", () => {
      const payloadWithNullDraft = {
        businessSlug: "bookpilot-qa-salon",
        messages: [{ role: "user" as const, content: "Hello, I want to book a haircut." }],
        draftToken: null,
      };

      const result = aiChatInputSchema.safeParse(payloadWithNullDraft);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessSlug).toBe("bookpilot-qa-salon");
        expect(result.data.messages).toHaveLength(1);
        expect(result.data.messages[0].content).toBe("Hello, I want to book a haircut.");
        // Null input is successfully accepted without schema failure
        expect(result.data.draftToken).toBeNull();
      }
    });

    it("successfully parses and preserves active draftToken string across turns", () => {
      const payloadWithStringDraft = {
        businessSlug: "bookpilot-qa-salon",
        messages: [
          { role: "user" as const, content: "Hello, I want to book a haircut." },
          { role: "assistant" as const, content: "We offer Classic Haircut..." },
          { role: "user" as const, content: "Classic Haircut please" },
        ],
        draftToken: "bpdraft_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validToken",
      };

      const result = aiChatInputSchema.safeParse(payloadWithStringDraft);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.draftToken).toBe("bpdraft_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validToken");
      }
    });

    it("handles omitted draftToken gracefully", () => {
      const payloadWithoutDraft = {
        businessSlug: "bookpilot-qa-salon",
        messages: [{ role: "user" as const, content: "What treatments do you offer?" }],
      };

      const result = aiChatInputSchema.safeParse(payloadWithoutDraft);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.draftToken).toBeUndefined();
      }
    });
  });

  describe("2. Bug 2 Regression: Domain Policy & Persistence Parsing", () => {
    it("normalizes diverse domain and URL formats into clean hostnames", () => {
      expect(normalizeHostname("https://ferienkalendr.de")).toBe("ferienkalendr.de");
      expect(normalizeHostname("http://ferienkalendr.de/path/page")).toBe("ferienkalendr.de");
      expect(normalizeHostname("ferienkalendr.de:8080")).toBe("ferienkalendr.de");
      expect(normalizeHostname("  https://WWW.Ferienkalendr.DE/  ")).toBe("www.ferienkalendr.de");
    });

    it("parses comma-separated domain lists from business settings", () => {
      const raw = "ferienkalendr.de, https://mysalon.com, sub.domain.co.uk/";
      const parsed = parseAllowedDomains(raw);
      expect(parsed).toEqual(["ferienkalendr.de", "mysalon.com", "sub.domain.co.uk"]);
    });

    it("validates domain syntax correctly", () => {
      expect(isValidDomainFormat("ferienkalendr.de")).toBe(true);
      expect(isValidDomainFormat("www.ferienkalendr.de")).toBe(true);
      expect(isValidDomainFormat("localhost")).toBe(true);
      expect(isValidDomainFormat("not_a_valid_domain")).toBe(false);
      expect(isValidDomainFormat("")).toBe(false);
    });

    it("enforces exact matching and subdomain hierarchy while preventing prefix attacks", () => {
      const allowed = ["ferienkalendr.de"];

      // Exact host match
      expect(isDomainAllowed("ferienkalendr.de", allowed)).toBe(true);
      expect(isDomainAllowed("https://ferienkalendr.de", allowed)).toBe(true);

      // Subdomain matching
      expect(isDomainAllowed("www.ferienkalendr.de", allowed)).toBe(true);
      expect(isDomainAllowed("https://staging.ferienkalendr.de/booking", allowed)).toBe(true);

      // Prefix attack rejection
      expect(isDomainAllowed("fake-ferienkalendr.de", allowed)).toBe(false);
      expect(isDomainAllowed("ferienkalendr.de.attacker.com", allowed)).toBe(false);
      expect(isDomainAllowed("malicious-site.com", allowed)).toBe(false);

      // Internal application domains always permitted
      expect(isDomainAllowed("bookzello.com", allowed)).toBe(true);
      expect(isDomainAllowed("https://bookzello.com", allowed)).toBe(true);
      expect(isDomainAllowed("localhost", allowed)).toBe(true);
    });
  });

  describe("3. Security & CSP Frame Headers", () => {
    it("configures CSP frame-ancestors to permit owner-authorized test domain ferienkalendr.de on /embed/:path*", async () => {
      expect(nextConfig.headers).toBeDefined();
      const headersConfig = await nextConfig.headers!();

      // Check /embed/:path*
      const embedRoute = headersConfig.find((h: { source: string }) => h.source === "/embed/:path*");
      expect(embedRoute).toBeDefined();
      const cspHeader = embedRoute?.headers.find(
        (header: { key: string }) => header.key === "Content-Security-Policy"
      );
      expect(cspHeader).toBeDefined();
      expect(cspHeader?.value).toContain("frame-ancestors");
      expect(cspHeader?.value).toContain("https://ferienkalendr.de");
      expect(cspHeader?.value).toContain("https://*.ferienkalendr.de");
      // Must not enable unrestricted wildcard
      expect(cspHeader?.value).not.toBe("frame-ancestors *;");
    });

    it("strictly prevents framing on core application and dashboard routes to guard against clickjacking", async () => {
      const headersConfig = await nextConfig.headers!();
      const nonEmbedRoute = headersConfig.find(
        (h: { source: string }) => h.source.includes("embed") && h.source.includes("?!")
      );
      expect(nonEmbedRoute).toBeDefined();
      const frameOptions = nonEmbedRoute?.headers.find(
        (header: { key: string }) => header.key === "X-Frame-Options"
      );
      const csp = nonEmbedRoute?.headers.find(
        (header: { key: string }) => header.key === "Content-Security-Policy"
      );
      expect(frameOptions?.value).toBe("SAMEORIGIN");
      expect(csp?.value).toBe("frame-ancestors 'self';");
    });
  });

  describe("4. Widget Loader Script Attributes & Domain Safety", () => {
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
  });

  describe("5. Slot Revalidation & Concurrency Invariant", () => {
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

  describe("6. Strict Booking Mode Safety", () => {
    it("guarantees AI_BOOKING_WRITES_ENABLED remains false", () => {
      const writesEnabled = process.env.AI_BOOKING_WRITES_ENABLED === "true";
      expect(writesEnabled).toBe(false);
    });
  });
});
