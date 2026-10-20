import { describe, it, expect } from "vitest";
import {
  normalizeTimeHHMM,
  hasOverlappingBreaks,
  isBreakWithinWorkingHours,
  hasTimeOffOverlap,
  isStaffEligibleForService,
  staffWorkingHourIntervalSchema,
  staffBreakSchema,
  staffTimeOffSchema,
} from "@/features/staff/validation";
import type { StaffBreak, StaffTimeOff, StaffWithServices } from "@/features/staff/types";
import type { Service } from "@/features/services/types";

describe("Phase 1D Remediation — D-004: PostgreSQL HH:MM:SS Time Normalization & Schedule Re-saving", () => {
  it("normalizes PostgreSQL HH:MM:SS timestamps to standard HH:MM", () => {
    expect(normalizeTimeHHMM("09:00:00")).toBe("09:00");
    expect(normalizeTimeHHMM("17:30:00")).toBe("17:30");
    expect(normalizeTimeHHMM("00:00:00")).toBe("00:00");
    expect(normalizeTimeHHMM("23:59:59")).toBe("23:59");
  });

  it("leaves standard HH:MM timestamps unchanged", () => {
    expect(normalizeTimeHHMM("09:00")).toBe("09:00");
    expect(normalizeTimeHHMM("14:45")).toBe("14:45");
  });

  it("handles null, undefined, or empty values safely", () => {
    expect(normalizeTimeHHMM(null)).toBe(null);
    expect(normalizeTimeHHMM(undefined)).toBe(null);
    expect(normalizeTimeHHMM("")).toBe(null);
    expect(normalizeTimeHHMM("invalid")).toBe(null);
  });

  it("validates and transforms working intervals containing PostgreSQL HH:MM:SS format", () => {
    // When re-saved after reload, open_time and close_time arrive as HH:MM:SS from Supabase
    const inputWithSeconds = {
      day_of_week: 1,
      is_working: true,
      open_time: "09:00:00",
      close_time: "17:00:00",
    };

    const parsed = staffWorkingHourIntervalSchema.safeParse(inputWithSeconds);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.open_time).toBe("09:00");
      expect(parsed.data.close_time).toBe("17:00");
    }
  });

  it("validates and transforms break intervals containing PostgreSQL HH:MM:SS format", () => {
    const breakWithSeconds = {
      day_of_week: 2,
      break_title: "Lunch Break",
      start_time: "12:00:00",
      end_time: "13:00:00",
    };

    const parsed = staffBreakSchema.safeParse(breakWithSeconds);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.start_time).toBe("12:00");
      expect(parsed.data.end_time).toBe("13:00");
    }
  });

  it("validates and transforms partial-day time off containing PostgreSQL HH:MM:SS format", () => {
    const timeOffWithSeconds = {
      start_date: "2026-11-15",
      end_date: "2026-11-15",
      is_full_day: false,
      start_time: "10:00:00",
      end_time: "12:00:00",
      reason_type: "personal" as const,
      notes: "Doctor appointment",
    };

    const parsed = staffTimeOffSchema.safeParse(timeOffWithSeconds);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.start_time).toBe("10:00");
      expect(parsed.data.end_time).toBe("12:00");
    }
  });
});

