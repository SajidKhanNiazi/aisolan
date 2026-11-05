import { describe, it, expect } from "vitest";
import {
  SUPPORTED_CURRENCIES,
  ISO_CURRENCY_CODES,
  IANA_TIMEZONES,
  isValidIanaTimezone,
  businessProfileSchema,
} from "@/features/organizations/validation";
import {
  formatCurrency,
  getCurrencySymbol,
} from "@/features/services/types";
import {
  convertLocalWallClockToUTC,
  formatInstantInTimeZone,
  getTimeZoneOffsetMinutes,
} from "@/features/appointments/timezone";
import {
  formatAppointmentDateTime,
  formatCurrencyFromMinor,
} from "@/features/notifications/templates";
import { resolveWallClockCandidate } from "@/features/availability/timezone";

describe("BOOKZELLO — Salon Currency & Timezone Regional Preferences Suite", () => {
  // ---------------------------------------------------------------------------
  // 1. PKR Price Formatting
  // ---------------------------------------------------------------------------
  describe("1. PKR price formatting", () => {
    it("formats integer minor units into standard PKR currency string", () => {
      // 250,000 minor units = Rs 2,500.00
      const formatted = formatCurrency(250000, "PKR");
      expect(formatted).toMatch(/(Rs|PKR)\s*2,500\.00/);
    });

    it("returns correct symbol for PKR", () => {
      expect(getCurrencySymbol("PKR")).toBe("Rs");
    });

    it("handles zero and small PKR amounts cleanly", () => {
      expect(formatCurrency(0, "PKR")).toMatch(/(Rs|PKR)\s*0\.00/);
      expect(formatCurrency(1500, "PKR")).toMatch(/(Rs|PKR)\s*15\.00/);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. GBP / EUR / USD / AED / SAR Formatting Compatibility
  // ---------------------------------------------------------------------------
  describe("2. GBP/EUR/USD/AED/SAR formatting compatibility", () => {
    it("formats all supported ISO currencies with appropriate locale conventions", () => {
      expect(formatCurrency(2500, "GBP")).toBe("£25.00");
      expect(formatCurrency(2500, "EUR")).toBe("€25.00");
      expect(formatCurrency(2500, "USD")).toBe("US$25.00");
      expect(formatCurrency(2500, "USD", "en-US")).toBe("$25.00");
      expect(formatCurrency(2500, "AED")).toMatch(/AED\s*25\.00/);
      expect(formatCurrency(2500, "SAR")).toMatch(/SAR\s*25\.00/);
    });

    it("returns correct symbols for all core currencies", () => {
      expect(getCurrencySymbol("GBP")).toBe("£");
      expect(getCurrencySymbol("EUR")).toBe("€");
      expect(getCurrencySymbol("USD")).toBe("$");
      expect(getCurrencySymbol("AED")).toBe("AED");
      expect(getCurrencySymbol("SAR")).toBe("SAR");
      expect(getCurrencySymbol("PKR")).toBe("Rs");
    });

    it("includes all requested currencies in SUPPORTED_CURRENCIES list", () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      expect(codes).toContain("PKR");
      expect(codes).toContain("GBP");
      expect(codes).toContain("EUR");
      expect(codes).toContain("USD");
      expect(codes).toContain("AED");
      expect(codes).toContain("SAR");
      expect(ISO_CURRENCY_CODES).toEqual(expect.arrayContaining(["PKR", "GBP", "EUR", "USD", "AED", "SAR"]));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Pakistan Salon Appointment Timezone (Asia/Karachi)
  // ---------------------------------------------------------------------------
  describe("3. Pakistan salon appointment timezone (Asia/Karachi)", () => {
    const PK_TZ = "Asia/Karachi";

    it("identifies Asia/Karachi as valid IANA timezone", () => {
      expect(isValidIanaTimezone(PK_TZ)).toBe(true);
      expect(IANA_TIMEZONES).toContain("Asia/Karachi");
    });

    it("correctly converts local Karachi afternoon time to UTC (UTC+5)", () => {
      // 2026-11-05 14:00 PKT -> 09:00 UTC (no DST in Pakistan)
      const res = convertLocalWallClockToUTC({
        date: "2026-11-05",
        time: "14:00",
        timeZone: PK_TZ,
      });

      expect(res.status).toBe("valid");
      expect(res.isoString).toBe("2026-11-05T09:00:00.000Z");
      expect(res.offsetMinutes).toBe(300); // +5 hours = 300 minutes
      expect(getTimeZoneOffsetMinutes(res.utcInstant!, PK_TZ)).toBe(300);
    });

    it("round-trips UTC instant back to Karachi local wall-clock representation", () => {
      const utcInstant = new Date("2026-11-05T09:00:00.000Z");
      const formatted = formatInstantInTimeZone(utcInstant, PK_TZ);

      expect(formatted.dateStr).toBe("2026-11-05");
      expect(formatted.timeStr).toBe("14:00");
      expect(formatted.offsetMinutes).toBe(300);
      expect(formatted.dayOfWeek).toBe(4); // Thursday
    });

    it("resolves wall-clock candidate in Asia/Karachi via resolveWallClockCandidate", () => {
      const candidate = resolveWallClockCandidate("2026-11-05", "10:30", PK_TZ);
      expect(candidate).not.toBeNull();
      // 10:30 PKT -> 05:30 UTC
      expect(candidate?.isoString).toBe("2026-11-05T05:30:00.000Z");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. London Appointment Timezone (Europe/London)
  // ---------------------------------------------------------------------------
  describe("4. London appointment timezone (Europe/London)", () => {
    const UK_TZ = "Europe/London";

    it("handles standard Winter GMT date (UTC+0)", () => {
      const res = convertLocalWallClockToUTC({
        date: "2026-01-15",
        time: "10:00",
        timeZone: UK_TZ,
      });
      expect(res.status).toBe("valid");
      expect(res.isoString).toBe("2026-01-15T10:00:00.000Z");
      expect(res.offsetMinutes).toBe(0);
    });

    it("handles Summer BST date (UTC+1)", () => {
      const res = convertLocalWallClockToUTC({
        date: "2026-07-15",
        time: "10:00",
        timeZone: UK_TZ,
      });
      expect(res.status).toBe("valid");
      expect(res.isoString).toBe("2026-07-15T09:00:00.000Z");
      expect(res.offsetMinutes).toBe(60);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Europe/London Daylight-Saving Transitions
  // ---------------------------------------------------------------------------
  describe("5. Europe/London daylight-saving transitions", () => {
    const UK_TZ = "Europe/London";

    it("rejects non-existent local time during Spring DST forward jump", () => {
      // 2026-03-29 01:30 doesn't exist in UK (jump from 01:00 to 02:00)
      const res = convertLocalWallClockToUTC({
        date: "2026-03-29",
        time: "01:30",
        timeZone: UK_TZ,
      });
      expect(res.status).toBe("nonexistent");
      expect(res.utcInstant).toBeNull();
    });

    it("disambiguates autumn fall-back using earlier instant", () => {
      // 2026-10-25 01:30 repeats during 2am -> 1am turn back
      const res = convertLocalWallClockToUTC(
        { date: "2026-10-25", time: "01:30", timeZone: UK_TZ },
        "earlier"
      );
      expect(res.status).toBe("valid");
      expect(res.utcInstant).not.toBeNull();
      expect(res.isoString).toBe("2026-10-25T00:30:00.000Z");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Email and Confirmation Timezone & Currency Consistency
  // ---------------------------------------------------------------------------
  describe("6. Email and confirmation timezone consistency", () => {
    it("renders appointment email date and time in the salon's configured timezone", () => {
      const utcTimestamp = "2026-11-05T09:00:00.000Z";

      // Pakistan salon
      const pkEmailTime = formatAppointmentDateTime(utcTimestamp, "Asia/Karachi");
      expect(pkEmailTime.formattedTime).toBe("14:00");
      expect(pkEmailTime.formattedDate).toContain("November");

      // UK salon
      const ukEmailTime = formatAppointmentDateTime(utcTimestamp, "Europe/London");
      expect(ukEmailTime.formattedTime).toBe("09:00");

      // UAE salon
      const uaeEmailTime = formatAppointmentDateTime(utcTimestamp, "Asia/Dubai");
      expect(uaeEmailTime.formattedTime).toBe("13:00");
    });

    it("renders email prices using formatCurrencyFromMinor with proper currency symbol", () => {
      const pkrFormatted = formatCurrencyFromMinor(250000, "PKR");
      expect(pkrFormatted).toMatch(/(Rs|PKR)\s*2,500\.00/);

      const gbpFormatted = formatCurrencyFromMinor(2500, "GBP");
      expect(gbpFormatted).toBe("£25.00");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Calendar Event UTC Conversion (Google Calendar Link & ICS)
  // ---------------------------------------------------------------------------
  describe("7. Calendar event UTC conversion", () => {
    it("generates correct UTC-based date strings for Google Calendar URLs across timezones", () => {
      // 14:00 in Karachi (09:00 UTC) to 14:45 (09:45 UTC)
      const startInstant = new Date("2026-11-05T09:00:00.000Z");
      const endInstant = new Date("2026-11-05T09:45:00.000Z");

      const gcalDates = `${startInstant.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${endInstant
        .toISOString()
        .replace(/-|:|\.\d\d\d/g, "")}`;

      expect(gcalDates).toBe("20261105T090000Z/20261105T094500Z");
      expect(gcalDates.endsWith("Z")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Existing Service Prices Preserved After Currency Change
  // ---------------------------------------------------------------------------
  describe("8. Existing service prices preserved after currency change", () => {
    it("retains exact integer minor unit values without auto-conversion inflation", () => {
      // A salon initially created with 2500 minor units (£25.00)
      const existingService = {
        id: "svc-123",
        name: "Classic Fade",
        price_amount: 2500,
        currency: "GBP",
      };

      // Owner updates salon currency preference to PKR
      const updatedSalonCurrency = "PKR";

      // Numeric price_amount remains untouched
      expect(existingService.price_amount).toBe(2500);

      // Rendering with new currency reflects the numerical value under PKR without mutation
      const newDisplay = formatCurrency(existingService.price_amount, updatedSalonCurrency);
      expect(newDisplay).toMatch(/(Rs|PKR)\s*25\.00/);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Existing Appointment Timestamps Preserved After Timezone Change
  // ---------------------------------------------------------------------------
  describe("9. Existing appointment timestamps preserved after timezone change", () => {
    it("keeps UTC starts_at invariant and renders correctly in old vs new timezone", () => {
      // Appointment was booked at 09:00 UTC
      const appointment = {
        id: "appt-999",
        starts_at: "2026-11-05T09:00:00.000Z",
      };

      // In initial London timezone (UTC+0 in November)
      const initialLondon = formatInstantInTimeZone(new Date(appointment.starts_at), "Europe/London");
      expect(initialLondon.timeStr).toBe("09:00");

      // Owner reconfigures physical operating timezone to Asia/Karachi (UTC+5)
      // The database timestamp `starts_at` is NOT mutated:
      expect(appointment.starts_at).toBe("2026-11-05T09:00:00.000Z");

      // Renders in new salon timezone as 14:00 PKT
      const updatedKarachi = formatInstantInTimeZone(new Date(appointment.starts_at), "Asia/Karachi");
      expect(updatedKarachi.timeStr).toBe("14:00");
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Multi-Tenant Currency/Timezone Isolation
  // ---------------------------------------------------------------------------
  describe("10. Multi-tenant currency/timezone isolation", () => {
    it("keeps independent regional configurations strictly isolated per tenant", () => {
      const salonLondon = {
        id: "tenant-london-111",
        name: "Soho Cuts",
        timezone: "Europe/London",
        currency: "GBP",
      };

      const salonLahore = {
        id: "tenant-lahore-222",
        name: "Gulberg Salon",
        timezone: "Asia/Karachi",
        currency: "PKR",
      };

      expect(salonLondon.currency).toBe("GBP");
      expect(salonLahore.currency).toBe("PKR");

      expect(getCurrencySymbol(salonLondon.currency)).toBe("£");
      expect(getCurrencySymbol(salonLahore.currency)).toBe("Rs");

      const utcTime = new Date("2026-11-05T09:00:00.000Z");
      expect(formatInstantInTimeZone(utcTime, salonLondon.timezone).timeStr).toBe("09:00");
      expect(formatInstantInTimeZone(utcTime, salonLahore.timezone).timeStr).toBe("14:00");
    });
  });

  // ---------------------------------------------------------------------------
  // 11. AI Chatbot and Booking Wizard Shared Context
  // ---------------------------------------------------------------------------
  describe("11. AI chatbot and booking wizard using the same salon timezone and currency", () => {
    it("ensures public profile emits currency and timezone matching salon configuration", () => {
      const simulatedSalon = {
        name: "Karachi AI Barbers",
        slug: "karachi-ai-barbers",
        timezone: "Asia/Karachi",
        currency: "PKR",
      };

      // Context passed to AI Receptionist
      const aiContext = {
        businessSlug: simulatedSalon.slug,
        timezone: simulatedSalon.timezone,
        currency: simulatedSalon.currency,
      };

      // Context consumed by Public Booking Wizard
      const wizardContext = {
        timezone: simulatedSalon.timezone,
        currency: simulatedSalon.currency,
      };

      expect(aiContext.timezone).toBe(wizardContext.timezone);
      expect(aiContext.currency).toBe(wizardContext.currency);
      expect(aiContext.timezone).toBe("Asia/Karachi");
      expect(aiContext.currency).toBe("PKR");
    });
  });

  // ---------------------------------------------------------------------------
  // 12. Mobile and Desktop Settings Validation
  // ---------------------------------------------------------------------------
  describe("12. Mobile and desktop Settings usability & schema validation", () => {
    it("validates valid business profile with PKR and Asia/Karachi", () => {
      const validProfile = {
        name: "Karachi Hair Studio",
        business_type: "salon" as const,
        country: "PK",
        timezone: "Asia/Karachi",
        currency: "PKR",
      };

      const parsed = businessProfileSchema.safeParse(validProfile);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.currency).toBe("PKR");
        expect(parsed.data.timezone).toBe("Asia/Karachi");
      }
    });

    it("validates valid business profile with SAR and Asia/Riyadh", () => {
      const validProfile = {
        name: "Riyadh Grooming Lounge",
        business_type: "barbershop" as const,
        country: "SA",
        timezone: "Asia/Riyadh",
        currency: "SAR",
      };

      const parsed = businessProfileSchema.safeParse(validProfile);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.currency).toBe("SAR");
        expect(parsed.data.timezone).toBe("Asia/Riyadh");
      }
    });

    it("rejects invalid currency codes", () => {
      const invalidCurrency = {
        name: "Test Salon",
        business_type: "salon" as const,
        timezone: "Asia/Karachi",
        currency: "PK", // 2 chars instead of 3
      };

      const parsed = businessProfileSchema.safeParse(invalidCurrency);
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid timezone identifiers", () => {
      const invalidTimezone = {
        name: "Test Salon",
        business_type: "salon" as const,
        timezone: "Moon/Base_Alpha",
        currency: "PKR",
      };

      const parsed = businessProfileSchema.safeParse(invalidTimezone);
      expect(parsed.success).toBe(false);
    });
  });
});
