import { describe, it, expect } from "vitest";
import { isValidTimezone } from "@/features/organizations/readiness";
import { calculateAvailableSlots } from "@/features/availability/engine";
import type { PureCalculationContext } from "@/features/availability/types";

describe("Phase 1H-D24: Universal Salon Onboarding & Booking Readiness Suite", () => {
  // Shared base timestamp: 2026-11-03 08:00:00 UTC (Tuesday)
  const baseNow = new Date("2026-11-03T08:00:00.000Z");

  const defaultPolicy = {
    min_notice_hours: 1,
    max_advance_days: 60,
    online_booking_enabled: true,
  };

  // Weekly opening hours: Tuesday 09:00 - 18:00 (day_of_week: 2)
  const tuesdayHours = [
    { day_of_week: 2, is_closed: false, open_time: "09:00", close_time: "18:00" },
  ];

  describe("1. Timezone Validation Engine", () => {
    it("accepts valid IANA timezones", async () => {
      expect(await isValidTimezone("Europe/London")).toBe(true);
      expect(await isValidTimezone("America/New_York")).toBe(true);
      expect(await isValidTimezone("Asia/Tokyo")).toBe(true);
      expect(await isValidTimezone("UTC")).toBe(true);
      expect(await isValidTimezone("Asia/Dubai")).toBe(true);
      expect(await isValidTimezone("Australia/Sydney")).toBe(true);
    });

    it("rejects non-existent, malformed, or blank timezones", async () => {
      expect(await isValidTimezone("Mars/Curiosity")).toBe(false);
      expect(await isValidTimezone("Not/A_Timezone")).toBe(false);
      expect(await isValidTimezone("")).toBe(false);
      expect(await isValidTimezone(null)).toBe(false);
      expect(await isValidTimezone(undefined)).toBe(false);
      expect(await isValidTimezone("   ")).toBe(false);
    });
  });

  describe("2. Fixture A: Solo Owner-Operated Salon", () => {
    const soloStaff = [
      { id: "owner-1", display_name: "Marco Owner", display_order: 1, is_active: true, is_archived: false },
    ];
    const soloWorkingHours = [
      { staff_id: "owner-1", day_of_week: 2, is_working: true, open_time: "09:00", close_time: "17:00" },
    ];
    const haircutService = {
      id: "srv-cut",
      name: "Precision Cut",
      duration_minutes: 30,
      buffer_minutes: 0,
      is_active: true,
      is_archived: false,
    };

    it("generates slots for solo owner without requiring customer to choose staff", () => {
      const ctx: PureCalculationContext = {
        date: "2026-11-03",
        timezone: "Europe/London",
        now: baseNow,
        bookingPolicy: defaultPolicy,
        service: haircutService,
        staffMembers: soloStaff,
        businessOpeningHours: tuesdayHours,
        businessExceptions: [],
        staffWorkingHours: soloWorkingHours,
        staffBreaks: [],
        staffTimeOff: [],
        existingAppointments: [],
        staffPreference: "any",
        selectedStaffId: null,
        slotIntervalMinutes: 30,
      };

      const slots = calculateAvailableSlots(ctx);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].localTime).toBe("09:00");
      expect(slots[0].availableStaffIds).toEqual(["owner-1"]);

      // Verify identical availability if staff is explicitly selected vs 'any'
      const specificCtx: PureCalculationContext = {
        ...ctx,
        staffPreference: "specific",
        selectedStaffId: "owner-1",
      };
      const specificSlots = calculateAvailableSlots(specificCtx);
      expect(slots.length).toBe(specificSlots.length);
      expect(slots.map((s) => s.localTime)).toEqual(specificSlots.map((s) => s.localTime));
    });
  });

  describe("3. Fixture B: Two-Professional Barbershop (Combined & Deduplicated Capacity)", () => {
    const twoStaff = [
      { id: "barber-dan", display_name: "Dan Barber", display_order: 1, is_active: true, is_archived: false },
      { id: "barber-lee", display_name: "Lee Barber", display_order: 2, is_active: true, is_archived: false },
    ];

    // Dan works 09:00 - 13:00; Lee works 12:00 - 18:00 (overlapping 12:00 - 13:00)
    const splitStaffHours = [
      { staff_id: "barber-dan", day_of_week: 2, is_working: true, open_time: "09:00", close_time: "13:00" },
      { staff_id: "barber-lee", day_of_week: 2, is_working: true, open_time: "12:00", close_time: "18:00" },
    ];

    const haircutService = {
      id: "srv-cut",
      name: "Haircut",
      duration_minutes: 30,
      buffer_minutes: 0,
      is_active: true,
      is_archived: false,
    };

    it("seamlessly merges schedules and deduplicates slots across both barbers", () => {
      const ctx: PureCalculationContext = {
        date: "2026-11-03",
        timezone: "Europe/London",
        now: baseNow,
        bookingPolicy: defaultPolicy,
        service: haircutService,
        staffMembers: twoStaff,
        businessOpeningHours: tuesdayHours,
        businessExceptions: [],
        staffWorkingHours: splitStaffHours,
        staffBreaks: [],
        staffTimeOff: [],
        existingAppointments: [],
        staffPreference: "any",
        selectedStaffId: null,
        slotIntervalMinutes: 30,
      };

      const slots = calculateAvailableSlots(ctx);
      const times = slots.map((s) => s.localTime);

      // Unique chronological slots spanning 09:00 through 17:30
      expect(new Set(times).size).toBe(times.length);
      expect(times[0]).toBe("09:00");
      expect(times[times.length - 1]).toBe("17:30");

      // Overlap period: 12:00 and 12:30 have BOTH barbers available
      const slot1200 = slots.find((s) => s.localTime === "12:00");
      expect(slot1200?.availableStaffIds).toContain("barber-dan");
      expect(slot1200?.availableStaffIds).toContain("barber-lee");
    });
  });

  describe("4. Fixture C: Large Multi-Staff Salon with Turnaround Buffers", () => {
    const fiveStaff = Array.from({ length: 5 }, (_, i) => ({
      id: `stylist-${i + 1}`,
      display_name: `Stylist ${i + 1}`,
      display_order: i + 1,
      is_active: true,
      is_archived: false,
    }));

    const fullStaffHours = fiveStaff.map((st) => ({
      staff_id: st.id,
      day_of_week: 2,
      is_working: true,
      open_time: "09:00",
      close_time: "18:00",
    }));

    const treatmentWithBuffer = {
      id: "srv-color",
      name: "Balayage & Treatment",
      duration_minutes: 90,
      buffer_minutes: 15, // 105 mins occupied
      is_active: true,
      is_archived: false,
    };

    it("respects service buffer containment within salon opening hours", () => {
      const ctx: PureCalculationContext = {
        date: "2026-11-03",
        timezone: "Europe/London",
        now: baseNow,
        bookingPolicy: defaultPolicy,
        service: treatmentWithBuffer,
        staffMembers: fiveStaff,
        businessOpeningHours: tuesdayHours, // closes at 18:00
        businessExceptions: [],
        staffWorkingHours: fullStaffHours,
        staffBreaks: [],
        staffTimeOff: [],
        existingAppointments: [],
        staffPreference: "any",
        selectedStaffId: null,
        slotIntervalMinutes: 30,
      };

      const slots = calculateAvailableSlots(ctx);
      // Last candidate must ensure occupied end (start + 90 + 15) <= 18:00
      // 16:00 + 105 mins = 17:45 <= 18:00 (Valid)
      // 16:30 + 105 mins = 18:15 > 18:00 (Invalid!)
      const latestSlot = slots[slots.length - 1];
      expect(latestSlot.localTime).toBe("16:00");
      expect(new Date(latestSlot.occupiedEndsAt).getUTCHours()).toBeLessThanOrEqual(18);
    });
  });

  describe("5. Fixture D & E: Specialized Service and Zero Eligible Staff", () => {
    it("returns zero slots when service has 0 eligible staff configured", () => {
      const ctx: PureCalculationContext = {
        date: "2026-11-03",
        timezone: "Europe/London",
        now: baseNow,
        bookingPolicy: defaultPolicy,
        service: {
          id: "srv-unassigned",
          name: "Unassigned Laser Treatment",
          duration_minutes: 45,
          buffer_minutes: 0,
          is_active: true,
          is_archived: false,
        },
        staffMembers: [], // Zero eligible staff
        businessOpeningHours: tuesdayHours,
        businessExceptions: [],
        staffWorkingHours: [],
        staffBreaks: [],
        staffTimeOff: [],
        existingAppointments: [],
        staffPreference: "any",
        selectedStaffId: null,
      };

      const slots = calculateAvailableSlots(ctx);
      expect(slots).toEqual([]);
    });

    it("strictly isolates specialized service to the only qualified staff member", () => {
      const salonStaff = [
        { id: "general-1", display_name: "Sam General", display_order: 1, is_active: true, is_archived: false },
        { id: "specialist-1", display_name: "Dr. Skin", display_order: 2, is_active: true, is_archived: false },
      ];

      // Specialist only works afternoon (14:00 - 17:00); General works full day (09:00 - 17:00)
      const schedules = [
        { staff_id: "general-1", day_of_week: 2, is_working: true, open_time: "09:00", close_time: "17:00" },
        { staff_id: "specialist-1", day_of_week: 2, is_working: true, open_time: "14:00", close_time: "17:00" },
      ];

      // For Skin Therapy, only Dr. Skin is eligible
      const ctx: PureCalculationContext = {
        date: "2026-11-03",
        timezone: "Europe/London",
        now: baseNow,
        bookingPolicy: defaultPolicy,
        service: {
          id: "srv-skin",
          name: "Chemical Peel",
          duration_minutes: 60,
          buffer_minutes: 0,
          is_active: true,
          is_archived: false,
        },
        staffMembers: [salonStaff[1]], // Filtered by staff_services to Dr. Skin only!
        businessOpeningHours: tuesdayHours,
        businessExceptions: [],
        staffWorkingHours: schedules,
        staffBreaks: [],
        staffTimeOff: [],
        existingAppointments: [],
        staffPreference: "any",
        selectedStaffId: null,
        slotIntervalMinutes: 60,
      };

      const slots = calculateAvailableSlots(ctx);
      expect(slots.length).toBe(3); // 14:00, 15:00, 16:00
      expect(slots.map((s) => s.localTime)).toEqual(["14:00", "15:00", "16:00"]);
      for (const s of slots) {
        expect(s.availableStaffIds).toEqual(["specialist-1"]);
        expect(s.availableStaffIds).not.toContain("general-1");
      }
    });
  });

  describe("6. Fixture F: Fully Booked Schedules (Genuine Unavailability)", () => {
    const singleStaff = [
      { id: "barber-1", display_name: "Busy Bob", display_order: 1, is_active: true, is_archived: false },
    ];
    const workingHours = [
      { staff_id: "barber-1", day_of_week: 2, is_working: true, open_time: "09:00", close_time: "12:00" },
    ];

    // Appointments occupy all 3 hours: 09:00-10:00, 10:00-11:00, 11:00-12:00
    const fullAppointments = [
      {
        id: "appt-1",
        business_id: "biz-1",
        staff_id: "barber-1",
        status: "confirmed",
        starts_at: "2026-11-03T09:00:00.000Z",
        service_ends_at: "2026-11-03T10:00:00.000Z",
        occupied_starts_at: "2026-11-03T09:00:00.000Z",
        occupied_ends_at: "2026-11-03T10:00:00.000Z",
      },
      {
        id: "appt-2",
        business_id: "biz-1",
        staff_id: "barber-1",
        status: "confirmed",
        starts_at: "2026-11-03T10:00:00.000Z",
        service_ends_at: "2026-11-03T11:00:00.000Z",
        occupied_starts_at: "2026-11-03T10:00:00.000Z",
        occupied_ends_at: "2026-11-03T11:00:00.000Z",
      },
      {
        id: "appt-3",
        business_id: "biz-1",
        staff_id: "barber-1",
        status: "confirmed",
        starts_at: "2026-11-03T11:00:00.000Z",
        service_ends_at: "2026-11-03T12:00:00.000Z",
        occupied_starts_at: "2026-11-03T11:00:00.000Z",
        occupied_ends_at: "2026-11-03T12:00:00.000Z",
      },
    ];

    it("returns zero slots when schedule is fully occupied without throwing errors", () => {
      const ctx: PureCalculationContext = {
        date: "2026-11-03",
        timezone: "Europe/London",
        now: baseNow,
        bookingPolicy: defaultPolicy,
        service: {
          id: "srv-cut",
          name: "Haircut",
          duration_minutes: 30,
          buffer_minutes: 0,
          is_active: true,
          is_archived: false,
        },
        staffMembers: singleStaff,
        businessOpeningHours: tuesdayHours,
        businessExceptions: [],
        staffWorkingHours: workingHours,
        staffBreaks: [],
        staffTimeOff: [],
        existingAppointments: fullAppointments,
        staffPreference: "any",
        selectedStaffId: null,
      };

      const slots = calculateAvailableSlots(ctx);
      expect(slots).toEqual([]);
    });
  });

  describe("7. Fixture G: Separate Tenants with Overlapping Identifiers (Tenant Isolation)", () => {
    it("ensures two distinct tenants with identical staff names and service names remain strictly isolated", () => {
      // Tenant A
      const tenantAStaff = [
        { id: "tenant-a-alex", display_name: "Alex", display_order: 1, is_active: true, is_archived: false },
      ];
      const tenantBStaff = [
        { id: "tenant-b-alex", display_name: "Alex", display_order: 1, is_active: true, is_archived: false },
      ];

      const tenantAService = {
        id: "tenant-a-cut",
        name: "Classic Haircut",
        duration_minutes: 30,
        buffer_minutes: 0,
        is_active: true,
        is_archived: false,
      };

      const tenantAContext: PureCalculationContext = {
        date: "2026-11-03",
        timezone: "Europe/London",
        now: baseNow,
        bookingPolicy: defaultPolicy,
        service: tenantAService,
        staffMembers: tenantAStaff,
        businessOpeningHours: tuesdayHours,
        businessExceptions: [],
        staffWorkingHours: [
          { staff_id: "tenant-a-alex", day_of_week: 2, is_working: true, open_time: "09:00", close_time: "12:00" },
        ],
        staffBreaks: [],
        staffTimeOff: [],
        existingAppointments: [],
        staffPreference: "any",
        selectedStaffId: null,
      };

      const slotsA = calculateAvailableSlots(tenantAContext);
      expect(slotsA.length).toBeGreaterThan(0);
      for (const s of slotsA) {
        expect(s.availableStaffIds).toContain("tenant-a-alex");
        expect(s.availableStaffIds).not.toContain("tenant-b-alex");
      }

      // Tenant B Context
      const tenantBContext: PureCalculationContext = {
        ...tenantAContext,
        staffMembers: tenantBStaff,
        staffWorkingHours: [
          { staff_id: "tenant-b-alex", day_of_week: 2, is_working: true, open_time: "13:00", close_time: "17:00" },
        ],
      };
      const slotsB = calculateAvailableSlots(tenantBContext);
      expect(slotsB.length).toBeGreaterThan(0);
      for (const s of slotsB) {
        expect(s.availableStaffIds).toContain("tenant-b-alex");
        expect(s.availableStaffIds).not.toContain("tenant-a-alex");
      }
    });
  });
});
