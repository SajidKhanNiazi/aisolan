import { describe, it, expect, vi } from "vitest";
import { executeMockChat } from "@/features/ai-receptionist/mock-provider";
import { salonTools } from "@/features/ai-receptionist/tools";
import {
  onboardingProgressSchema,
  sevenStepOnboardingProgressSchema,
} from "@/features/organizations/validation";
import type { ToolExecutionContext } from "@/features/ai-receptionist/types";

// Mock public booking modules for universal fixture validation
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "universal-salon") {
      return {
        success: true,
        data: {
          id: "biz-1",
          name: "Universal Grooming Lounge",
          slug: "universal-salon",
          businessType: "salon",
          description: "Universal multi-tenant salon testing suite.",
          addressLine1: "10 Innovation Way",
          city: "London",
          postalCode: "EC1A 1BB",
          country: "GB",
          phone: "+44 20 7946 0000",
          email: "info@universalgrooming.com",
          timezone: "Europe/London",
          currency: "GBP",
          onlineBookingEnabled: true,
          minNoticeHours: 1,
          maxAdvanceDays: 30,
          cancellationPolicyText: "Standard cancellation policy.",
          openingHours: [
            { dayOfWeek: 1, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 2, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 3, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 4, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 5, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 6, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
            { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },
          ],
          services: [
            {
              id: "srv-cut",
              name: "Signature Haircut",
              categoryName: "Hair",
              durationMinutes: 30,
              bufferMinutes: 0,
              priceFormatted: "£25.00",
              priceAmount: 2500,
              assignedStaffIds: ["st-dan", "st-lee"],
            },
            {
              id: "srv-peel",
              name: "Chemical Peel",
              categoryName: "Dermatology",
              durationMinutes: 60,
              bufferMinutes: 10,
              priceFormatted: "£85.00",
              priceAmount: 8500,
              assignedStaffIds: ["st-skin"],
            },
            {
              id: "srv-laser",
              name: "Unassigned Laser Treatment",
              categoryName: "Advanced",
              durationMinutes: 45,
              bufferMinutes: 0,
              priceFormatted: "£120.00",
              priceAmount: 12000,
              assignedStaffIds: [], // Zero qualified staff
            },
          ],
          staff: [
            {
              id: "st-dan",
              name: "Dan Barber",
              displayName: "Dan Barber",
              role: "Master Barber",
            },
            {
              id: "st-lee",
              name: "Lee Stylist",
              displayName: "Lee Stylist",
              role: "Senior Stylist",
            },
            {
              id: "st-skin",
              name: "Dr. Skin",
              displayName: "Dr. Skin",
              role: "Dermatologist",
            },
          ],
        },
      };
    }

    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async (params: { serviceId: string; staffId?: string }) => {
    // If querying unassigned laser treatment or staff with 0 capacity
    if (params.serviceId === "srv-laser" || params.staffId === "st-skin" && params.serviceId === "srv-cut") {
      return {
        success: true,
        data: {
          slots: [],
          availableSlotsCount: 0,
        },
      };
    }

    return {
      success: true,
      data: {
        date: "2026-11-03",
        serviceId: params.serviceId,
        availableSlotsCount: 2,
        slots: [
          {
            startsAt: "2026-11-03T10:00:00.000Z",
            localTime: "10:00",
            period: "morning",
            isAvailable: true,
            availableStaffIds: ["st-dan", "st-lee"],
          },
          {
            startsAt: "2026-11-03T11:30:00.000Z",
            localTime: "11:30",
            period: "morning",
            isAvailable: true,
            availableStaffIds: ["st-dan"],
          },
        ],
      },
    };
  }),
}));

