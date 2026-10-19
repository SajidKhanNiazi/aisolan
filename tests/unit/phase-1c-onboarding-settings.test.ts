import { describe, it, expect } from "vitest";
import {
  businessProfileSchema,
  weeklyOpeningHoursSchema,
  openingHourIntervalSchema,
  scheduleExceptionSchema,
  bookingPolicySchema,
  onboardingProgressSchema,
  isValidIanaTimezone,
  timeStringToMinutes,
  hasOverlappingIntervals,
  internationalPhoneRegex,
} from "@/features/organizations/validation";
import type { OpeningHourInterval } from "@/features/organizations/types";

describe("Phase 1C — Business Onboarding & Settings Validation Suite", () => {
  describe("1. Business Profile Schema & Phone/URL/Timezone Validation", () => {
    it("accepts a fully-populated valid business profile", () => {
      const validProfile = {
        name: "Savile Row Master Barbers",
        business_type: "barbershop" as const,
        description: "Bespoke traditional grooming in Mayfair, London.",
        logo_url: "https://example.com/logos/savile-row.png",
        phone: "+44 20 7946 0912",
        email: "bookings@savilerowbarbers.co.uk",
        website: "https://savilerowbarbers.co.uk",
        address_line1: "12 Savile Row",
        address_line2: "Suite 3",
        city: "London",
        state_region: "Greater London",
        postal_code: "W1S 3PR",
        country: "GB",
        timezone: "Europe/London",
      };

      const result = businessProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it("accepts minimal profile with optional fields left blank or null", () => {
      const minimalProfile = {
        name: "Quick Cuts",
        business_type: "salon" as const,
        description: "",
        logo_url: "",
        phone: "",
        email: "",
        website: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state_region: "",
        postal_code: "",
        country: "GB",
        timezone: "UTC",
      };

      const result = businessProfileSchema.safeParse(minimalProfile);
      expect(result.success).toBe(true);
    });

    it("validates international phone numbers correctly", () => {
      const validPhones = [
        "+44 7911 123456",
        "+1 555 123 4567",
        "+92 300 1234567",
        "+33 1 42 68 55 55",
        "+49 30 123456",
        "+61 2 9374 4000",
      ];

      for (const phone of validPhones) {
        expect(internationalPhoneRegex.test(phone.replace(/\s+/g, ""))).toBe(true);
        const res = businessProfileSchema.safeParse({
          name: "Test Salon",
          business_type: "salon",
          phone,
          timezone: "UTC",
          country: "GB",
        });
        expect(res.success).toBe(true);
      }
    });

    it("rejects invalid phone numbers", () => {
      const invalidPhones = ["abc-not-a-phone", "00000", "++44123", "+0123456"];
      for (const phone of invalidPhones) {
        const res = businessProfileSchema.safeParse({
          name: "Test Salon",
          business_type: "salon",
          phone,
          timezone: "UTC",
          country: "GB",
        });
        expect(res.success).toBe(false);
      }
    });

    it("validates website URLs", () => {
      const validWebsites = ["https://mybarbershop.com", "http://salon.co.uk", "https://sub.domain.org/path"];
      for (const website of validWebsites) {
        const res = businessProfileSchema.safeParse({
          name: "Test Salon",
          business_type: "salon",
          website,
          timezone: "UTC",
          country: "GB",
        });
        expect(res.success).toBe(true);
      }

      const invalidWebsites = ["not-a-url", "ftp://bad-scheme", "www.missing-protocol.com"];
      for (const website of invalidWebsites) {
        const res = businessProfileSchema.safeParse({
          name: "Test Salon",
          business_type: "salon",
          website,
          timezone: "UTC",
          country: "GB",
        });
        expect(res.success).toBe(false);
      }
    });

    it("validates IANA timezones and rejects invalid identifiers", () => {
      expect(isValidIanaTimezone("Europe/London")).toBe(true);
      expect(isValidIanaTimezone("America/New_York")).toBe(true);
      expect(isValidIanaTimezone("Asia/Karachi")).toBe(true);
      expect(isValidIanaTimezone("UTC")).toBe(true);
      expect(isValidIanaTimezone("Asia/Dubai")).toBe(true);

      expect(isValidIanaTimezone("Mars/Base")).toBe(false);
      expect(isValidIanaTimezone("Not/A_Timezone")).toBe(false);
      expect(isValidIanaTimezone("")).toBe(false);
    });
  });

  describe("2. Time Utilities & Schedule Overlap Logic", () => {
    it("converts HH:MM strings to minutes from midnight", () => {
      expect(timeStringToMinutes("00:00")).toBe(0);
      expect(timeStringToMinutes("09:00")).toBe(540);
      expect(timeStringToMinutes("13:30")).toBe(810);
      expect(timeStringToMinutes("23:59")).toBe(1439);
    });

    it("detects disjoint non-overlapping intervals correctly", () => {
      const nonOverlapping = [
        { open_time: "09:00", close_time: "13:00" },
        { open_time: "14:00", close_time: "18:00" },
      ];
      expect(hasOverlappingIntervals(nonOverlapping)).toBe(false);

      const adjacentIntervals = [
        { open_time: "09:00", close_time: "12:00" },
        { open_time: "12:00", close_time: "17:00" },
      ];
      expect(hasOverlappingIntervals(adjacentIntervals)).toBe(false);
    });

    it("detects overlapping intervals correctly", () => {
      const overlapping1 = [
        { open_time: "09:00", close_time: "13:00" },
        { open_time: "12:00", close_time: "15:00" }, // starts before 13:00!
      ];
      expect(hasOverlappingIntervals(overlapping1)).toBe(true);

      const completelyEnclosed = [
        { open_time: "08:00", close_time: "20:00" },
        { open_time: "10:00", close_time: "14:00" },
      ];
      expect(hasOverlappingIntervals(completelyEnclosed)).toBe(true);
    });
  });

  describe("3. Weekly Opening Hours Schema Validation", () => {
    it("accepts a standard valid 7-day schedule with multiple intervals", () => {
      const schedule: OpeningHourInterval[] = [
        // Monday with split shift (09:00-13:00 and 14:00-18:00)
        { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "13:00" },
        { day_of_week: 1, is_closed: false, open_time: "14:00", close_time: "18:00" },
        // Tuesday-Friday 09:00-17:00
        { day_of_week: 2, is_closed: false, open_time: "09:00", close_time: "17:00" },
        { day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "17:00" },
        { day_of_week: 4, is_closed: false, open_time: "09:00", close_time: "17:00" },
        { day_of_week: 5, is_closed: false, open_time: "09:00", close_time: "17:00" },
        // Saturday 10:00-16:00
        { day_of_week: 6, is_closed: false, open_time: "10:00", close_time: "16:00" },
        // Sunday closed
        { day_of_week: 0, is_closed: true, open_time: null, close_time: null },
      ];

      const result = weeklyOpeningHoursSchema.safeParse(schedule);
      expect(result.success).toBe(true);
    });

    it("rejects intervals where close_time precedes or equals open_time", () => {
      const invalidSingle = {
        day_of_week: 1,
        is_closed: false,
        open_time: "17:00",
        close_time: "09:00",
      };
      const result = openingHourIntervalSchema.safeParse(invalidSingle);
      expect(result.success).toBe(false);

      const equalTime = {
        day_of_week: 1,
        is_closed: false,
        open_time: "12:00",
        close_time: "12:00",
      };
      const resultEqual = openingHourIntervalSchema.safeParse(equalTime);
      expect(resultEqual.success).toBe(false);
    });

    it("rejects weekly schedule with overlapping intervals on the same day", () => {
      const overlappingSchedule = [
        { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "14:00" },
        { day_of_week: 1, is_closed: false, open_time: "13:00", close_time: "17:00" }, // overlap 13:00-14:00
      ];

      const result = weeklyOpeningHoursSchema.safeParse(overlappingSchedule);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/overlapping intervals/i);
      }
    });
  });

  describe("4. Schedule Exceptions & Holidays Validation", () => {
    it("accepts full-day holiday closure with reason label", () => {
      const holiday = {
        exception_date: "2026-12-25",
        is_closed: true,
        open_time: null,
        close_time: null,
        reason: "Christmas Day Bank Holiday",
      };
      const result = scheduleExceptionSchema.safeParse(holiday);
      expect(result.success).toBe(true);
    });

    it("accepts date-specific special opening hours", () => {
      const specialHours = {
        exception_date: "2026-12-24",
        is_closed: false,
        open_time: "08:00",
        close_time: "13:00",
        reason: "Christmas Eve Special Early Shift",
      };
      const result = scheduleExceptionSchema.safeParse(specialHours);
      expect(result.success).toBe(true);
    });

    it("rejects special hours with closing before opening", () => {
      const invalidSpecial = {
        exception_date: "2026-12-24",
        is_closed: false,
        open_time: "15:00",
        close_time: "10:00",
        reason: "Invalid shift",
      };
      const result = scheduleExceptionSchema.safeParse(invalidSpecial);
      expect(result.success).toBe(false);
    });

    it("rejects invalid date format", () => {
      const invalidDate = {
        exception_date: "25/12/2026", // Not YYYY-MM-DD
        is_closed: true,
      };
      const result = scheduleExceptionSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });
  });

  describe("5. Booking Policy Validation", () => {
    it("accepts valid booking policy settings", () => {
      const validPolicy = {
        min_notice_hours: 2,
        max_advance_days: 60,
        cancellation_notice_hours: 24,
        default_buffer_minutes: 15,
        online_booking_enabled: false,
        cancellation_policy_text: "Free cancellation up to 24 hours prior to appointment.",
      };
      const result = bookingPolicySchema.safeParse(validPolicy);
      expect(result.success).toBe(true);
    });

    it("rejects negative lead times or extreme windows", () => {
      const negativeNotice = {
        min_notice_hours: -1,
        max_advance_days: 60,
        cancellation_notice_hours: 24,
        default_buffer_minutes: 10,
        online_booking_enabled: false,
      };
      expect(bookingPolicySchema.safeParse(negativeNotice).success).toBe(false);

      const excessiveWindow = {
        min_notice_hours: 2,
        max_advance_days: 500, // max 365
        cancellation_notice_hours: 24,
        default_buffer_minutes: 10,
        online_booking_enabled: false,
      };
      expect(bookingPolicySchema.safeParse(excessiveWindow).success).toBe(false);
    });
  });

  describe("6. Onboarding Progress Validation", () => {
    it("accepts valid onboarding progress steps", () => {
      const progress = {
        current_step: 3,
        completed_steps: [1, 2],
        is_completed: false,
      };
      const result = onboardingProgressSchema.safeParse(progress);
      expect(result.success).toBe(true);
    });

    it("rejects out-of-range steps", () => {
      const invalidStep = {
        current_step: 6, // max 5
        completed_steps: [1, 2],
        is_completed: false,
      };
      expect(onboardingProgressSchema.safeParse(invalidStep).success).toBe(false);
    });
  });

  describe("7. Role Authorization & Cross-Tenant Security Invariants", () => {
    interface SimulatedMembership {
      businessId: string;
      userId: string;
      role: "owner" | "manager" | "staff";
    }

    const memberships: SimulatedMembership[] = [
      { businessId: "biz-1", userId: "user-owner-1", role: "owner" },
      { businessId: "biz-1", userId: "user-manager-1", role: "manager" },
      { businessId: "biz-1", userId: "user-staff-1", role: "staff" },
      { businessId: "biz-2", userId: "user-owner-2", role: "owner" },
    ];

    function checkCanEditSettings(userId: string, targetBusinessId: string): boolean {
      const mem = memberships.find((m) => m.userId === userId && m.businessId === targetBusinessId);
      return mem?.role === "owner";
    }

    it("authorizes business owner to update settings", () => {
      expect(checkCanEditSettings("user-owner-1", "biz-1")).toBe(true);
      expect(checkCanEditSettings("user-owner-2", "biz-2")).toBe(true);
    });

    it("denies manager and staff from modifying business settings", () => {
      expect(checkCanEditSettings("user-manager-1", "biz-1")).toBe(false);
      expect(checkCanEditSettings("user-staff-1", "biz-1")).toBe(false);
    });

    it("strictly prevents cross-tenant settings edits (Owner 2 modifying Biz 1)", () => {
      expect(checkCanEditSettings("user-owner-2", "biz-1")).toBe(false);
      expect(checkCanEditSettings("user-owner-1", "biz-2")).toBe(false);
    });

    it("strictly validates logo upload storage path isolation", () => {
      const allowedPathForBiz1 = "biz-1/logo-1729000000.png";
      const crossTenantPath = "biz-2/logo-1729000000.png";

      const extractBusinessIdFromPath = (path: string) => path.split("/")[0];

      expect(extractBusinessIdFromPath(allowedPathForBiz1)).toBe("biz-1");
      expect(checkCanEditSettings("user-owner-1", extractBusinessIdFromPath(allowedPathForBiz1))).toBe(true);

      // Attempt by user-owner-1 to write to biz-2's folder
      expect(checkCanEditSettings("user-owner-1", extractBusinessIdFromPath(crossTenantPath))).toBe(false);
    });
  });
});
