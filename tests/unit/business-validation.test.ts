import { describe, it, expect } from "vitest";
import {
  createBusinessSchema,
  updateProfileSchema,
} from "@/features/organizations/validation";

describe("Phase 1B — Business & Profile Validation Schemas", () => {
  describe("createBusinessSchema", () => {
    it("accepts valid business workspace input", () => {
      const valid = {
        name: "Elite Cuts & Shave",
        slug: "elite-cuts-and-shave",
        business_type: "barbershop" as const,
      };
      const result = createBusinessSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects short business names", () => {
      const result = createBusinessSchema.safeParse({
        name: "A",
        slug: "valid-slug",
        business_type: "salon" as const,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/at least 2 characters/i);
      }
    });

    it("rejects invalid slugs with uppercase or special characters", () => {
      const invalidSlugs = [
        "EliteCuts",
        "elite_cuts",
        "-elite-cuts",
        "elite-cuts-",
        "elite--cuts",
        "elite cuts",
        "elite!",
      ];

      for (const slug of invalidSlugs) {
        const result = createBusinessSchema.safeParse({
          name: "Elite Cuts",
          slug,
          business_type: "salon" as const,
        });
        expect(result.success).toBe(false);
      }
    });

    it("accepts clean normalized hyphenated slugs", () => {
      const validSlugs = [
        "elite-cuts",
        "salon-101",
        "barber-shop-nyc-2",
        "hair",
      ];

      for (const slug of validSlugs) {
        const result = createBusinessSchema.safeParse({
          name: "Elite Cuts",
          slug,
          business_type: "salon" as const,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects unsupported business types", () => {
      const result = createBusinessSchema.safeParse({
        name: "Elite Cuts",
        slug: "elite-cuts",
        business_type: "crypto_exchange" as unknown as "salon",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateProfileSchema", () => {
    it("accepts valid profile name and valid avatar URL", () => {
      const result = updateProfileSchema.safeParse({
        full_name: "John Master Barber",
        avatar_url: "https://example.com/avatar.png",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null avatar URL", () => {
      const result = updateProfileSchema.safeParse({
        full_name: "John Master Barber",
        avatar_url: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid avatar URL", () => {
      const result = updateProfileSchema.safeParse({
        full_name: "John Master Barber",
        avatar_url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });
  });
});
