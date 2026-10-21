import { describe, it, expect } from "vitest";
import {
  calculateAvailableSlots,
  assignStaffForAnyAvailableSlot,
} from "@/features/availability/engine";
import {
  timeStringToMinutes,
  minutesToTimeString,
  isIntervalContained,
  doIntervalsOverlap,
  doUtcDateRangesOverlap,
} from "@/features/availability/intervals";
import {
  getDayOfWeekForLocalDate,
  resolveWallClockCandidate,
} from "@/features/availability/timezone";
import {
  availabilityQuerySchema,
} from "@/features/availability/validation";
import type { PureCalculationContext } from "@/features/availability/types";

describe("Phase 1E-B: Availability Engine & Slot Generation Suite", () => {
  const UK_TZ = "Europe/London";

  // Standard Test Context Factory
  const createBaseContext = (overrides?: Partial<PureCalculationContext>): PureCalculationContext => ({
    date: "2026-11-03", // Tuesday
    timezone: UK_TZ,
    now: new Date("2026-11-01T08:00:00Z"), // 2 days before
    bookingPolicy: {
      min_notice_hours: 2,
      max_advance_days: 60,
      online_booking_enabled: true,
    },
    service: {
      id: "srv-classic-haircut",
      name: "Classic Haircut",
      duration_minutes: 35,
      buffer_minutes: 5,
      is_active: true,
      is_archived: false,
    },
    staffMembers: [
      {
        id: "staff-alex",
        display_name: "Alex QA",
        is_active: true,
        is_archived: false,
        display_order: 1,
      },
    ],
    businessOpeningHours: [
      // Mon (1) - Fri (5) 09:00 - 17:00
      { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 2, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 4, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 5, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 6, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 0, is_closed: true, open_time: null, close_time: null },
    ],
    businessExceptions: [],
    staffWorkingHours: [
      {
        staff_id: "staff-alex",
        day_of_week: 2, // Tuesday
        is_working: true,
        open_time: "09:00",
        close_time: "17:00",
      },
    ],
    staffBreaks: [],
    staffTimeOff: [],
    existingAppointments: [],
    staffPreference: "specific",
    selectedStaffId: "staff-alex",
    slotIntervalMinutes: 15,
    ...overrides,
  });

  describe("Interval Mathematics", () => {
    it("converts time strings to minutes and back", () => {
      expect(timeStringToMinutes("00:00")).toBe(0);
      expect(timeStringToMinutes("09:15")).toBe(555);
      expect(timeStringToMinutes("17:45")).toBe(1065);
      expect(timeStringToMinutes("23:59")).toBe(1439);

      expect(minutesToTimeString(0)).toBe("00:00");
      expect(minutesToTimeString(555)).toBe("09:15");
      expect(minutesToTimeString(1065)).toBe("17:45");
      expect(minutesToTimeString(1439)).toBe("23:59");
    });

    it("verifies interval containment [start, end)", () => {
      expect(isIntervalContained(540, 600, 540, 600)).toBe(true); // Exact match
      expect(isIntervalContained(550, 590, 540, 600)).toBe(true); // Inner
      expect(isIntervalContained(530, 590, 540, 600)).toBe(false); // Starts before
      expect(isIntervalContained(550, 610, 540, 600)).toBe(false); // Ends after
    });

    it("verifies interval overlap [start, end)", () => {
      // Overlapping
      expect(doIntervalsOverlap(540, 600, 570, 630)).toBe(true);
      expect(doIntervalsOverlap(570, 630, 540, 600)).toBe(true);
      expect(doIntervalsOverlap(550, 580, 540, 600)).toBe(true);

      // Adjacent (touching at boundary) do NOT overlap in half-open semantics
      expect(doIntervalsOverlap(540, 600, 600, 660)).toBe(false);
      expect(doIntervalsOverlap(600, 660, 540, 600)).toBe(false);

      // Completely disjoint
      expect(doIntervalsOverlap(540, 600, 700, 760)).toBe(false);
    });

    it("verifies UTC Date range overlap", () => {
      const aStart = new Date("2026-11-03T10:00:00Z");
      const aEnd = new Date("2026-11-03T10:40:00Z");

      const bOverlap = new Date("2026-11-03T10:30:00Z");
      const bOverlapEnd = new Date("2026-11-03T11:00:00Z");
      expect(doUtcDateRangesOverlap(aStart, aEnd, bOverlap, bOverlapEnd)).toBe(true);

      // Adjacent (aEnd === bAdjacentStart) -> NO overlap
      const bAdjacentStart = new Date("2026-11-03T10:40:00Z");
      const bAdjacentEnd = new Date("2026-11-03T11:10:00Z");
      expect(doUtcDateRangesOverlap(aStart, aEnd, bAdjacentStart, bAdjacentEnd)).toBe(false);
    });
  });

  describe("Timezone & Day of Week", () => {
    it("determines correct day of week in London timezone", () => {
      // 2026-11-03 is Tuesday (2)
      expect(getDayOfWeekForLocalDate("2026-11-03", UK_TZ)).toBe(2);
      // 2026-11-01 is Sunday (0)
      expect(getDayOfWeekForLocalDate("2026-11-01", UK_TZ)).toBe(0);
      // 2026-11-02 is Monday (1)
      expect(getDayOfWeekForLocalDate("2026-11-02", UK_TZ)).toBe(1);
    });

    it("skips non-existent times during Spring DST jump", () => {
      // 2026-03-29 01:30 in London does not exist
      const cand = resolveWallClockCandidate("2026-03-29", "01:30", UK_TZ);
      expect(cand).toBeNull();

      // 00:30 and 02:30 exist
      expect(resolveWallClockCandidate("2026-03-29", "00:30", UK_TZ)).not.toBeNull();
      expect(resolveWallClockCandidate("2026-03-29", "02:30", UK_TZ)).not.toBeNull();
    });

    it("resolves Autumn DST backward transition with earlier disambiguation", () => {
      // 2026-10-25 01:30 in London occurs twice. Engine resolves safely without throwing.
      const cand = resolveWallClockCandidate("2026-10-25", "01:30", UK_TZ);
      expect(cand).not.toBeNull();
      expect(cand?.isoString).toBe("2026-10-25T00:30:00.000Z");
    });
  });

  describe("Slot Calculation Engine", () => {
    it("generates 15-minute slots for a simple open business day", () => {
      const ctx = createBaseContext();
      const slots = calculateAvailableSlots(ctx);

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].localTime).toBe("09:00");
      expect(slots[0].available).toBe(true);
      expect(slots[0].availableStaffIds).toEqual(["staff-alex"]);

      // 35-minute duration + 5-minute buffer = 40 minutes occupied
      // Last slot must allow 35 mins service ending by 17:00, and 40 mins occupied ending by 17:00!
      // 17:00 - 40 min = 16:20 -> last 15-min candidate is 16:15!
      // 16:15 ends service at 16:50, occupied ends at 16:55 <= 17:00.
      const lastSlot = slots[slots.length - 1];
      expect(lastSlot.localTime).toBe("16:15");
    });

    it("returns zero slots when the business is closed on that day", () => {
      // Sunday is closed
      const ctx = createBaseContext({ date: "2026-11-01" });
      const slots = calculateAvailableSlots(ctx);
      expect(slots).toEqual([]);
    });

    it("returns zero slots when a business holiday/closure exception exists", () => {
      const ctx = createBaseContext({
        businessExceptions: [
          {
            exception_date: "2026-11-03",
            is_closed: true,
            open_time: null,
            close_time: null,
            reason: "Bank Holiday",
          },
        ],
      });
      const slots = calculateAvailableSlots(ctx);
      expect(slots).toEqual([]);
    });

    it("respects exceptional opening hours override", () => {
      // Exception: open only 10:00 - 13:00 on Tuesday
      const ctx = createBaseContext({
        businessExceptions: [
          {
            exception_date: "2026-11-03",
            is_closed: false,
            open_time: "10:00",
            close_time: "13:00",
            reason: "Short Staff Special Schedule",
          },
        ],
        staffWorkingHours: [
          {
            staff_id: "staff-alex",
            day_of_week: 2,
            is_working: true,
            open_time: "08:00",
            close_time: "18:00",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].localTime).toBe("10:00");
      // Last slot fits before 13:00: 12:15 -> ends service 12:50, buffer 12:55 <= 13:00
      expect(slots[slots.length - 1].localTime).toBe("12:15");
    });

    it("returns zero slots when staff is off on that weekday", () => {
      const ctx = createBaseContext({
        staffWorkingHours: [
          {
            staff_id: "staff-alex",
            day_of_week: 2,
            is_working: false,
            open_time: null,
            close_time: null,
          },
        ],
      });
      const slots = calculateAvailableSlots(ctx);
      expect(slots).toEqual([]);
    });

    it("supports staff split shifts and blocks slots bridging the shift gap", () => {
      // Alex works 09:00 - 13:00 and 14:00 - 18:00
      const ctx = createBaseContext({
        staffWorkingHours: [
          {
            staff_id: "staff-alex",
            day_of_week: 2,
            is_working: true,
            open_time: "09:00",
            close_time: "13:00",
          },
          {
            staff_id: "staff-alex",
            day_of_week: 2,
            is_working: true,
            open_time: "14:00",
            close_time: "18:00",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      const slotTimes = slots.map((s) => s.localTime);

      // 12:15 is valid (service ends 12:50, occupied ends 12:55 <= 13:00)
      expect(slotTimes).toContain("12:15");

      // 12:30 would occupy until 13:10 -> bridges gap -> MUST NOT BE AVAILABLE!
      expect(slotTimes).not.toContain("12:30");
      expect(slotTimes).not.toContain("12:45");
      expect(slotTimes).not.toContain("13:00");
      expect(slotTimes).not.toContain("13:15");
      expect(slotTimes).not.toContain("13:30");
      expect(slotTimes).not.toContain("13:45");

      // 14:00 starts the afternoon shift -> valid
      expect(slotTimes).toContain("14:00");
    });

    it("blocks slots overlapping staff recurring breaks including buffers", () => {
      // Alex has lunch break 13:00 - 14:00
      const ctx = createBaseContext({
        staffBreaks: [
          {
            staff_id: "staff-alex",
            day_of_week: 2,
            break_title: "Lunch",
            start_time: "13:00",
            end_time: "14:00",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      const slotTimes = slots.map((s) => s.localTime);

      // 12:15 ends occupied at 12:55 (< 13:00) -> available
      expect(slotTimes).toContain("12:15");

      // 12:30 ends occupied at 13:10 -> overlaps break -> NOT available
      expect(slotTimes).not.toContain("12:30");
      expect(slotTimes).not.toContain("12:45");
      expect(slotTimes).not.toContain("13:00");
      expect(slotTimes).not.toContain("13:15");
      expect(slotTimes).not.toContain("13:30");
      expect(slotTimes).not.toContain("13:45");

      // 14:00 starts after break -> available
      expect(slotTimes).toContain("14:00");
    });

    it("blocks slots when staff is on full-day leave", () => {
      const ctx = createBaseContext({
        staffTimeOff: [
          {
            staff_id: "staff-alex",
            start_date: "2026-11-03",
            end_date: "2026-11-03",
            is_full_day: true,
            start_time: null,
            end_time: null,
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      expect(slots).toEqual([]);
    });

    it("blocks slots when staff is on partial-day leave", () => {
      // Partial leave: 10:00 - 12:00
      const ctx = createBaseContext({
        staffTimeOff: [
          {
            staff_id: "staff-alex",
            start_date: "2026-11-03",
            end_date: "2026-11-03",
            is_full_day: false,
            start_time: "10:00",
            end_time: "12:00",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      const slotTimes = slots.map((s) => s.localTime);

      expect(slotTimes).toContain("09:00");
      expect(slotTimes).toContain("09:15"); // ends 09:55 occupied (< 10:00)

      expect(slotTimes).not.toContain("09:30"); // occupied ends 10:10 (overlaps 10:00-12:00)
      expect(slotTimes).not.toContain("10:00");
      expect(slotTimes).not.toContain("11:00");
      expect(slotTimes).not.toContain("11:45");

      expect(slotTimes).toContain("12:00"); // starts at 12:00 (after leave)
    });

    it("blocks slots overlapping existing confirmed appointments and buffers", () => {
      // Existing appointment for Alex: 10:00 to 10:35, occupied until 10:40
      const ctx = createBaseContext({
        existingAppointments: [
          {
            id: "appt-1",
            staff_id: "staff-alex",
            status: "confirmed",
            starts_at: "2026-11-03T10:00:00.000Z",
            service_ends_at: "2026-11-03T10:35:00.000Z",
            occupied_starts_at: "2026-11-03T10:00:00.000Z",
            occupied_ends_at: "2026-11-03T10:40:00.000Z",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      const slotTimes = slots.map((s) => s.localTime);

      // Slot at 09:15 ends occupied at 09:55 <= 10:00 -> available
      expect(slotTimes).toContain("09:15");

      // Slot at 09:30 ends occupied at 10:10 -> overlaps 10:00 start -> BLOCKED
      expect(slotTimes).not.toContain("09:30");
      expect(slotTimes).not.toContain("09:45");
      expect(slotTimes).not.toContain("10:00");
      expect(slotTimes).not.toContain("10:15");
      expect(slotTimes).not.toContain("10:30");

      // Slot at 10:45 starts after occupied ends (10:40) -> available
      expect(slotTimes).toContain("10:45");
    });

    it("allows adjacent bookings right after previous occupied buffer ends", () => {
      // Appointment: 09:00 to 09:40 occupied
      // Candidate slot at 09:45 starts after 09:40 -> must be available
      const ctx = createBaseContext({
        existingAppointments: [
          {
            id: "appt-prev",
            staff_id: "staff-alex",
            status: "confirmed",
            starts_at: "2026-11-03T09:00:00.000Z",
            service_ends_at: "2026-11-03T09:35:00.000Z",
            occupied_starts_at: "2026-11-03T09:00:00.000Z",
            occupied_ends_at: "2026-11-03T09:40:00.000Z",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      const slotTimes = slots.map((s) => s.localTime);

      expect(slotTimes).not.toContain("09:00");
      expect(slotTimes).not.toContain("09:15");
      expect(slotTimes).not.toContain("09:30");
      expect(slotTimes).toContain("09:45");
    });

    it("releases slot capacity when an appointment is cancelled", () => {
      // Cancelled appointments DO NOT block slots
      const ctx = createBaseContext({
        existingAppointments: [
          {
            id: "appt-cancelled",
            staff_id: "staff-alex",
            status: "cancelled",
            starts_at: "2026-11-03T10:00:00.000Z",
            service_ends_at: "2026-11-03T10:35:00.000Z",
            occupied_starts_at: "2026-11-03T10:00:00.000Z",
            occupied_ends_at: "2026-11-03T10:40:00.000Z",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      const slotTimes = slots.map((s) => s.localTime);

      expect(slotTimes).toContain("10:00");
    });

    it("aggregates multiple staff in Any Available mode correctly", () => {
      const ctx = createBaseContext({
        staffPreference: "any",
        selectedStaffId: null,
        staffMembers: [
          { id: "staff-alex", display_name: "Alex QA", is_active: true, is_archived: false, display_order: 1 },
          { id: "staff-emma", display_name: "Emma QA", is_active: true, is_archived: false, display_order: 2 },
        ],
        staffWorkingHours: [
          { staff_id: "staff-alex", day_of_week: 2, is_working: true, open_time: "09:00", close_time: "17:00" },
          { staff_id: "staff-emma", day_of_week: 2, is_working: true, open_time: "09:00", close_time: "17:00" },
        ],
        existingAppointments: [
          // Alex is busy at 10:00
          {
            id: "appt-alex",
            staff_id: "staff-alex",
            status: "confirmed",
            starts_at: "2026-11-03T10:00:00.000Z",
            service_ends_at: "2026-11-03T10:35:00.000Z",
            occupied_starts_at: "2026-11-03T10:00:00.000Z",
            occupied_ends_at: "2026-11-03T10:40:00.000Z",
          },
        ],
      });

      const slots = calculateAvailableSlots(ctx);
      const slot1000 = slots.find((s) => s.localTime === "10:00");

      // 10:00 slot is still available because Emma is free!
      expect(slot1000).toBeDefined();
      expect(slot1000?.availableStaffIds).toEqual(["staff-emma"]);

      // 09:00 slot has both Alex and Emma free
      const slot0900 = slots.find((s) => s.localTime === "09:00");
      expect(slot0900?.availableStaffIds).toContain("staff-alex");
      expect(slot0900?.availableStaffIds).toContain("staff-emma");
    });

    it("assigns staff deterministically for Any Available bookings", () => {
      const allStaff = [
        { id: "staff-emma", display_order: 2 },
        { id: "staff-alex", display_order: 1 },
      ];

      // Alex has display_order 1, so Alex is preferred over Emma
      const chosen = assignStaffForAnyAvailableSlot(["staff-emma", "staff-alex"], allStaff);
      expect(chosen).toBe("staff-alex");

      // If Alex is not free, Emma is chosen
      const chosenEmma = assignStaffForAnyAvailableSlot(["staff-emma"], allStaff);
      expect(chosenEmma).toBe("staff-emma");
    });

    it("enforces minimum booking notice window strictly", () => {
      // Current time is 10:00 on the same day, min_notice_hours is 2
      const ctx = createBaseContext({
        now: new Date("2026-11-03T10:00:00.000Z"),
        bookingPolicy: {
          min_notice_hours: 2,
          max_advance_days: 60,
          online_booking_enabled: true,
        },
      });

      const slots = calculateAvailableSlots(ctx);
      const slotTimes = slots.map((s) => s.localTime);

      // Before 12:00 (10:00 + 2h notice) is blocked
      expect(slotTimes).not.toContain("09:00");
      expect(slotTimes).not.toContain("10:00");
      expect(slotTimes).not.toContain("11:45");

      // 12:00 onwards is permitted
      expect(slotTimes).toContain("12:00");
    });

    it("enforces maximum advance booking window strictly", () => {
      // Advance window is 7 days, requested date is 10 days in the future
      const ctx = createBaseContext({
        now: new Date("2026-10-24T08:00:00Z"),
        date: "2026-11-04", // 11 days later
        bookingPolicy: {
          min_notice_hours: 2,
          max_advance_days: 7,
          online_booking_enabled: true,
        },
      });

      const slots = calculateAvailableSlots(ctx);
      expect(slots).toEqual([]);
    });

    it("returns zero slots when service is inactive or archived", () => {
      const ctxInactive = createBaseContext({
        service: {
          id: "srv-1",
          name: "Inactive Service",
          duration_minutes: 30,
          buffer_minutes: 0,
          is_active: false,
          is_archived: false,
        },
      });
      expect(calculateAvailableSlots(ctxInactive)).toEqual([]);

      const ctxArchived = createBaseContext({
        service: {
          id: "srv-2",
          name: "Archived Service",
          duration_minutes: 30,
          buffer_minutes: 0,
          is_active: true,
          is_archived: true,
        },
      });
      expect(calculateAvailableSlots(ctxArchived)).toEqual([]);
    });
  });

  describe("Validation & Security", () => {
    it("validates well-formed query parameters", () => {
      const valid = availabilityQuerySchema.safeParse({
        serviceId: "550e8400-e29b-41d4-a716-446655440000",
        date: "2026-11-03",
        businessSlug: "bookpilot-qa-salon",
        staffPreference: "any",
        slotIntervalMinutes: 15,
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid date formats or impossible calendar days", () => {
      const invalidFormat = availabilityQuerySchema.safeParse({
        serviceId: "550e8400-e29b-41d4-a716-446655440000",
        date: "03-11-2026",
      });
      expect(invalidFormat.success).toBe(false);

      const invalidDay = availabilityQuerySchema.safeParse({
        serviceId: "550e8400-e29b-41d4-a716-446655440000",
        date: "2026-02-31", // February 31st does not exist
      });
      expect(invalidDay.success).toBe(false);
    });

    it("rejects invalid UUIDs", () => {
      const invalidUUID = availabilityQuerySchema.safeParse({
        serviceId: "not-a-valid-uuid",
        date: "2026-11-03",
      });
      expect(invalidUUID.success).toBe(false);
    });
  });
});
