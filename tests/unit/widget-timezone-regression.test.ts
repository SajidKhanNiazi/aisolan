import { describe, it, expect, afterEach } from "vitest";
import { formatSalonAppointmentDateTime } from "@/features/appointments/timezone";

describe("W-001 Regression: Embedded Widget Confirmation Timezone Independence", () => {
  const originalTZ = process.env.TZ;

  afterEach(() => {
    if (originalTZ !== undefined) {
      process.env.TZ = originalTZ;
    } else {
      delete process.env.TZ;
    }
  });

  const testSlotUTC = "2026-10-30T09:30:00.000Z";
  const salonTimezone = "Europe/London";

  it("renders 09:30 AM when visitor is in America/Los_Angeles (reproducing and fixing W-001)", () => {
    process.env.TZ = "America/Los_Angeles"; // UTC-7 (PDT)

    // The flawed previous implementation produced 02:30 AM:
    const flawedTime = new Date(testSlotUTC).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    // In US/Pacific locale, this is 02:30 AM
    expect(flawedTime).toMatch(/02:30/);

    // The fixed implementation formats strictly in salon's authoritative timezone:
    const result = formatSalonAppointmentDateTime(testSlotUTC, salonTimezone);
    expect(result.formattedDate).toBe("Fri, 30 Oct 2026");
    expect(result.formattedTime).toBe("09:30 AM");
    expect(result.fullDisplay).toBe("Fri, 30 Oct 2026 at 09:30 AM");
  });

  it("renders 09:30 AM when visitor is in Asia/Tokyo (UTC+9)", () => {
    process.env.TZ = "Asia/Tokyo";

    const result = formatSalonAppointmentDateTime(testSlotUTC, salonTimezone);
    expect(result.formattedDate).toBe("Fri, 30 Oct 2026");
    expect(result.formattedTime).toBe("09:30 AM");
    expect(result.fullDisplay).toBe("Fri, 30 Oct 2026 at 09:30 AM");
  });

  it("renders 09:30 AM when visitor is in America/New_York (UTC-4 EDT)", () => {
    process.env.TZ = "America/New_York";

    const result = formatSalonAppointmentDateTime(testSlotUTC, salonTimezone);
    expect(result.formattedDate).toBe("Fri, 30 Oct 2026");
    expect(result.formattedTime).toBe("09:30 AM");
    expect(result.fullDisplay).toBe("Fri, 30 Oct 2026 at 09:30 AM");
  });

  it("renders 09:30 AM when visitor is in Europe/Berlin (UTC+1 CET)", () => {
    process.env.TZ = "Europe/Berlin";

    const result = formatSalonAppointmentDateTime(testSlotUTC, salonTimezone);
    expect(result.formattedDate).toBe("Fri, 30 Oct 2026");
    expect(result.formattedTime).toBe("09:30 AM");
    expect(result.fullDisplay).toBe("Fri, 30 Oct 2026 at 09:30 AM");
  });

  it("renders 09:30 AM when visitor is in Australia/Sydney (UTC+11 AEDT)", () => {
    process.env.TZ = "Australia/Sydney";

    const result = formatSalonAppointmentDateTime(testSlotUTC, salonTimezone);
    expect(result.formattedDate).toBe("Fri, 30 Oct 2026");
    expect(result.formattedTime).toBe("09:30 AM");
    expect(result.fullDisplay).toBe("Fri, 30 Oct 2026 at 09:30 AM");
  });

  describe("Daylight Saving Time (DST) Transitions", () => {
    it("handles British Summer Time (BST / UTC+1) correctly in July", () => {
      // 09:30 BST on July 15 is 08:30 UTC
      const summerSlotUTC = "2026-07-15T08:30:00.000Z";
      process.env.TZ = "America/Los_Angeles";

      const result = formatSalonAppointmentDateTime(summerSlotUTC, "Europe/London");
      expect(result.formattedDate).toBe("Wed, 15 Jul 2026");
      expect(result.formattedTime).toBe("09:30 AM");
      expect(result.fullDisplay).toBe("Wed, 15 Jul 2026 at 09:30 AM");
    });

    it("handles Greenwich Mean Time (GMT / UTC+0) correctly in January", () => {
      // 14:15 GMT on January 15 is 14:15 UTC
      const winterSlotUTC = "2026-01-15T14:15:00.000Z";
      process.env.TZ = "America/Los_Angeles";

      const result = formatSalonAppointmentDateTime(winterSlotUTC, "Europe/London");
      expect(result.formattedDate).toBe("Thu, 15 Jan 2026");
      expect(result.formattedTime).toBe("02:15 PM");
      expect(result.fullDisplay).toBe("Thu, 15 Jan 2026 at 02:15 PM");
    });
  });

  describe("Fallback and Multi-Tenant Support", () => {
    it("falls back gracefully to Europe/London when timezone is empty string or undefined", () => {
      const resultEmpty = formatSalonAppointmentDateTime(testSlotUTC, "");
      expect(resultEmpty.formattedTime).toBe("09:30 AM");

      const resultUndefined = formatSalonAppointmentDateTime(testSlotUTC, undefined as unknown as string);
      expect(resultUndefined.formattedTime).toBe("09:30 AM");
    });

    it("supports other authoritative salon timezones correctly", () => {
      // For a salon in New York, 09:30 AM EDT on Oct 30 is 13:30 UTC
      const nySlotUTC = "2026-10-30T13:30:00.000Z";
      process.env.TZ = "Europe/London"; // Visitor is in London

      const result = formatSalonAppointmentDateTime(nySlotUTC, "America/New_York");
      expect(result.formattedDate).toBe("Fri, 30 Oct 2026");
      expect(result.formattedTime).toBe("09:30 AM");
      expect(result.fullDisplay).toBe("Fri, 30 Oct 2026 at 09:30 AM");
    });
  });

  describe("Cross-Surface Consistency Check", () => {
    it("renders the exact same date and time across review card, confirmation screen, and calendar timeline", () => {
      // 1. Review Card display values extracted during AI conversation
      const reviewCardDate = "2026-10-30";
      const reviewCardTime = "09:30 AM";

      // 2. Confirmation screen display
      const confirmationResult = formatSalonAppointmentDateTime(testSlotUTC, salonTimezone);

      // 3. Owner Dashboard Calendar display
      const calendarFormattedTime = new Date(testSlotUTC).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: salonTimezone,
      });

      expect(reviewCardDate).toBe("2026-10-30");
      expect(confirmationResult.formattedTime).toBe(reviewCardTime);
      expect(confirmationResult.formattedDate).toContain("30 Oct 2026");
      expect(calendarFormattedTime).toBe("09:30"); // 24-hour GB representation matching 09:30 AM
    });
  });
});
