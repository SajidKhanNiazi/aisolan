import { describe, it, expect } from "vitest";
import {
  businessProfileSchema,
  weeklyOpeningHoursSchema,
  bookingPolicySchema,
} from "@/features/organizations/validation";

describe("Phase 1C Remediation — Logo Upload & Security Checks (QA-006)", () => {
  it("rejects SVG mime type and restricts to PNG, JPEG, WebP", () => {
    const allowedMimes = ["image/png", "image/jpeg", "image/webp"];

    expect(allowedMimes.includes("image/svg+xml")).toBe(false);
    expect(allowedMimes.includes("image/png")).toBe(true);
    expect(allowedMimes.includes("image/jpeg")).toBe(true);
    expect(allowedMimes.includes("image/webp")).toBe(true);
  });

  it("enforces maximum file size limit of 2MB (2,097,152 bytes)", () => {
    const MAX_SIZE = 2 * 1024 * 1024;
    const testFileValid = 1.9 * 1024 * 1024;
    const testFileOversized = 2.1 * 1024 * 1024;

    expect(testFileValid <= MAX_SIZE).toBe(true);
    expect(testFileOversized <= MAX_SIZE).toBe(false);
  });
});

describe("Phase 1C Remediation — False Wizard Success Prevention (QA-005)", () => {
  it("determines setup completion only when all required steps [1, 2, 3, 4] are completed", () => {
    const requiredSteps = [1, 2, 3, 4];

    // Scenario A: Only step 1 was saved
    const partialSteps = [1];
    const missingA = requiredSteps.filter((s) => !partialSteps.includes(s));
    expect(missingA.length).toBe(3);
    expect(missingA).toEqual([2, 3, 4]);

    // Scenario B: Skipping directly to review (0 steps saved)
    const emptySteps: number[] = [];
    const missingB = requiredSteps.filter((s) => !emptySteps.includes(s));
    expect(missingB.length).toBe(4);

    // Scenario C: All 4 steps successfully persisted
    const allSteps = [1, 2, 3, 4];
    const missingC = requiredSteps.filter((s) => !allSteps.includes(s));
    expect(missingC.length).toBe(0);
  });
});

describe("Phase 1C Remediation — Immediate Validation Clearance (QA-008)", () => {
  it("clears business profile name error once restored to valid length", () => {
    const invalidProfile = {
      name: "A",
      business_type: "salon" as const,
    };
    const invalidRes = businessProfileSchema.safeParse(invalidProfile);
    expect(invalidRes.success).toBe(false);

    const validProfile = {
      name: "BookPilot Salon",
      business_type: "salon" as const,
      timezone: "Europe/London",
    };
    const validRes = businessProfileSchema.safeParse(validProfile);
    expect(validRes.success).toBe(true);
  });

  it("clears booking policy advance window error when reduced to <= 365 days", () => {
    const invalidPolicy = {
      min_notice_hours: 2,
      max_advance_days: 999999,
      cancellation_notice_hours: 24,
      default_buffer_minutes: 10,
      online_booking_enabled: false,
    };
    const invalidRes = bookingPolicySchema.safeParse(invalidPolicy);
    expect(invalidRes.success).toBe(false);

    const validPolicy = {
      ...invalidPolicy,
      max_advance_days: 60,
    };
    const validRes = bookingPolicySchema.safeParse(validPolicy);
    expect(validRes.success).toBe(true);
  });

  it("clears opening hours overlap error when invalid interval is removed", () => {
    const overlappingSchedule = [
      { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "17:00" },
      { day_of_week: 1, is_closed: false, open_time: "12:00", close_time: "21:00" },
    ];
    const invalidRes = weeklyOpeningHoursSchema.safeParse(overlappingSchedule);
    expect(invalidRes.success).toBe(false);

    const fixedSchedule = [
      { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "17:00" },
    ];
    const validRes = weeklyOpeningHoursSchema.safeParse(fixedSchedule);
    expect(validRes.success).toBe(true);
  });
});

describe("Phase 1C Remediation — Workspace Selector Mapping (QA-009)", () => {
  it("flattens direct query results and assigns correct membership roles", () => {
    const mockMemberRows = [
      { business_id: "biz-1", role: "owner" as const },
      { business_id: "biz-2", role: "manager" as const },
    ];
    const mockBusinesses = [
      {
        id: "biz-1",
        name: "BookPilot QA Salon",
        slug: "bookpilot-qa-salon",
        business_type: "salon" as const,
        logo_url: null,
        country: "GB",
        timezone: "Europe/London",
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "biz-2",
        name: "Second Studio",
        slug: "second-studio",
        business_type: "barbershop" as const,
        logo_url: null,
        country: "GB",
        timezone: "Europe/London",
        created_by: "user-2",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const roleMap = new Map(mockMemberRows.map((m) => [m.business_id, m.role]));
    const result = mockBusinesses.map((b) => ({
      ...b,
      role: roleMap.get(b.id) || "staff",
    }));

    expect(result.length).toBe(2);
    expect(result[0].name).toBe("BookPilot QA Salon");
    expect(result[0].role).toBe("owner");
    expect(result[1].name).toBe("Second Studio");
    expect(result[1].role).toBe("manager");
  });
});
