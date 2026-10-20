import { describe, it, expect } from "vitest";
import {
  serviceSchema,
  serviceCategorySchema,
} from "@/features/services/validation";
import {
  formatCurrency,
  parsePriceToMinorUnits,
} from "@/features/services/types";
import {
  staffProfileSchema,
  staffWorkingHourIntervalSchema,
  staffBreakSchema,
  staffTimeOffSchema,
  isBreakWithinWorkingHours,
} from "@/features/staff/validation";
import { hasOverlappingIntervals } from "@/features/organizations/validation";

describe("Phase 1D — Services & Pricing Validation", () => {
  it("converts decimal price strings to integer minor units", () => {
    expect(parsePriceToMinorUnits("20.00")).toBe(2000);
    expect(parsePriceToMinorUnits("10.50")).toBe(1050);
    expect(parsePriceToMinorUnits("0")).toBe(0);
    expect(parsePriceToMinorUnits("£25.99")).toBe(2599);
    expect(parsePriceToMinorUnits(15.75)).toBe(1575);
    expect(parsePriceToMinorUnits("-10")).toBe(0);
  });

  it("formats integer minor units to standard British Pound (GBP) currency string", () => {
    const formatted20 = formatCurrency(2000, "GBP");
    expect(formatted20).toContain("20.00");

    const formattedZero = formatCurrency(0, "GBP");
    expect(formattedZero).toContain("0.00");

    const formattedFraction = formatCurrency(2850, "GBP");
    expect(formattedFraction).toContain("28.50");
  });

  it("accepts valid service definitions (e.g. UK Barbershop services)", () => {
    const haircut = {
      name: "Men's Haircut",
      description: "Classic cut with clippers and scissors including rinse.",
      price_amount: 2000, // £20.00
      currency: "GBP",
      duration_minutes: 30,
      buffer_minutes: 5,
      is_active: true,
    };
    const res = serviceSchema.safeParse(haircut);
    expect(res.success).toBe(true);

    const beardTrim = {
      name: "Beard Trim & Sculpt",
      price_amount: 1000, // £10.00
      currency: "GBP",
      duration_minutes: 15,
      buffer_minutes: 0,
      is_active: true,
    };
    expect(serviceSchema.safeParse(beardTrim).success).toBe(true);
  });

  it("rejects negative prices and prices exceeding 1,000,000 minor units (£10,000)", () => {
    const negative = {
      name: "Bad Service",
      price_amount: -500,
      currency: "GBP",
      duration_minutes: 30,
      buffer_minutes: 0,
      is_active: true,
    };
    expect(serviceSchema.safeParse(negative).success).toBe(false);

    const oversized = {
      name: "Extravagant Service",
      price_amount: 1500000, // £15,000
      currency: "GBP",
      duration_minutes: 60,
      buffer_minutes: 0,
      is_active: true,
    };
    expect(serviceSchema.safeParse(oversized).success).toBe(false);
  });

  it("rejects zero or negative duration and enforces minimum 5 minutes", () => {
    const zeroDuration = {
      name: "Instant Service",
      price_amount: 1000,
      currency: "GBP",
      duration_minutes: 0,
      buffer_minutes: 0,
      is_active: true,
    };
    expect(serviceSchema.safeParse(zeroDuration).success).toBe(false);

    const negativeDuration = {
      ...zeroDuration,
      duration_minutes: -15,
    };
    expect(serviceSchema.safeParse(negativeDuration).success).toBe(false);
  });

  it("rejects invalid ISO currency codes", () => {
    const badCurrency = {
      name: "Valid Service",
      price_amount: 2000,
      currency: "TOOLONG",
      duration_minutes: 30,
      buffer_minutes: 0,
      is_active: true,
    };
    expect(serviceSchema.safeParse(badCurrency).success).toBe(false);
  });

  it("validates service categories", () => {
    expect(serviceCategorySchema.safeParse({ name: "Haircuts" }).success).toBe(true);
    expect(serviceCategorySchema.safeParse({ name: "Beard & Grooming" }).success).toBe(true);
    expect(serviceCategorySchema.safeParse({ name: "A" }).success).toBe(false); // too short
  });
});

describe("Phase 1D — Staff Management & Profiles", () => {
  it("accepts valid staff profile information", () => {
    const barber = {
      display_name: "Alex Harrison",
      professional_title: "Senior Master Barber",
      bio: "10+ years experience in traditional British barbering.",
      contact_email: "alex@salon.co.uk",
      contact_phone: "+44 7911 123456",
      is_active: true,
    };
    const res = staffProfileSchema.safeParse(barber);
    expect(res.success).toBe(true);
  });

  it("rejects empty or single-character staff display name", () => {
    expect(staffProfileSchema.safeParse({ display_name: "" }).success).toBe(false);
    expect(staffProfileSchema.safeParse({ display_name: "A" }).success).toBe(false);
  });

  it("validates international phone numbers for staff contact", () => {
    const validStaff = {
      display_name: "Emma Watson",
      contact_phone: "+44 7911 999888",
    };
    expect(staffProfileSchema.safeParse(validStaff).success).toBe(true);

    const invalidPhoneStaff = {
      display_name: "Emma Watson",
      contact_phone: "not-a-phone-number",
    };
    expect(staffProfileSchema.safeParse(invalidPhoneStaff).success).toBe(false);
  });
});