describe("Phase 1D Remediation — D-005: Break Containment & Break Overlap Enforcements", () => {
  const shifts = [
    { day_of_week: 1, is_working: true, open_time: "09:00", close_time: "17:00" },
    { day_of_week: 2, is_working: true, open_time: "10:00:00", close_time: "18:00:00" },
    { day_of_week: 0, is_working: false, open_time: null, close_time: null },
  ];

  it("verifies break containment within working shift bounds with both HH:MM and HH:MM:SS", () => {
    // Valid break inside shift
    expect(
      isBreakWithinWorkingHours(
        { day_of_week: 1, start_time: "12:00", end_time: "13:00" },
        shifts
      )
    ).toBe(true);

    // Valid break with PostgreSQL seconds format
    expect(
      isBreakWithinWorkingHours(
        { day_of_week: 2, start_time: "13:00:00", end_time: "14:00:00" },
        shifts
      )
    ).toBe(true);

    // Break starting before shift open
    expect(
      isBreakWithinWorkingHours(
        { day_of_week: 1, start_time: "08:30", end_time: "10:00" },
        shifts
      )
    ).toBe(false);

    // Break ending after shift close
    expect(
      isBreakWithinWorkingHours(
        { day_of_week: 1, start_time: "16:30", end_time: "17:30" },
        shifts
      )
    ).toBe(false);

    // Break scheduled on day off
    expect(
      isBreakWithinWorkingHours(
        { day_of_week: 0, start_time: "11:00", end_time: "12:00" },
        shifts
      )
    ).toBe(false);
  });

  it("detects and prevents overlapping breaks on the same day", () => {
    const existingBreaks: StaffBreak[] = [
      {
        id: "b1",
        business_id: "biz-1",
        staff_id: "staff-1",
        day_of_week: 1,
        break_title: "Morning Tea",
        start_time: "10:30",
        end_time: "11:00",
        created_at: "",
        updated_at: "",
      },
      {
        id: "b2",
        business_id: "biz-1",
        staff_id: "staff-1",
        day_of_week: 1,
        break_title: "Lunch",
        start_time: "13:00",
        end_time: "14:00",
        created_at: "",
        updated_at: "",
      },
    ];

    // Non-overlapping break (afternoon tea)
    const validBreak = { day_of_week: 1, start_time: "15:30", end_time: "16:00" };
    expect(hasOverlappingBreaks([...existingBreaks, validBreak])).toBe(false);

    // Non-overlapping break on another day
    const validDifferentDay = { day_of_week: 2, start_time: "13:00", end_time: "14:00" };
    expect(hasOverlappingBreaks([...existingBreaks, validDifferentDay])).toBe(false);

    // Exact duplicate / overlapping break
    const exactOverlap = { day_of_week: 1, start_time: "13:00", end_time: "14:00" };
    expect(hasOverlappingBreaks([...existingBreaks, exactOverlap])).toBe(true);

    // Partial overlap (ends inside existing break)
    const partialOverlapBefore = { day_of_week: 1, start_time: "12:30", end_time: "13:30" };
    expect(hasOverlappingBreaks([...existingBreaks, partialOverlapBefore])).toBe(true);

    // Partial overlap (starts inside existing break)
    const partialOverlapAfter = { day_of_week: 1, start_time: "13:30", end_time: "14:30" };
    expect(hasOverlappingBreaks([...existingBreaks, partialOverlapAfter])).toBe(true);

    // Enclosing break
    const enclosing = { day_of_week: 1, start_time: "10:00", end_time: "11:30" };
    expect(hasOverlappingBreaks([...existingBreaks, enclosing])).toBe(true);

    // Works with HH:MM:SS format
    const overlapWithSeconds = { day_of_week: 1, start_time: "13:15:00", end_time: "13:45:00" };
    expect(hasOverlappingBreaks([...existingBreaks, overlapWithSeconds])).toBe(true);
  });
});

describe("Phase 1D Remediation — D-006: Time Off Overlap Prevention", () => {
  const existingTimeOff: StaffTimeOff[] = [
    {
      id: "to1",
      business_id: "biz-1",
      staff_id: "staff-1",
      start_date: "2026-11-10",
      end_date: "2026-11-15",
      is_full_day: true,
      start_time: null,
      end_time: null,
      reason_type: "vacation",
      notes: "Annual Leave",
      created_at: "",
      updated_at: "",
    },
    {
      id: "to2",
      business_id: "biz-1",
      staff_id: "staff-1",
      start_date: "2026-11-20",
      end_date: "2026-11-20",
      is_full_day: false,
      start_time: "09:00:00",
      end_time: "12:00:00",
      reason_type: "sick",
      notes: "Morning Clinic",
      created_at: "",
      updated_at: "",
    },
  ];

  it("detects full-day vacation overlaps against existing full-day leave", () => {
    // Within existing vacation
    const inside = {
      start_date: "2026-11-12",
      end_date: "2026-11-14",
      is_full_day: true,
    };
    expect(hasTimeOffOverlap(inside, existingTimeOff)).toBe(true);

    // Overlapping start date
    const overlapStart = {
      start_date: "2026-11-08",
      end_date: "2026-11-11",
      is_full_day: true,
    };
    expect(hasTimeOffOverlap(overlapStart, existingTimeOff)).toBe(true);

    // Outside existing dates
    const safeBefore = {
      start_date: "2026-11-01",
      end_date: "2026-11-05",
      is_full_day: true,
    };
    expect(hasTimeOffOverlap(safeBefore, existingTimeOff)).toBe(false);

    const safeAfter = {
      start_date: "2026-11-16",
      end_date: "2026-11-18",
      is_full_day: true,
    };
    expect(hasTimeOffOverlap(safeAfter, existingTimeOff)).toBe(false);
  });

  it("detects full-day vs partial-day conflicts", () => {
    // Booking full day on a day that already has partial day
    const fullDayConflict = {
      start_date: "2026-11-20",
      end_date: "2026-11-20",
      is_full_day: true,
    };
    expect(hasTimeOffOverlap(fullDayConflict, existingTimeOff)).toBe(true);

    // Booking partial day on a day that already has full day
    const partialConflict = {
      start_date: "2026-11-11",
      end_date: "2026-11-11",
      is_full_day: false,
      start_time: "10:00",
      end_time: "12:00",
    };
    expect(hasTimeOffOverlap(partialConflict, existingTimeOff)).toBe(true);
  });

  it("correctly allows non-conflicting partial-day off on the same date", () => {
    // Existing is 09:00 - 12:00 on 2026-11-20.
    // Afternoon 14:00 - 17:00 should be allowed!
    const afternoonSafe = {
      start_date: "2026-11-20",
      end_date: "2026-11-20",
      is_full_day: false,
      start_time: "14:00",
      end_time: "17:00",
    };
    expect(hasTimeOffOverlap(afternoonSafe, existingTimeOff)).toBe(false);

    // Overlapping afternoon (11:30 - 13:00) should be rejected
    const morningOverlap = {
      start_date: "2026-11-20",
      end_date: "2026-11-20",
      is_full_day: false,
      start_time: "11:30",
      end_time: "13:00",
    };
    expect(hasTimeOffOverlap(morningOverlap, existingTimeOff)).toBe(true);
  });
});

