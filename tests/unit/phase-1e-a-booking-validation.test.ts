import { describe, it, expect } from "vitest";
import {
  customerSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
  isValidStatusTransition,
} from "@/features/appointments/validation";
import {
  BOOKING_ERROR_CODES,
  mapDatabaseErrorToBookingError,
} from "@/features/appointments/booking-errors";
import type { AppointmentStatus } from "@/features/appointments/types";

describe("Phase 1E-A — Customer Profile Validation", () => {

  it("accepts customer with name and valid UK email", () => {
    const input = {
      name: "David Smith",
      email: "david@example.co.uk",
      phone: null,
      notes: "Prefers morning appointments",
    };
    const res = customerSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it("accepts customer with name and valid UK phone number", () => {
    const input = {
      name: "Emma Watson",
      email: null,
      phone: "+44 7911 123456",
    };
    const res = customerSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it("rejects customer missing both email and phone", () => {
    const input = {
      name: "Ghost Customer",
      email: null,
      phone: null,
    };
    const res = customerSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it("rejects customer name that is too short", () => {
    const input = {
      name: "A",
      email: "a@example.com",
    };
    const res = customerSchema.safeParse(input);
    expect(res.success).toBe(false);
  });
});

describe("Phase 1E-A — Appointment Creation Validation", () => {
  const bizId = "00000000-0000-4000-8000-000000000001";
  const srvId = "00000000-0000-4000-8000-000000000002";
  const stfId = "00000000-0000-4000-8000-000000000003";
  const custId = "00000000-0000-4000-8000-000000000004";

  it("accepts appointment with existing customer_id and ISO UTC timestamp", () => {
    const input = {
      business_id: bizId,
      service_id: srvId,
      staff_id: stfId,
      customer_id: custId,
      starts_at: "2026-11-10T10:00:00.000Z",
      notes: "First time visit",
    };
    const res = createAppointmentSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it("accepts appointment with inline customer creation details", () => {
    const input = {
      business_id: bizId,
      service_id: srvId,
      staff_id: stfId,
      customer_name: "Liam Gallagher",
      customer_email: "liam@oasis.co.uk",
      starts_at: "2026-11-10T11:00:00.000Z",
    };
    const res = createAppointmentSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it("rejects appointment missing customer identifier or inline contact details", () => {
    const input = {
      business_id: bizId,
      service_id: srvId,
      staff_id: stfId,
      starts_at: "2026-11-10T11:00:00.000Z",
    };
    const res = createAppointmentSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it("rejects invalid non-ISO timestamp string", () => {
    const input = {
      business_id: bizId,
      service_id: srvId,
      staff_id: stfId,
      customer_id: custId,
      starts_at: "tomorrow at 10am",
    };
    const res = createAppointmentSchema.safeParse(input);
    expect(res.success).toBe(false);
  });
});

describe("Phase 1E-A — Reschedule and Cancellation Schema Validation", () => {
  const bizId = "00000000-0000-4000-8000-000000000001";
  const apptId = "00000000-0000-4000-8000-000000000002";
  const stfId = "00000000-0000-4000-8000-000000000003";

  it("validates reschedule input with new ISO timestamp and optional staff", () => {
    const valid = {
      business_id: bizId,
      appointment_id: apptId,
      new_starts_at: "2026-11-12T14:30:00.000Z",
      new_staff_id: stfId,
      reason: "Client request",
    };
    expect(rescheduleAppointmentSchema.safeParse(valid).success).toBe(true);

    const invalid = {
      business_id: bizId,
      appointment_id: apptId,
      new_starts_at: "not-a-date",
    };
    expect(rescheduleAppointmentSchema.safeParse(invalid).success).toBe(false);
  });

  it("validates cancellation input with reason", () => {
    const valid = {
      business_id: bizId,
      appointment_id: apptId,
      reason: "Illness",
    };
    expect(cancelAppointmentSchema.safeParse(valid).success).toBe(true);
  });

  it("validates status update input", () => {
    const valid = {
      business_id: bizId,
      appointment_id: apptId,
      status: "completed" as const,
    };
    expect(updateAppointmentStatusSchema.safeParse(valid).success).toBe(true);
  });
});

describe("Phase 1E-A — Booking Status Lifecycle & State Machine", () => {
  it("allows valid transitions from pending", () => {
    expect(isValidStatusTransition("pending", "confirmed")).toBe(true);
    expect(isValidStatusTransition("pending", "cancelled")).toBe(true);
    expect(isValidStatusTransition("pending", "completed")).toBe(false);
    expect(isValidStatusTransition("pending", "no_show")).toBe(false);
  });

  it("allows valid transitions from confirmed", () => {
    expect(isValidStatusTransition("confirmed", "completed")).toBe(true);
    expect(isValidStatusTransition("confirmed", "cancelled")).toBe(true);
    expect(isValidStatusTransition("confirmed", "no_show")).toBe(true);
    expect(isValidStatusTransition("confirmed", "pending")).toBe(false);
  });

  it("strictly locks terminal states (completed, cancelled, no_show)", () => {
    const terminalStates: AppointmentStatus[] = ["completed", "cancelled", "no_show"];
    const allStates: AppointmentStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];

    for (const term of terminalStates) {
      for (const target of allStates) {
        if (target === term) {
          expect(isValidStatusTransition(term, target)).toBe(true); // Same-state idempotent
        } else {
          expect(isValidStatusTransition(term, target)).toBe(false);
        }
      }
    }
  });
});

describe("Phase 1E-A — PostgreSQL Error Code Mapping", () => {
  it("maps PostgreSQL exclusion_violation (23P01) to SLOT_TAKEN", () => {
    const pgError = {
      code: "23P01",
      message: 'conflicting key value violates exclusion constraint "exclude_staff_double_booking"',
    };
    const mapped = mapDatabaseErrorToBookingError(pgError);
    expect(mapped.code).toBe(BOOKING_ERROR_CODES.SLOT_TAKEN);
    expect(mapped.message).toContain("already booked");
  });

  it("maps foreign key violation for service to INVALID_SERVICE", () => {
    const pgError = {
      code: "23503",
      message: 'insert or update on table "appointments" violates foreign key constraint "fk_appointments_service"',
    };
    const mapped = mapDatabaseErrorToBookingError(pgError);
    expect(mapped.code).toBe(BOOKING_ERROR_CODES.INVALID_SERVICE);
  });

  it("maps foreign key violation for staff to INVALID_STAFF", () => {
    const pgError = {
      code: "23503",
      message: 'insert or update on table "appointments" violates foreign key constraint "fk_appointments_staff"',
    };
    const mapped = mapDatabaseErrorToBookingError(pgError);
    expect(mapped.code).toBe(BOOKING_ERROR_CODES.INVALID_STAFF);
  });

  it("maps security exception (42501) to BUSINESS_ACCESS_DENIED", () => {
    const pgError = {
      code: "42501",
      message: "Access denied to this business workspace.",
    };
    const mapped = mapDatabaseErrorToBookingError(pgError);
    expect(mapped.code).toBe(BOOKING_ERROR_CODES.BUSINESS_ACCESS_DENIED);
  });
});
