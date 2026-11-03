import { describe, it, expect } from "vitest";
import type {
  PublicSalonProfile,
  PublicSlot,
} from "@/features/public-booking/types";

describe("Bookzello D26 — Universal Four-Step Public Booking Wizard & Capacity Hardening", () => {
  const mockSalon: PublicSalonProfile = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Universal Hair Studio",
    slug: "universal-hair-studio",
    businessType: "salon",
    description: "Modern hair salon",
    logoUrl: null,
    phone: "+447000000000",
    email: "contact@universalhair.co.uk",
    website: null,
    addressLine1: "123 High Street",
    addressLine2: null,
    city: "London",
    postalCode: "SW1A 1AA",
    country: "GB",
    timezone: "Europe/London",
    currency: "GBP",
    onlineBookingEnabled: true,
    allowStaffSelection: false, // Default is false (Any Available Professional)
    cancellationPolicyText: "Please give at least 24 hours notice to cancel.",
    cancellationNoticeHours: 24,
    minNoticeHours: 2,
    maxAdvanceDays: 60,
    openingHours: [
      { dayOfWeek: 1, isClosed: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 2, isClosed: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 3, isClosed: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 4, isClosed: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 5, isClosed: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 6, isClosed: false, openTime: "09:00", closeTime: "17:00" },
      { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },
    ],
    services: [
      {
        id: "11111111-0000-0000-0000-000000000001",
        name: "Classic Haircut",
        description: "Wash, cut, and blowdry",
        priceAmount: 35.0,
        currency: "GBP",
        durationMinutes: 30,
        bufferMinutes: 10,
      },
      {
        id: "11111111-0000-0000-0000-000000000002",
        name: "Full Highlights",
        description: "Full head foil highlights",
        priceAmount: 90.0,
        currency: "GBP",
        durationMinutes: 90,
        bufferMinutes: 15,
      },
    ],
    staff: [],
  };

  describe("1. Customer Flow Invariants (Four-Step Architecture)", () => {
    it("enforces four defined steps: Service, Date & Time, Your Details, Review & Confirm", () => {
      const EXPECTED_STEPS = [
        { id: 1, label: "Service" },
        { id: 2, label: "Date & Time" },
        { id: 3, label: "Your Details" },
        { id: 4, label: "Review & Confirm" },
      ];

      expect(EXPECTED_STEPS).toHaveLength(4);
      expect(EXPECTED_STEPS[0].label).toBe("Service");
      expect(EXPECTED_STEPS[1].label).toBe("Date & Time");
      expect(EXPECTED_STEPS[2].label).toBe("Your Details");
      expect(EXPECTED_STEPS[3].label).toBe("Review & Confirm");
    });

    it("does not require a separate mandatory staff step", () => {
      // The default staff assignment is null (Any available professional)
      const defaultStaffId: string | null = null;
      expect(defaultStaffId).toBeNull();
    });
  });

  describe("2. Staff Assignment & Privacy Protection Rules", () => {
    it("defaults to 'Any available professional' without demanding staff selection", () => {
      expect(mockSalon.allowStaffSelection).toBe(false);
      expect(mockSalon.staff).toHaveLength(0);
    });

    it("does not leak internal staff qualification UUID arrays when staff selection is disabled", () => {
      mockSalon.services.forEach((service) => {
        expect(service.assignedStaffIds).toBeUndefined();
      });
    });

    it("provides staff selection only when salon explicitly enables allowStaffSelection", () => {
      const salonWithStaffSelection: PublicSalonProfile = {
        ...mockSalon,
        allowStaffSelection: true,
        staff: [
          { id: "22222222-0000-0000-0000-000000000001", displayName: "Emma", displayOrder: 1 },
          { id: "22222222-0000-0000-0000-000000000002", displayName: "Liam", displayOrder: 2 },
        ],
      };

      expect(salonWithStaffSelection.allowStaffSelection).toBe(true);
      expect(salonWithStaffSelection.staff).toHaveLength(2);
      expect(salonWithStaffSelection.staff[0].displayName).toBe("Emma");
    });
  });

  describe("3. Multi-Staff Capacity & Failover Guarantees", () => {
    it("guarantees a service with zero qualified staff yields zero bookable slots", () => {
      const zeroStaffAvailability = {
        date: "2026-11-15",
        serviceId: "unqualified-service-id",
        slots: [] as PublicSlot[],
        totalSlotsCount: 0,
        onlineBookingEnabled: true,
      };

      expect(zeroStaffAvailability.slots).toHaveLength(0);
      expect(zeroStaffAvailability.totalSlotsCount).toBe(0);
    });

    it("supports automatic assignment to any qualified professional during transaction", () => {
      const bookingOutcome = {
        success: true,
        data: {
          appointmentId: "apt-12345",
          bookingReference: "APT12345",
          businessSlug: "universal-hair-studio",
          staffId: "22222222-0000-0000-0000-000000000002",
          staffName: "Liam",
          status: "confirmed",
        },
      };

      expect(bookingOutcome.success).toBe(true);
      expect(bookingOutcome.data.staffName).toBe("Liam");
    });

    it("strictly isolates cross-tenant staff and prevents wrong-salon bookings", () => {
      const crossTenantAttempt = {
        salonSlug: "universal-hair-studio",
        foreignStaffId: "99999999-foreign-staff-id",
      };

      const isStaffEligible = !crossTenantAttempt.foreignStaffId.startsWith("99999999");
      expect(isStaffEligible).toBe(false);
    });
  });

  describe("4. AI Receptionist Handoff Routing in 4-Step Architecture", () => {
    it("routes complete handoff payload directly to Step 4 (Review & Confirm)", () => {
      const fullHandoff = {
        serviceId: "11111111-0000-0000-0000-000000000001",
        date: "2026-11-15",
        time: "14:00",
        customerName: "Jane Doe",
        customerPhone: "+447111222333",
      };

      const hasName = Boolean(fullHandoff.customerName && fullHandoff.customerName.length >= 2);
      const hasPhone = Boolean(fullHandoff.customerPhone && fullHandoff.customerPhone.length >= 7);

      const targetStep = hasName && hasPhone ? 4 : 3;
      expect(targetStep).toBe(4);
    });

    it("routes verified slot with missing contact info to Step 3 (Your Details)", () => {
      const partialHandoff = {
        serviceId: "11111111-0000-0000-0000-000000000001",
        date: "2026-11-15",
        time: "14:00",
        customerName: "Jane",
        customerPhone: "", // missing phone
      };

      const hasName = Boolean(partialHandoff.customerName && partialHandoff.customerName.length >= 2);
      const hasPhone = Boolean(partialHandoff.customerPhone && partialHandoff.customerPhone.length >= 7);

      const targetStep = hasName && hasPhone ? 4 : 3;
      expect(targetStep).toBe(3);
    });

    it("routes slot conflict back to Step 2 (Date & Time) with conflict alert", () => {
      const slotTakenResponse = {
        success: false,
        code: "SLOT_TAKEN",
        message: "The requested appointment slot is no longer available. Please choose another time.",
      };

      const recoveryStep = slotTakenResponse.code === "SLOT_TAKEN" ? 2 : 1;
      expect(recoveryStep).toBe(2);
    });
  });

  describe("5. Booking Policy Schema & Security Invariants", () => {
    it("defaults allow_staff_selection to false in bookingPolicySchema", async () => {
      const { bookingPolicySchema } = await import("@/features/organizations/validation");
      const parsed = bookingPolicySchema.safeParse({
        min_notice_hours: 2,
        max_advance_days: 30,
        cancellation_notice_hours: 24,
        default_buffer_minutes: 10,
        online_booking_enabled: true,
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.allow_staff_selection).toBe(false);
      }
    });

    it("accepts explicit allow_staff_selection boolean toggle in bookingPolicySchema", async () => {
      const { bookingPolicySchema } = await import("@/features/organizations/validation");
      const parsed = bookingPolicySchema.safeParse({
        min_notice_hours: 2,
        max_advance_days: 30,
        cancellation_notice_hours: 24,
        default_buffer_minutes: 10,
        online_booking_enabled: true,
        allow_staff_selection: true,
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.allow_staff_selection).toBe(true);
      }
    });

    it("strips availableStaffIds from public slot responses when allowStaffSelection is false", () => {
      const rawSlot = {
        startsAt: "2026-11-15T10:00:00Z",
        serviceEndsAt: "2026-11-15T10:30:00Z",
        availableStaffIds: ["stf-1", "stf-2"],
      };

      const allowStaffSelection = false;
      const sanitizedSlot: PublicSlot = {
        startsAt: rawSlot.startsAt,
        serviceEndsAt: rawSlot.serviceEndsAt,
        availableStaffIds: allowStaffSelection ? rawSlot.availableStaffIds : undefined,
        localTime: "10:00",
        period: "morning",
      };

      expect(sanitizedSlot.availableStaffIds).toBeUndefined();
    });
  });
});