describe("Phase 1D — Staff Working Hours & Shift Intervals", () => {
  it("accepts valid working hours with open < close time", () => {
    const interval = {
      day_of_week: 1, // Monday
      is_working: true,
      open_time: "09:00",
      close_time: "17:00",
    };
    expect(staffWorkingHourIntervalSchema.safeParse(interval).success).toBe(true);
  });

  it("rejects working interval where close_time <= open_time", () => {
    const reversed = {
      day_of_week: 1,
      is_working: true,
      open_time: "17:00",
      close_time: "09:00",
    };
    expect(staffWorkingHourIntervalSchema.safeParse(reversed).success).toBe(false);

    const sameTime = {
      day_of_week: 1,
      is_working: true,
      open_time: "12:00",
      close_time: "12:00",
    };
    expect(staffWorkingHourIntervalSchema.safeParse(sameTime).success).toBe(false);
  });

  it("allows off-duty staff days with null times", () => {
    const offDay = {
      day_of_week: 0, // Sunday
      is_working: false,
      open_time: null,
      close_time: null,
    };
    expect(staffWorkingHourIntervalSchema.safeParse(offDay).success).toBe(true);
  });

  it("detects overlapping split shifts on the same day", () => {
    const splitShifts = [
      { open_time: "09:00", close_time: "13:00" },
      { open_time: "14:00", close_time: "18:00" },
    ];
    expect(hasOverlappingIntervals(splitShifts)).toBe(false);

    const overlappingSplit = [
      { open_time: "09:00", close_time: "13:30" },
      { open_time: "13:00", close_time: "17:00" },
    ];
    expect(hasOverlappingIntervals(overlappingSplit)).toBe(true);
  });
});

describe("Phase 1D — Staff Breaks & Boundary Verification", () => {
  it("validates staff break times", () => {
    const lunchBreak = {
      day_of_week: 1,
      break_title: "Lunch",
      start_time: "13:00",
      end_time: "14:00",
    };
    expect(staffBreakSchema.safeParse(lunchBreak).success).toBe(true);

    const invalidOrder = {
      day_of_week: 1,
      break_title: "Lunch",
      start_time: "14:00",
      end_time: "13:00",
    };
    expect(staffBreakSchema.safeParse(invalidOrder).success).toBe(false);
  });

  it("verifies that a break falls inside a working shift", () => {
    const workingHours = [
      { day_of_week: 1, is_working: true, open_time: "09:00", close_time: "17:00" },
    ];

    const validBreak = { day_of_week: 1, start_time: "12:00", end_time: "13:00" };
    expect(isBreakWithinWorkingHours(validBreak, workingHours)).toBe(true);

    // Break starting before shift begins
    const earlyBreak = { day_of_week: 1, start_time: "08:30", end_time: "09:30" };
    expect(isBreakWithinWorkingHours(earlyBreak, workingHours)).toBe(false);

    // Break on an off day
    const breakOnDayOff = { day_of_week: 0, start_time: "12:00", end_time: "13:00" };
    expect(isBreakWithinWorkingHours(breakOnDayOff, workingHours)).toBe(false);
  });
});

describe("Phase 1D — Staff Time Off & Leave", () => {
  it("accepts full-day vacation and sick leave with date bounds", () => {
    const vacation = {
      start_date: "2026-11-01",
      end_date: "2026-11-07",
      is_full_day: true,
      reason_type: "vacation" as const,
      notes: "Annual holiday",
    };
    expect(staffTimeOffSchema.safeParse(vacation).success).toBe(true);
  });

  it("rejects time off where end_date precedes start_date", () => {
    const invalidDates = {
      start_date: "2026-11-10",
      end_date: "2026-11-05",
      is_full_day: true,
      reason_type: "vacation" as const,
    };
    expect(staffTimeOffSchema.safeParse(invalidDates).success).toBe(false);
  });

  it("validates partial-day time off times", () => {
    const partialValid = {
      start_date: "2026-11-02",
      end_date: "2026-11-02",
      is_full_day: false,
      start_time: "10:00",
      end_time: "12:30",
      reason_type: "personal" as const,
    };
    expect(staffTimeOffSchema.safeParse(partialValid).success).toBe(true);

    const partialInvalidTime = {
      ...partialValid,
      start_time: "14:00",
      end_time: "13:00", // end before start
    };
    expect(staffTimeOffSchema.safeParse(partialInvalidTime).success).toBe(false);
  });
});