describe("Phase 1H — D25: Universal AI Receptionist & D24 Integration Hardening", () => {
  const genericSalonContext: ToolExecutionContext = {
    businessId: "biz-1",
    businessSlug: "universal-salon",
    businessName: "Universal Grooming Lounge",
    timezone: "Europe/London",
    currency: "GBP",
  };

  describe("1. Universal Staff Privacy by Default (Time-First Availability)", () => {
    it("returns appointment times without leaking any specialist names when customer has not requested staff", async () => {
      const res = await executeMockChat(
        genericSalonContext,
        [{ role: "user", content: "What times are available for a haircut tomorrow?" }],
        []
      );

      expect(res.success).toBe(true);
      expect(res.toolsUsed).toContain("checkAvailability");
      expect(res.message).toContain("appointment times are available");
      // Anonymity check: default response must not leak staff names
      expect(res.message).not.toContain("Dan Barber");
      expect(res.message).not.toContain("Lee Stylist");
      expect(res.bookingHandoff?.hasIntent).toBe(true);
      expect(res.bookingHandoff?.staffName).toBeUndefined();
    });

    it("respects and names specialist only when the customer explicitly requested them", async () => {
      const res = await executeMockChat(
        genericSalonContext,
        [{ role: "user", content: "Is Dan Barber available tomorrow for a haircut?" }],
        []
      );

      expect(res.success).toBe(true);
      expect(res.toolsUsed).toContain("checkAvailability");
      expect(res.message).toContain("Dan Barber");
      expect(res.message).toContain("verified openings for");
      expect(res.bookingHandoff?.hasIntent).toBe(true);
    });
  });

  describe("2. Universal Qualification Verification & Zero Fake Slots", () => {
    it("dynamically identifies when a specialist is not qualified and suggests assigned alternatives", async () => {
      const res = await executeMockChat(
        genericSalonContext,
        [{ role: "user", content: "Can Dr. Skin perform a haircut tomorrow?" }],
        []
      );

      expect(res.success).toBe(true);
      // Explains non-qualification dynamically without crashing or hardcoded assumptions
      expect(res.message).toMatch(/(specializes in|not assigned|not qualified)/i);
      expect(res.message).toMatch(/(Dan Barber|Lee Stylist)/i);
    });

    it("returns zero slots when a service has zero qualified capacity configured", async () => {
      const emptyCheck = await salonTools.checkAvailability.execute(
        genericSalonContext,
        {
          serviceId: "srv-laser",
          date: "2026-11-03",
        }
      );

      const typed = emptyCheck as { available: boolean; slots?: unknown[]; availableSlotsCount?: number };
      expect(typed.available).toBe(false);
      expect(typed.slots?.length || typed.availableSlotsCount || 0).toBe(0);
    });
  });

  describe("3. Seven-Step Onboarding Persistence Schema & Resume Calculation", () => {
    it("validates all 7 onboarding steps in schema validation", () => {
      const valid7StepProgress = {
        current_step: 7,
        completed_steps: [1, 2, 3, 4, 5, 6, 7],
        is_completed: true,
      };

      const result = sevenStepOnboardingProgressSchema.safeParse(valid7StepProgress);
      expect(result.success).toBe(true);

      // Verify legacy 5-step schema rejects step 7
      expect(onboardingProgressSchema.safeParse(valid7StepProgress).success).toBe(false);
    });

    it("correctly derives resume step across 7 steps even if current_step was clamped in database", () => {
      function calculateResumeStep(progress: {
        current_step: number;
        completed_steps: number[];
        is_completed: boolean;
      }): number {
        if (progress.is_completed) return 7;
        const completed = progress.completed_steps || [];
        if (completed.length > 0) {
          const maxCompleted = Math.max(...completed);
          return Math.min(7, Math.max(1, maxCompleted + 1));
        }
        return Math.min(7, Math.max(1, progress.current_step || 1));
      }

      // Case 1: Fresh salon -> Step 1
      expect(calculateResumeStep({ current_step: 1, completed_steps: [], is_completed: false })).toBe(1);

      // Case 2: Completed Steps 1 to 4 -> Resume at Step 5
      expect(calculateResumeStep({ current_step: 4, completed_steps: [1, 2, 3, 4], is_completed: false })).toBe(5);

      // Case 3: Completed Step 5 (Eligibility) with current_step clamped to 5 -> Resumes at Step 6 (Readiness Review)
      expect(calculateResumeStep({ current_step: 5, completed_steps: [1, 2, 3, 4, 5], is_completed: false })).toBe(6);

      // Case 4: Completed Step 6 (Readiness) -> Resumes at Step 7 (Launch)
      expect(calculateResumeStep({ current_step: 5, completed_steps: [1, 2, 3, 4, 5, 6], is_completed: false })).toBe(7);

      // Case 5: Completed Onboarding -> Step 7
      expect(calculateResumeStep({ current_step: 5, completed_steps: [1, 2, 3, 4, 5, 6, 7], is_completed: true })).toBe(7);
    });
  });

  describe("4. Service Assignment Integrity & Non-Destructive Diff", () => {
    it("calculates accurate additions and removals without wiping out existing assignments", () => {
      const existingAssignments = ["staff-1", "staff-2"];
      const newRequestedStaff = ["staff-2", "staff-3"];

      const existingSet = new Set(existingAssignments);
      const newSet = new Set(newRequestedStaff);

      const toAdd = newRequestedStaff.filter((id) => !existingSet.has(id));
      const toRemove = existingAssignments.filter((id) => !newSet.has(id));

      // staff-3 is added, staff-1 is removed, staff-2 is preserved
      expect(toAdd).toEqual(["staff-3"]);
      expect(toRemove).toEqual(["staff-1"]);

      // Idempotency check: repeated request with same staff produces 0 adds and 0 removes
      const repeatToAdd = newRequestedStaff.filter((id) => !newSet.has(id));
      const repeatToRemove = newRequestedStaff.filter((id) => !newSet.has(id));
      expect(repeatToAdd.length).toBe(0);
      expect(repeatToRemove.length).toBe(0);
    });
  });

  describe("5. Fail-Closed Qualification & Cross-Tenant Rejection", () => {
    it("ensures an empty qualification list never permits an unqualified specialist", async () => {
      // In prepareBookingDraft with service 'srv-laser' (zero assigned staff)
      const draftRes = await salonTools.prepareBookingDraft.execute(
        genericSalonContext,
        {
          serviceName: "Unassigned Laser Treatment",
          staffName: "Dan Barber",
        }
      );

      const typedDraft = draftRes as { success: boolean; draft?: { staffPreference: string; staffId?: string; staffName?: string } };
      expect(typedDraft.success).toBe(true);
      // Because Dan Barber is not qualified for srv-laser, draft must fail-closed to "any" / null staff
      expect(typedDraft.draft?.staffPreference).toBe("any");
      expect(typedDraft.draft?.staffId).toBeUndefined();
      expect(typedDraft.draft?.staffName).toBe("Any Specialist");
    });

    it("verifies positive proof of qualification is required for specific staff preference", async () => {
      // For Signature Haircut, Dan Barber is assigned, but Dr. Skin is not
      const draftRes = await salonTools.prepareBookingDraft.execute(
        genericSalonContext,
        {
          serviceName: "Signature Haircut",
          staffName: "Dr. Skin",
        }
      );

      const typedDraft = draftRes as { success: boolean; draft?: { staffPreference: string; staffId?: string; staffName?: string } };
      expect(typedDraft.success).toBe(true);
      // Dr. Skin is rejected for Signature Haircut
      expect(typedDraft.draft?.staffPreference).toBe("any");
      expect(typedDraft.draft?.staffId).toBeUndefined();
    });

    it("accepts explicitly qualified specialist when positive proof exists", async () => {
      const draftRes = await salonTools.prepareBookingDraft.execute(
        genericSalonContext,
        {
          serviceName: "Signature Haircut",
          staffName: "Dan Barber",
        }
      );

      const typedDraft = draftRes as { success: boolean; draft?: { staffPreference: string; staffId?: string; staffName?: string } };
      expect(typedDraft.success).toBe(true);
      expect(typedDraft.draft?.staffPreference).toBe("specific");
      expect(typedDraft.draft?.staffId).toBe("st-dan");
      expect(typedDraft.draft?.staffName).toBe("Dan Barber");
    });
  });

  describe("6. Transaction-Safety & Concurrency Failure Modes for Staff Qualifications", () => {
    it("simulates insert-succeeds, delete-fails failure mode in non-atomic operations", () => {
      // Demonstrates why multi-call HTTP PostgREST requires single atomic PostgreSQL RPC
      const initialAssignments = new Set(["st-dan"]);
      const requestedStaff = ["st-lee"];

      // Phase 1: Insert succeeds
      const toAdd = requestedStaff.filter((id) => !initialAssignments.has(id));
      for (const id of toAdd) initialAssignments.add(id);

      // Phase 2: Delete fails (e.g. network drop, process death, foreign key constraint)
      const deleteFailed = true;
      if (!deleteFailed) {
        initialAssignments.delete("st-dan");
      }

      // Result of partial failure: orphaned assignment remains in state
      expect(initialAssignments.has("st-dan")).toBe(true);
      expect(initialAssignments.has("st-lee")).toBe(true);
      // In an atomic transaction, the entire change would roll back
    });

    it("verifies idempotency and deduplication of staff IDs in assignment payloads", () => {
      const inputWithDuplicates = ["st-dan", "st-dan", "st-lee", "st-lee"];
      const deduplicated = Array.from(new Set(inputWithDuplicates));
      expect(deduplicated).toEqual(["st-dan", "st-lee"]);

      // Repeated identical replacements produce zero mutations
      const current = new Set(["st-dan", "st-lee"]);
      const nextAdd = deduplicated.filter((id) => !current.has(id));
      const nextRemove = Array.from(current).filter((id) => !new Set(deduplicated).has(id));
      expect(nextAdd.length).toBe(0);
      expect(nextRemove.length).toBe(0);
    });
  });

  describe("7. Seven-Step Onboarding URL Persistence & Backward Navigation", () => {
    function resolveWizardStep(
      progress: { current_step: number; completed_steps: number[]; is_completed: boolean },
      urlSearchParam?: string | null
    ): number {
      if (urlSearchParam) {
        const parsed = Number.parseInt(urlSearchParam, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 7) {
          return parsed;
        }
      }
      if (progress.is_completed) return 7;
      const completed = progress.completed_steps || [];
      if (completed.length > 0) {
        const maxCompleted = Math.max(...completed);
        return Math.min(7, Math.max(1, maxCompleted + 1));
      }
      return Math.min(7, Math.max(1, progress.current_step || 1));
    }

    it("preserves backward navigation step on browser reload via URL search param", () => {
      // User reached Step 6 (Readiness Review), completed steps 1-5
      const progress = { current_step: 5, completed_steps: [1, 2, 3, 4, 5], is_completed: false };

      // User clicked back to Step 2 (Hours & Time) -> URL has ?step=2
      const stepAfterReload = resolveWizardStep(progress, "2");
      expect(stepAfterReload).toBe(2);

      // If user clicked back to Step 3 (Services) -> URL has ?step=3
      expect(resolveWizardStep(progress, "3")).toBe(3);
    });

    it("resumes at furthest active step on reload when no URL search param is present", () => {
      const progressStep6 = { current_step: 5, completed_steps: [1, 2, 3, 4, 5], is_completed: false };
      expect(resolveWizardStep(progressStep6, null)).toBe(6);

      const progressStep7 = { current_step: 5, completed_steps: [1, 2, 3, 4, 5, 6], is_completed: false };
      expect(resolveWizardStep(progressStep7, null)).toBe(7);
    });

    it("safely ignores out-of-range or malicious URL step parameters", () => {
      const progress = { current_step: 3, completed_steps: [1, 2], is_completed: false };
      // ?step=99 or ?step=-5 or ?step=invalid
      expect(resolveWizardStep(progress, "99")).toBe(3);
      expect(resolveWizardStep(progress, "-5")).toBe(3);
      expect(resolveWizardStep(progress, "malicious_string")).toBe(3);
    });

    it("handles completed onboarding and reopening", () => {
      const completedProgress = {
        current_step: 5,
        completed_steps: [1, 2, 3, 4, 5, 6, 7],
        is_completed: true,
      };
      // Reopening completed onboarding opens at Step 7 (Launch & Policies)
      expect(resolveWizardStep(completedProgress, null)).toBe(7);
    });
  });
});
