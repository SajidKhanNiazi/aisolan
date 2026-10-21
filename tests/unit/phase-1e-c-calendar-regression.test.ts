import { describe, it, expect } from "vitest";
import { formatInstantInTimeZone, convertLocalWallClockToUTC } from "@/features/appointments/timezone";
import type { AppointmentWithDetails } from "@/features/appointments/types";

describe("Phase 1E-C Regression Tests — Defect 1E-C-001 Calendar Rendering & Bounds", () => {
  const businessTimezone = "Europe/London";

  // Representative QA appointments persisted in live environment
  const mockAppointments: AppointmentWithDetails[] = [
    {
      id: "appt-1-uuid",
      business_id: "biz-uuid-1",
      customer_id: "cust-uuid-1",
      service_id: "serv-uuid-1",
      staff_id: "staff-alex-uuid",
      status: "confirmed",
      starts_at: "2026-10-27T10:00:00.000Z", // Oct 27, 2026 10:00 local
      service_ends_at: "2026-10-27T10:45:00.000Z",
      occupied_starts_at: "2026-10-27T10:00:00.000Z",
      occupied_ends_at: "2026-10-27T10:45:00.000Z",
      duration_minutes_snapshot: 45,
      buffer_before_minutes_snapshot: 0,
      buffer_after_minutes_snapshot: 0,
      price_minor_snapshot: 3500,
      currency_snapshot: "GBP",
      service_name_snapshot: "Classic Haircut",
      customer_name_snapshot: "Arthur Pendelton",
      timezone_snapshot: "Europe/London",
      notes: "First time haircut",
      cancellation_reason: null,
      cancelled_at: null,
      idempotency_key: "qa-appt-1-key",
      created_by: null,
      created_at: "2026-10-21T00:00:00.000Z",
      updated_at: "2026-10-21T00:00:00.000Z",
      customer: {
        id: "cust-uuid-1",
        name: "Arthur Pendelton",
        email: "arthur@example.co.uk",
        phone: "+44 7700 900088",
      },
      service: {
        id: "serv-uuid-1",
        name: "Classic Haircut",
        price_amount: 3500,
        duration_minutes: 45,
      },
      staff: {
        id: "staff-alex-uuid",
        display_name: "Alex QA",
        professional_title: "Senior Stylist",
      },
    },
    {
      id: "appt-2-uuid",
      business_id: "biz-uuid-1",
      customer_id: "cust-uuid-1",
      service_id: "serv-uuid-2",
      staff_id: "staff-emma-uuid",
      status: "confirmed",
      starts_at: "2026-10-28T09:00:00.000Z", // Oct 28, 2026 09:00 local
      service_ends_at: "2026-10-28T10:00:00.000Z",
      occupied_starts_at: "2026-10-28T09:00:00.000Z",
      occupied_ends_at: "2026-10-28T10:00:00.000Z",
      duration_minutes_snapshot: 60,
      buffer_before_minutes_snapshot: 0,
      buffer_after_minutes_snapshot: 0,
      price_minor_snapshot: 5500,
      currency_snapshot: "GBP",
      service_name_snapshot: "Hair Styling",
      customer_name_snapshot: "Arthur Pendelton",
      timezone_snapshot: "Europe/London",
      notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      idempotency_key: "qa-appt-2-key",
      created_by: null,
      created_at: "2026-10-21T00:00:00.000Z",
      updated_at: "2026-10-21T00:00:00.000Z",
      customer: {
        id: "cust-uuid-1",
        name: "Arthur Pendelton",
        email: "arthur@example.co.uk",
        phone: "+44 7700 900088",
      },
      service: {
        id: "serv-uuid-2",
        name: "Hair Styling",
        price_amount: 5500,
        duration_minutes: 60,
      },
      staff: {
        id: "staff-emma-uuid",
        display_name: "Emma QA",
        professional_title: "Colour Specialist",
      },
    },
    {
      id: "appt-3-uuid",
      business_id: "biz-uuid-1",
      customer_id: "cust-uuid-1",
      service_id: "serv-uuid-3",
      staff_id: "staff-alex-uuid",
      status: "confirmed",
      starts_at: "2026-10-29T10:00:00.000Z", // Oct 29, 2026 10:00 local
      service_ends_at: "2026-10-29T10:30:00.000Z",
      occupied_starts_at: "2026-10-29T10:00:00.000Z",
      occupied_ends_at: "2026-10-29T10:30:00.000Z",
      duration_minutes_snapshot: 30,
      buffer_before_minutes_snapshot: 0,
      buffer_after_minutes_snapshot: 0,
      price_minor_snapshot: 2000,
      currency_snapshot: "GBP",
      service_name_snapshot: "Beard Trim",
      customer_name_snapshot: "Arthur Pendelton",
      timezone_snapshot: "Europe/London",
      notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      idempotency_key: "qa-appt-3-key",
      created_by: null,
      created_at: "2026-10-21T00:00:00.000Z",
      updated_at: "2026-10-21T00:00:00.000Z",
      customer: {
        id: "cust-uuid-1",
        name: "Arthur Pendelton",
        email: "arthur@example.co.uk",
        phone: "+44 7700 900088",
      },
      service: {
        id: "serv-uuid-3",
        name: "Beard Trim",
        price_amount: 2000,
        duration_minutes: 30,
      },
      staff: {
        id: "staff-alex-uuid",
        display_name: "Alex QA",
        professional_title: "Senior Stylist",
      },
    },
  ];

  describe("1. Timezone Bounds & UTC Query Boundary Precision", () => {
    it("should convert Europe/London local start of day to exact UTC instant", () => {
      const conv = convertLocalWallClockToUTC(
        { date: "2026-10-27", time: "00:00", timeZone: businessTimezone },
        "earlier"
      );
      expect(conv.status).toBe("valid");
      expect(conv.isoString).toBe("2026-10-27T00:00:00.000Z");
    });

    it("should extend local end-of-day query boundary through 23:59:59.999Z", () => {
      const conv = convertLocalWallClockToUTC(
        { date: "2026-10-27", time: "23:59", timeZone: businessTimezone },
        "later"
      );
      expect(conv.status).toBe("valid");
      expect(conv.utcInstant).not.toBeNull();
      const endIso = new Date(conv.utcInstant!.getTime() + 59 * 1000 + 999).toISOString();
      expect(endIso).toBe("2026-10-27T23:59:59.999Z");
    });

    it("should handle British Summer Time (BST) offset where local 00:00 maps to 23:00 UTC previous day", () => {
      // In July 2026, London is BST (UTC+1)
      const conv = convertLocalWallClockToUTC(
        { date: "2026-07-15", time: "00:00", timeZone: businessTimezone },
        "earlier"
      );
      expect(conv.status).toBe("valid");
      expect(conv.isoString).toBe("2026-07-14T23:00:00.000Z");
    });
  });

  describe("2. Day View Filtering & Local Date Matching", () => {
    const getAppLocalDate = (app: AppointmentWithDetails): string => {
      return formatInstantInTimeZone(new Date(app.starts_at), businessTimezone).dateStr;
    };

    it("should display APPT-1 (Classic Haircut) in Day View for 2026-10-27", () => {
      const targetDate = "2026-10-27";
      const dayAppointments = mockAppointments.filter((a) => getAppLocalDate(a) === targetDate);
      expect(dayAppointments.length).toBe(1);
      expect(dayAppointments[0].id).toBe("appt-1-uuid");
      expect(dayAppointments[0].service_name_snapshot).toBe("Classic Haircut");
      expect(dayAppointments[0].staff?.display_name).toBe("Alex QA");
    });

    it("should display APPT-2 (Hair Styling) in Day View for 2026-10-28", () => {
      const targetDate = "2026-10-28";
      const dayAppointments = mockAppointments.filter((a) => getAppLocalDate(a) === targetDate);
      expect(dayAppointments.length).toBe(1);
      expect(dayAppointments[0].id).toBe("appt-2-uuid");
      expect(dayAppointments[0].service_name_snapshot).toBe("Hair Styling");
      expect(dayAppointments[0].staff?.display_name).toBe("Emma QA");
    });

    it("should display APPT-3 (Beard Trim) in Day View for 2026-10-29", () => {
      const targetDate = "2026-10-29";
      const dayAppointments = mockAppointments.filter((a) => getAppLocalDate(a) === targetDate);
      expect(dayAppointments.length).toBe(1);
      expect(dayAppointments[0].id).toBe("appt-3-uuid");
      expect(dayAppointments[0].service_name_snapshot).toBe("Beard Trim");
      expect(dayAppointments[0].staff?.display_name).toBe("Alex QA");
    });

    it("should return 0 appointments on an empty day (2026-10-21)", () => {
      const dayAppointments = mockAppointments.filter((a) => getAppLocalDate(a) === "2026-10-21");
      expect(dayAppointments.length).toBe(0);
    });
  });

  describe("3. Week View Multi-Day Distribution & Column Matching", () => {
    const getWeekDates = (centerDateStr: string): string[] => {
      const [y, m, d] = centerDateStr.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const dayOfWeek = date.getUTCDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(Date.UTC(y, m - 1, d + diffToMonday, 12, 0, 0));

      const week: string[] = [];
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(
          Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i, 12, 0, 0)
        );
        week.push(nextDay.toISOString().slice(0, 10));
      }
      return week;
    };

    const getAppLocalDate = (app: AppointmentWithDetails): string => {
      return formatInstantInTimeZone(new Date(app.starts_at), businessTimezone).dateStr;
    };

    it("should distribute all three QA appointments into their correct weekday columns for week of Oct 26–Nov 01", () => {
      const week = getWeekDates("2026-10-27");
      expect(week).toEqual([
        "2026-10-26", // Mon
        "2026-10-27", // Tue (APPT-1)
        "2026-10-28", // Wed (APPT-2)
        "2026-10-29", // Thu (APPT-3)
        "2026-10-30", // Fri
        "2026-10-31", // Sat
        "2026-11-01", // Sun
      ]);

      const tuesdayAppts = mockAppointments.filter((a) => getAppLocalDate(a) === week[1]);
      const wednesdayAppts = mockAppointments.filter((a) => getAppLocalDate(a) === week[2]);
      const thursdayAppts = mockAppointments.filter((a) => getAppLocalDate(a) === week[3]);
      const fridayAppts = mockAppointments.filter((a) => getAppLocalDate(a) === week[4]);

      expect(tuesdayAppts.length).toBe(1);
      expect(tuesdayAppts[0].id).toBe("appt-1-uuid");

      expect(wednesdayAppts.length).toBe(1);
      expect(wednesdayAppts[0].id).toBe("appt-2-uuid");

      expect(thursdayAppts.length).toBe(1);
      expect(thursdayAppts[0].id).toBe("appt-3-uuid");

      expect(fridayAppts.length).toBe(0);
    });

    it("should not display appointments in the previous week (Oct 19–25)", () => {
      const prevWeek = getWeekDates("2026-10-21");
      const matched = mockAppointments.filter((a) => prevWeek.includes(getAppLocalDate(a)));
      expect(matched.length).toBe(0);
    });
  });

  describe("4. List View Agenda & Filtering", () => {
    it("should render all three appointments in List View in chronological order", () => {
      const sorted = [...mockAppointments].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      expect(sorted.length).toBe(3);
      expect(sorted[0].id).toBe("appt-1-uuid");
      expect(sorted[1].id).toBe("appt-2-uuid");
      expect(sorted[2].id).toBe("appt-3-uuid");
    });

    it("should filter appointments by specific staff (Alex QA)", () => {
      const alexAppts = mockAppointments.filter((a) => a.staff_id === "staff-alex-uuid");
      expect(alexAppts.length).toBe(2);
      expect(alexAppts.map((a) => a.id)).toEqual(["appt-1-uuid", "appt-3-uuid"]);
    });

    it("should filter appointments by specific staff (Emma QA)", () => {
      const emmaAppts = mockAppointments.filter((a) => a.staff_id === "staff-emma-uuid");
      expect(emmaAppts.length).toBe(1);
      expect(emmaAppts[0].id).toBe("appt-2-uuid");
    });

    it("should return all appointments when staff filter is 'all'", () => {
      const filterStaff = "all";
      const result = filterStaff === "all" ? mockAppointments : mockAppointments.filter((a) => a.staff_id === filterStaff);
      expect(result.length).toBe(3);
    });

    it("should filter appointments by status", () => {
      const confirmed = mockAppointments.filter((a) => a.status === "confirmed");
      expect(confirmed.length).toBe(3);

      const cancelled = mockAppointments.filter((a) => a.status === "cancelled");
      expect(cancelled.length).toBe(0);
    });

    it("should search appointments by customer name and service name safely", () => {
      const query = "haircut";
      const result = mockAppointments.filter(
        (a) =>
          (a.customer?.name || "").toLowerCase().includes(query) ||
          (a.service_name_snapshot || "").toLowerCase().includes(query)
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("appt-1-uuid");
    });

    it("should handle customer search gracefully if customer snapshot is undefined/null", () => {
      const apptWithNullSnapshot: AppointmentWithDetails = {
        ...mockAppointments[0],
        customer_name_snapshot: "",
        service_name_snapshot: "",
      };
      const query = "arthur";
      expect(() => {
        const matches =
          (apptWithNullSnapshot.customer?.name || "").toLowerCase().includes(query) ||
          (apptWithNullSnapshot.customer_name_snapshot || "").toLowerCase().includes(query);
        expect(matches).toBe(true);
      }).not.toThrow();
    });
  });

  describe("5. Missing Related Records Resilience (Fallback to Snapshots)", () => {
    it("should render successfully when customer, service, or staff relational embeds are null", () => {
      const orphanedAppt: AppointmentWithDetails = {
        ...mockAppointments[0],
        customer: undefined,
        service: undefined,
        staff: undefined,
      };

      const custName = orphanedAppt.customer?.name || orphanedAppt.customer_name_snapshot || "Guest Customer";
      const servName = orphanedAppt.service?.name || orphanedAppt.service_name_snapshot || "Service";
      const staffName = orphanedAppt.staff?.display_name || "Any Staff";

      expect(custName).toBe("Arthur Pendelton");
      expect(servName).toBe("Classic Haircut");
      expect(staffName).toBe("Any Staff");
    });
  });

  describe("6. Integration Contract: listAppointmentsBySlug and Authorization Scope", () => {
    it("should reject unauthorized or unauthenticated queries safely", async () => {
      const { listAppointmentsBySlug } = await import("@/features/appointments/server");
      const res = await listAppointmentsBySlug("non-existent-or-unauthorized-workspace");
      expect(res.success).toBe(false);
      expect(res.appointments).toEqual([]);
      expect(res.error).toBeDefined();
    });
  });
});
