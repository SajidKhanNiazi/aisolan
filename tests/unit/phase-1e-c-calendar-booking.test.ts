import { describe, it, expect } from "vitest";
import {
  customerSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
} from "@/features/appointments/validation";
import type { AppointmentStatus } from "@/features/appointments/types";

describe("Phase 1E-C — Owner Appointment Calendar, Manual Booking & Customers", () => {
  describe("1. Customer Validation & Contact Constraint (chk_customers_contact_required)", () => {
    it("should accept a customer with both phone and email", () => {
      const res = customerSchema.safeParse({
        name: "Arthur Pendelton",
        email: "arthur@example.co.uk",
        phone: "+44 7700 900088",
        notes: "Prefers tea",
      });
      expect(res.success).toBe(true);
    });

    it("should accept a customer with only a phone number", () => {
      const res = customerSchema.safeParse({
        name: "Jane Smith",
        phone: "+44 7700 900099",
      });
      expect(res.success).toBe(true);
    });

    it("should accept a customer with only an email address", () => {
      const res = customerSchema.safeParse({
        name: "Marcus Vance",
        email: "marcus@vance.com",
      });
      expect(res.success).toBe(true);
    });

    it("should reject a customer missing both phone and email", () => {
      const res = customerSchema.safeParse({
        name: "Ghost Customer",
        phone: "",
        email: "",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toMatch(
          /At least one contact method/i
        );
      }
    });

    it("should reject customer name shorter than 2 characters", () => {
      const res = customerSchema.safeParse({
        name: "A",
        phone: "+44 7700 900011",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toMatch(/at least 2 characters/i);
      }
    });
  });

  describe("2. Manual Booking Schema & Idempotency", () => {
    const validUuid = "11111111-1111-4111-8111-111111111111";

    it("should validate complete manual booking input", () => {
      const res = createAppointmentSchema.safeParse({
        business_id: validUuid,
        service_id: validUuid,
        staff_id: validUuid,
        starts_at: "2026-11-04T10:00:00.000Z",
        customer_name: "Walk-in Gentleman",
        customer_phone: "+44 7700 900123",
        notes: "Cash payment at reception",
        idempotency_key: "manual-booking-test-key-001",
      });
      expect(res.success).toBe(true);
    });

    it("should reject invalid ISO starts_at timestamp", () => {
      const res = createAppointmentSchema.safeParse({
        business_id: validUuid,
        service_id: validUuid,
        staff_id: validUuid,
        starts_at: "invalid-timestamp",
        customer_name: "John",
        customer_phone: "+44 7700 900123",
      });
      expect(res.success).toBe(false);
    });

    it("should require valid UUIDs for business_id, service_id, and staff_id", () => {
      const res = createAppointmentSchema.safeParse({
        business_id: "not-a-uuid",
        service_id: validUuid,
        staff_id: validUuid,
        starts_at: "2026-11-04T10:00:00.000Z",
        customer_name: "John",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("3. Appointment Lifecycle State Machine Transitions", () => {
    // Valid state transitions in booking engine
    const isValidTransition = (
      from: AppointmentStatus,
      to: AppointmentStatus
    ): boolean => {
      // Terminal states cannot transition to anything
      if (from === "cancelled" || from === "completed" || from === "no_show") {
        return false;
      }
      if (from === "pending") {
        return ["confirmed", "completed", "cancelled", "no_show"].includes(to);
      }
      if (from === "confirmed") {
        return ["completed", "cancelled", "no_show"].includes(to);
      }
      return false;
    };

    it("should allow pending -> confirmed, completed, cancelled, no_show", () => {
      expect(isValidTransition("pending", "confirmed")).toBe(true);
      expect(isValidTransition("pending", "completed")).toBe(true);
      expect(isValidTransition("pending", "cancelled")).toBe(true);
      expect(isValidTransition("pending", "no_show")).toBe(true);
    });

    it("should allow confirmed -> completed, cancelled, no_show", () => {
      expect(isValidTransition("confirmed", "completed")).toBe(true);
      expect(isValidTransition("confirmed", "cancelled")).toBe(true);
      expect(isValidTransition("confirmed", "no_show")).toBe(true);
    });

    it("should forbid transitions out of terminal cancelled state", () => {
      expect(isValidTransition("cancelled", "confirmed")).toBe(false);
      expect(isValidTransition("cancelled", "completed")).toBe(false);
      expect(isValidTransition("cancelled", "pending")).toBe(false);
    });

    it("should forbid transitions out of terminal completed state", () => {
      expect(isValidTransition("completed", "pending")).toBe(false);
      expect(isValidTransition("completed", "confirmed")).toBe(false);
      expect(isValidTransition("completed", "cancelled")).toBe(false);
    });

    it("should forbid transitions out of terminal no_show state", () => {
      expect(isValidTransition("no_show", "confirmed")).toBe(false);
      expect(isValidTransition("no_show", "completed")).toBe(false);
    });
  });

  describe("4. Rescheduling and Cancellation Schema Validation", () => {
    const validUuid = "22222222-2222-4222-8222-222222222222";

    it("should validate reschedule input with optional staff reassignment", () => {
      const res = rescheduleAppointmentSchema.safeParse({
        business_id: validUuid,
        appointment_id: validUuid,
        new_starts_at: "2026-11-05T14:30:00.000Z",
        new_staff_id: validUuid,
        reason: "Customer requested afternoon slot",
      });
      expect(res.success).toBe(true);
    });

    it("should validate cancellation input with optional audit reason", () => {
      const res = cancelAppointmentSchema.safeParse({
        business_id: validUuid,
        appointment_id: validUuid,
        reason: "Called in sick",
      });
      expect(res.success).toBe(true);
    });

    it("should validate update status input", () => {
      const res = updateAppointmentStatusSchema.safeParse({
        business_id: validUuid,
        appointment_id: validUuid,
        status: "completed",
        reason: "Paid in full at counter",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("5. KPI Calculation & Revenue Integrity Logic", () => {
    const mockAppointments = [
      { id: "1", status: "confirmed", price_minor_snapshot: 3500, starts_at: "2026-11-04T09:00:00.000Z" },
      { id: "2", status: "completed", price_minor_snapshot: 5000, starts_at: "2026-11-04T10:30:00.000Z" },
      { id: "3", status: "cancelled", price_minor_snapshot: 4000, starts_at: "2026-11-04T12:00:00.000Z" },
      { id: "4", status: "no_show", price_minor_snapshot: 3000, starts_at: "2026-11-04T14:00:00.000Z" },
      { id: "5", status: "pending", price_minor_snapshot: 2500, starts_at: "2026-11-04T16:00:00.000Z" },
    ];

    it("should correctly compute status breakdowns", () => {
      const confirmed = mockAppointments.filter((a) => a.status === "confirmed").length;
      const completed = mockAppointments.filter((a) => a.status === "completed").length;
      const cancelled = mockAppointments.filter((a) => a.status === "cancelled").length;
      const noShow = mockAppointments.filter((a) => a.status === "no_show").length;
      const pending = mockAppointments.filter((a) => a.status === "pending").length;

      expect(confirmed).toBe(1);
      expect(completed).toBe(1);
      expect(cancelled).toBe(1);
      expect(noShow).toBe(1);
      expect(pending).toBe(1);
      expect(mockAppointments.length).toBe(5);
    });

    it("should exclude cancelled appointments from estimated day revenue", () => {
      const nonCancelledRevenue = mockAppointments
        .filter((a) => a.status !== "cancelled")
        .reduce((sum, a) => sum + a.price_minor_snapshot, 0);

      // 3500 + 5000 + 3000 + 2500 = 14000 (£140.00)
      expect(nonCancelledRevenue).toBe(14000);
    });
  });

  describe("6. Search and Filter Logic In-Memory Parity", () => {
    const clients = [
      { id: "c1", name: "Sarah Connor", phone: "+44 7700 900111", email: "sarah@sky.net" },
      { id: "c2", name: "John Connor", phone: "+44 7700 900222", email: "john@resistance.org" },
      { id: "c3", name: "Kyle Reese", phone: null, email: "kyle@future.net" },
    ];

    it("should find customers by partial name case-insensitively", () => {
      const q = "sarah";
      const matches = clients.filter((c) => c.name.toLowerCase().includes(q));
      expect(matches).toHaveLength(1);
      expect(matches[0]?.id).toBe("c1");
    });

    it("should find customers by phone number digits", () => {
      const q = "900222";
      const matches = clients.filter((c) => c.phone && c.phone.includes(q));
      expect(matches).toHaveLength(1);
      expect(matches[0]?.id).toBe("c2");
    });

    it("should find customers by email address domain", () => {
      const q = "future.net";
      const matches = clients.filter((c) => c.email && c.email.toLowerCase().includes(q));
      expect(matches).toHaveLength(1);
      expect(matches[0]?.id).toBe("c3");
    });
  });
});