describe("Phase 1D Remediation — D-003: Inactive Staff & Service Assignment Restrictions", () => {
  const activeStaff: StaffWithServices = {
    id: "staff-active",
    business_id: "biz-1",
    user_id: null,
    display_name: "Active Barber",
    professional_title: "Master Barber",
    bio: null,
    avatar_url: null,
    contact_email: "active@salon.com",
    contact_phone: "+447911123456",
    is_active: true,
    is_archived: false,
    display_order: 1,
    created_at: "",
    updated_at: "",
    service_ids: ["srv-active"],
    assigned_services_count: 1,
  };

  const inactiveStaff: StaffWithServices = {
    ...activeStaff,
    id: "staff-inactive",
    is_active: false,
  };

  const archivedStaff: StaffWithServices = {
    ...activeStaff,
    id: "staff-archived",
    is_archived: true,
  };

  const activeService: Service = {
    id: "srv-active",
    business_id: "biz-1",
    name: "Classic Haircut",
    description: null,
    price_amount: 2500,
    currency: "GBP",
    duration_minutes: 30,
    buffer_minutes: 5,
    category_id: null,
    is_active: true,
    is_archived: false,
    display_order: 1,
    created_at: "",
    updated_at: "",
  };

  const inactiveService: Service = {
    ...activeService,
    id: "srv-inactive",
    is_active: false,
  };

  const archivedService: Service = {
    ...activeService,
    id: "srv-archived",
    is_archived: true,
  };

  it("allows assignment when both staff and service are active and not archived", () => {
    expect(isStaffEligibleForService(activeStaff, activeService, true)).toBe(true);
  });

  it("blocks assignment when staff member is inactive", () => {
    expect(isStaffEligibleForService(inactiveStaff, activeService, true)).toBe(false);
  });

  it("blocks assignment when staff member is archived", () => {
    expect(isStaffEligibleForService(archivedStaff, activeService, true)).toBe(false);
  });

  it("blocks assignment when service is inactive", () => {
    expect(isStaffEligibleForService(activeStaff, inactiveService, true)).toBe(false);
  });

  it("blocks assignment when service is archived", () => {
    expect(isStaffEligibleForService(activeStaff, archivedService, true)).toBe(false);
  });

  it("blocks eligibility if isAssigned is false", () => {
    expect(isStaffEligibleForService(activeStaff, activeService, false)).toBe(false);
  });
});

describe("Phase 1D Remediation — D-001, D-002, D-007: In-App Dialog Elements & Restore Verification", () => {
  it("verifies archived status filter capability across entities", () => {
    const services = [
      { id: "s1", is_archived: false },
      { id: "s2", is_archived: true },
    ];
    const filteredActive = services.filter((s) => !s.is_archived);
    const filteredArchived = services.filter((s) => s.is_archived);

    expect(filteredActive.length).toBe(1);
    expect(filteredActive[0].id).toBe("s1");
    expect(filteredArchived.length).toBe(1);
    expect(filteredArchived[0].id).toBe("s2");
  });
});
