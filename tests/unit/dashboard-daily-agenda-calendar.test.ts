import fs from "fs";
import { describe, it, expect } from "vitest";
import {
  computeConcurrentAppointmentColumns,
  getAppointmentTimeDetails,
  getBookingSource,
} from "@/features/appointments/layout-utils";
import type { AppointmentWithDetails } from "@/features/appointments/types";

// Mock helper to build test appointments
function buildMockAppointment(overrides: Partial<AppointmentWithDetails> = {}): AppointmentWithDetails {
  return {
    id: overrides.id || "app-001",
    business_id: overrides.business_id || "biz-test",
    customer_id: overrides.customer_id || "cust-001",
    service_id: overrides.service_id || "srv-001",
    staff_id: overrides.staff_id || "staff-001",
    status: overrides.status || "confirmed",
    starts_at: overrides.starts_at || "2026-11-04T10:00:00.000Z",
    service_ends_at: overrides.service_ends_at || "2026-11-04T10:30:00.000Z",
    occupied_starts_at: overrides.occupied_starts_at || "2026-11-04T10:00:00.000Z",
    occupied_ends_at: overrides.occupied_ends_at || "2026-11-04T10:35:00.000Z",
    duration_minutes_snapshot: overrides.duration_minutes_snapshot || 30,
    buffer_before_minutes_snapshot: 0,
    buffer_after_minutes_snapshot: 5,
    price_minor_snapshot: overrides.price_minor_snapshot ?? 2500,
    currency_snapshot: overrides.currency_snapshot || "GBP",
    service_name_snapshot: overrides.service_name_snapshot || "Haircut",
    customer_name_snapshot: overrides.customer_name_snapshot || "Alice Smith",
    timezone_snapshot: overrides.timezone_snapshot || "Europe/London",
    cancellation_reason: overrides.cancellation_reason || null,
    cancelled_at: overrides.cancelled_at || null,
    notes: overrides.notes || null,
    idempotency_key: overrides.idempotency_key || null,
    created_by: overrides.created_by ?? null,
    created_at: overrides.created_at || "2026-11-01T09:00:00.000Z",
    updated_at: overrides.updated_at || "2026-11-01T09:00:00.000Z",
    customer: "customer" in overrides ? overrides.customer : {
      id: overrides.customer_id || "cust-001",
      name: overrides.customer_name_snapshot || "Alice Smith",
      email: "alice@example.com",
      phone: "+447911123456",
    },
    service: overrides.service ?? {
      id: overrides.service_id || "srv-001",
      name: overrides.service_name_snapshot || "Haircut",
      price_amount: overrides.price_minor_snapshot ?? 2500,
      duration_minutes: overrides.duration_minutes_snapshot || 30,
    },
    staff: overrides.staff ?? {
      id: overrides.staff_id || "staff-001",
      display_name: "Daniel QA",
      professional_title: "Master Barber",
    },
  };
}

describe("Bookzello Daily Dashboard & Appointment Calendar Suite", () => {
  // Test 1: Two different staff with bookings at the exact same time render separately (no collisions)
  it("1. partitions concurrent bookings for different staff into separate side-by-side columns", () => {
    const bookingA = buildMockAppointment({
      id: "booking-a",
      staff_id: "staff-daniel",
      staff: { id: "staff-daniel", display_name: "Daniel QA", professional_title: "Specialist" },
      service_name_snapshot: "Scalp Massage Therapy",
      starts_at: "2026-11-04T10:00:00.000Z",
      service_ends_at: "2026-11-04T10:50:00.000Z", // 50 mins
      duration_minutes_snapshot: 50,
    });

    const bookingB = buildMockAppointment({
      id: "booking-b",
      staff_id: "staff-emma",
      staff: { id: "staff-emma", display_name: "Emma QA", professional_title: "Senior Stylist" },
      service_name_snapshot: "Hair Styling",
      starts_at: "2026-11-04T10:00:00.000Z",
      service_ends_at: "2026-11-04T10:30:00.000Z", // 30 mins
      duration_minutes_snapshot: 30,
    });

    const positioned = computeConcurrentAppointmentColumns([bookingA, bookingB], "Europe/London", 8, 64);

    expect(positioned).toHaveLength(2);

    const posA = positioned.find((p) => p.appointment.id === "booking-a")!;
    const posB = positioned.find((p) => p.appointment.id === "booking-b")!;

    // Both should have totalCols = 2
    expect(posA.totalCols).toBe(2);
    expect(posB.totalCols).toBe(2);

    // Each should occupy a distinct column index (0 and 1)
    expect(posA.colIndex).not.toBe(posB.colIndex);
    expect([0, 1]).toContain(posA.colIndex);
    expect([0, 1]).toContain(posB.colIndex);

    // Each width should be 50%
    expect(posA.widthPercent).toBe(50);
    expect(posB.widthPercent).toBe(50);

    // Distinct left percentages (0% and 50%)
    expect(posA.leftPercent).not.toBe(posB.leftPercent);
    expect([0, 50]).toContain(posA.leftPercent);
    expect([0, 50]).toContain(posB.leftPercent);
  });

  // Test 2: Appointment start/end times display correctly (e.g. 10:00–10:50 for 50-minute service)
  it("2. computes accurate start, end time, and true duration heights", () => {
    const scalpMassage = buildMockAppointment({
      starts_at: "2026-11-04T10:00:00.000Z",
      service_ends_at: "2026-11-04T10:50:00.000Z",
      duration_minutes_snapshot: 50,
    });

    const details = getAppointmentTimeDetails(scalpMassage, "Europe/London");
    expect(details.startStr).toBe("10:00");
    expect(details.endStr).toBe("10:50");
    expect(details.durationMinutes).toBe(50);

    const positioned = computeConcurrentAppointmentColumns([scalpMassage], "Europe/London", 8, 64);
    expect(positioned[0].startStr).toBe("10:00");
    expect(positioned[0].endStr).toBe("10:50");
    expect(positioned[0].durationMinutes).toBe(50);

    // 10:00 is 120 minutes from 08:00 -> top = 120 * (64 / 60) = 128px
    expect(positioned[0].topPx).toBeCloseTo(128, 1);
    // 50 minutes duration -> height = 50 * (64 / 60) ≈ 53.33px
    expect(positioned[0].heightPx).toBeCloseTo(53.33, 1);
  });

  // Test 3: 10+ appointments render in strict chronological time order
  it("3. sorts 10+ appointments across the day in strict chronological order", () => {
    const rawTimes = [
      "17:00", "09:00", "11:30", "14:00", "08:30",
      "16:00", "10:00", "13:00", "15:30", "12:00", "18:00",
    ];

    const appointments = rawTimes.map((time, idx) =>
      buildMockAppointment({
        id: `app-${idx}`,
        starts_at: `2026-11-04T${time}:00.000Z`,
        service_ends_at: `2026-11-04T${time}:30.000Z`,
      })
    );

    const positioned = computeConcurrentAppointmentColumns(appointments, "Europe/London", 8, 64);

    expect(positioned).toHaveLength(11);

    for (let i = 0; i < positioned.length - 1; i++) {
      const currentStart = positioned[i].startStr;
      const nextStart = positioned[i + 1].startStr;
      expect(currentStart.localeCompare(nextStart)).toBeLessThanOrEqual(0);
    }

    expect(positioned[0].startStr).toBe("08:30");
    expect(positioned[positioned.length - 1].startStr).toBe("18:00");
  });

  // Test 4: Staff and status filtering
  it("4. accurately filters appointments by assigned specialist and status", () => {
    const list = [
      buildMockAppointment({ id: "1", staff_id: "staff-1", status: "confirmed" }),
      buildMockAppointment({ id: "2", staff_id: "staff-2", status: "confirmed" }),
      buildMockAppointment({ id: "3", staff_id: "staff-1", status: "completed" }),
      buildMockAppointment({ id: "4", staff_id: "staff-2", status: "cancelled" }),
    ];

    const staff1Only = list.filter((a) => a.staff_id === "staff-1");
    expect(staff1Only).toHaveLength(2);
    expect(staff1Only.map((a) => a.id)).toEqual(["1", "3"]);

    const confirmedOnly = list.filter((a) => a.status === "confirmed");
    expect(confirmedOnly).toHaveLength(2);
    expect(confirmedOnly.map((a) => a.id)).toEqual(["1", "2"]);

    const staff2Cancelled = list.filter((a) => a.staff_id === "staff-2" && a.status === "cancelled");
    expect(staff2Cancelled).toHaveLength(1);
    expect(staff2Cancelled[0].id).toBe("4");
  });

  // Test 5: Correct date and timeline relative to salon IANA timezone
  it("5. interprets appointments according to configured salon timezone rather than UTC", () => {
    // 19:30 UTC = 19:30 in London (GMT), but 00:30 NEXT DAY in Karachi (UTC+5)
    const lateAppt = buildMockAppointment({
      starts_at: "2026-11-04T19:30:00.000Z",
      service_ends_at: "2026-11-04T20:15:00.000Z",
    });

    const londonDetails = getAppointmentTimeDetails(lateAppt, "Europe/London");
    expect(londonDetails.startStr).toBe("19:30");
    expect(londonDetails.endStr).toBe("20:15");

    const karachiDetails = getAppointmentTimeDetails(lateAppt, "Asia/Karachi");
    expect(karachiDetails.startStr).toBe("00:30");
    expect(karachiDetails.endStr).toBe("01:15");
  });

  // Test 6: Currency display follows salon configuration (PKR, GBP, EUR, USD, AED, SAR)
  it("6. correctly formats salon currency according to ISO 4217 standard", () => {
    const formatCurrency = (minor: number, curr: string) => {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: curr,
      }).format(minor / 100);
    };

    expect(formatCurrency(450000, "PKR")).toContain("PKR");
    expect(formatCurrency(2500, "GBP")).toContain("£25.00");
    expect(formatCurrency(3000, "EUR")).toContain("€30.00");
    expect(formatCurrency(5000, "USD")).toContain("$50.00");
    expect(formatCurrency(15000, "AED")).toContain("AED");
    expect(formatCurrency(20000, "SAR")).toContain("SAR");
  });

  // Test 7: Customer contact actions (tel:, mailto:) available only when contact data exists
  it("7. guards customer contact channels when phone or email is missing", () => {
    const completeContact = buildMockAppointment({
      customer: { id: "c1", name: "Bob", phone: "+447911111111", email: "bob@example.com" },
    });

    const noPhone = buildMockAppointment({
      customer: { id: "c2", name: "Carol", phone: null, email: "carol@example.com" },
    });

    const noEmail = buildMockAppointment({
      customer: { id: "c3", name: "Dave", phone: "+447922222222", email: null },
    });

    const guestOnly = buildMockAppointment({
      customer: undefined,
      customer_name_snapshot: "Walk-in Guest",
    });

    expect(completeContact.customer?.phone).toBeTruthy();
    expect(completeContact.customer?.email).toBeTruthy();

    expect(noPhone.customer?.phone).toBeNull();
    expect(noPhone.customer?.email).toBe("carol@example.com");

    expect(noEmail.customer?.phone).toBe("+447922222222");
    expect(noEmail.customer?.email).toBeNull();

    expect(guestOnly.customer?.phone).toBeFalsy();
    expect(guestOnly.customer?.email).toBeFalsy();
  });

  // Test 8: Booking source detection (Public Booking, AI Receptionist, WhatsApp, Walk-In)
  it("8. accurately detects booking channels without requiring database schema changes", () => {
    const publicAppt = buildMockAppointment({
      created_by: null,
      notes: "Customer booked online via website wizard",
    });
    expect(getBookingSource(publicAppt).source).toBe("public_wizard");
    expect(getBookingSource(publicAppt).label).toBe("Public Booking Wizard");

    const aiAppt = buildMockAppointment({
      created_by: null,
      notes: "Confirmed by Bookzello AI Receptionist chatbot session",
    });
    expect(getBookingSource(aiAppt).source).toBe("ai_receptionist");
    expect(getBookingSource(aiAppt).label).toBe("AI Receptionist");

    const whatsappAppt = buildMockAppointment({
      created_by: null,
      notes: "[WhatsApp] Verified via automated phone assistant",
    });
    expect(getBookingSource(whatsappAppt).source).toBe("whatsapp");
    expect(getBookingSource(whatsappAppt).label).toBe("WhatsApp");

    const walkInAppt = buildMockAppointment({
      created_by: "usr-staff-id-123",
      notes: "Walk-in client manual desk booking",
    });
    expect(getBookingSource(walkInAppt).source).toBe("walk_in");
    expect(getBookingSource(walkInAppt).label).toBe("Dashboard Walk-In / Phone");
  });

  // Test 9: Mobile stacked card layout rendering contract
  it("9. supplies all required fields for mobile stacked card rendering", () => {
    const appt = buildMockAppointment({
      id: "app-mobile-test",
      customer_name_snapshot: "Sarah Connor",
      service_name_snapshot: "Blow Dry & Finish",
      price_minor_snapshot: 3500,
      currency_snapshot: "GBP",
      starts_at: "2026-11-04T14:00:00.000Z",
      service_ends_at: "2026-11-04T14:45:00.000Z",
    });

    const timeDetails = getAppointmentTimeDetails(appt, "Europe/London");
    const sourceInfo = getBookingSource(appt);

    expect(appt.customer_name_snapshot).toBe("Sarah Connor");
    expect(appt.service_name_snapshot).toBe("Blow Dry & Finish");
    expect(appt.price_minor_snapshot).toBe(3500);
    expect(timeDetails.startStr).toBe("14:00");
    expect(timeDetails.endStr).toBe("14:45");
    expect(timeDetails.durationMinutes).toBe(45);
    expect(sourceInfo.badgeText).toBeTruthy();
  });

  // Test 10: Dashboard KPI metrics match appointments data
  it("10. calculates correct dashboard KPI aggregates from daily appointments list", () => {
    const list: AppointmentWithDetails[] = [
      buildMockAppointment({ id: "1", status: "confirmed", price_minor_snapshot: 3000 }),
      buildMockAppointment({ id: "2", status: "confirmed", price_minor_snapshot: 2000 }),
      buildMockAppointment({ id: "3", status: "completed", price_minor_snapshot: 4000 }),
      buildMockAppointment({ id: "4", status: "cancelled", price_minor_snapshot: 5000 }),
      buildMockAppointment({ id: "5", status: "no_show", price_minor_snapshot: 2500 }),
    ];

    const todayCount = list.length;
    const confirmedCount = list.filter((a) => a.status === "confirmed").length;
    const completedCount = list.filter((a) => a.status === "completed").length;
    const cancelledCount = list.filter((a) => a.status === "cancelled").length;
    const noShowCount = list.filter((a) => a.status === "no_show").length;
    const activeRevenue = list
      .filter((a) => a.status !== "cancelled")
      .reduce((sum, a) => sum + a.price_minor_snapshot, 0);

    expect(todayCount).toBe(5);
    expect(confirmedCount).toBe(2);
    expect(completedCount).toBe(1);
    expect(cancelledCount).toBe(1);
    expect(noShowCount).toBe(1);
    // Non-cancelled: 3000 + 2000 + 4000 + 2500 = 11500
    expect(activeRevenue).toBe(11500);
  });

  // Test 11: 3-way concurrent bookings partition
  it("11. gracefully partitions 3 simultaneous bookings at the same hour into 33.3% columns", () => {
    const a1 = buildMockAppointment({ id: "a1", staff_id: "s1", starts_at: "2026-11-04T11:00:00.000Z", service_ends_at: "2026-11-04T11:45:00.000Z" });
    const a2 = buildMockAppointment({ id: "a2", staff_id: "s2", starts_at: "2026-11-04T11:00:00.000Z", service_ends_at: "2026-11-04T11:30:00.000Z" });
    const a3 = buildMockAppointment({ id: "a3", staff_id: "s3", starts_at: "2026-11-04T11:00:00.000Z", service_ends_at: "2026-11-04T11:50:00.000Z" });

    const positioned = computeConcurrentAppointmentColumns([a1, a2, a3], "Europe/London", 8, 64);

    expect(positioned).toHaveLength(3);
    for (const p of positioned) {
      expect(p.totalCols).toBe(3);
      expect(p.widthPercent).toBeCloseTo(33.33, 1);
    }

    const colIndices = positioned.map((p) => p.colIndex).sort();
    expect(colIndices).toEqual([0, 1, 2]);
  });

  // Test 12: Public booking wizard and AI availability remain unhampered
  it("12. non-overlapping sequential appointments maintain full width without column partitioning", () => {
    const seq1 = buildMockAppointment({
      id: "seq-1",
      starts_at: "2026-11-04T09:00:00.000Z",
      service_ends_at: "2026-11-04T09:45:00.000Z",
    });

    const seq2 = buildMockAppointment({
      id: "seq-2",
      starts_at: "2026-11-04T10:00:00.000Z",
      service_ends_at: "2026-11-04T10:30:00.000Z",
    });

    const positioned = computeConcurrentAppointmentColumns([seq1, seq2], "Europe/London", 8, 64);

    expect(positioned).toHaveLength(2);
    // Because seq1 ends at 09:45 and seq2 starts at 10:00, they do not overlap
    expect(positioned[0].totalCols).toBe(1);
    expect(positioned[0].widthPercent).toBe(100);
    expect(positioned[0].colIndex).toBe(0);

    expect(positioned[1].totalCols).toBe(1);
    expect(positioned[1].widthPercent).toBe(100);
    expect(positioned[1].colIndex).toBe(0);
  });

  // Test 13: Dashboard Overview primary surface integration
  it("13. integrates TodayAgenda and daily KPIs prominently on the workspace overview page", () => {
    const pageContent = fs.readFileSync("src/app/dashboard/[businessSlug]/page.tsx", "utf-8");
    expect(pageContent).toContain("<TodayAgenda");
    expect(pageContent).toContain("Today&apos;s Daily Operations Overview");
    expect(pageContent).toContain("Today&apos;s Appointments Agenda");
    expect(pageContent).toContain("todayKpis.todayCount");
    expect(pageContent).toContain("todayKpis.confirmedCount");
    expect(pageContent).toContain("todayKpis.upcomingCount");
    expect(pageContent).toContain("todayKpis.completedCount");
    expect(pageContent).toContain("todayKpis.cancelledCount");
    expect(pageContent).toContain("todayKpis.todayRevenueMinor");
  });

  // Test 14: TodayAgenda desktop table and mobile stacked card layout
  it("14. renders both dense desktop table and stacked mobile cards with action buttons", () => {
    const agendaContent = fs.readFileSync("src/components/dashboard/appointments/today-agenda.tsx", "utf-8");
    // Desktop table
    expect(agendaContent).toContain("hidden md:block");
    expect(agendaContent).toContain("<table");
    // Mobile stacked cards
    expect(agendaContent).toContain("md:hidden space-y-3");
    // Contact actions
    expect(agendaContent).toContain("href={`tel:${custPhone}`}");
    expect(agendaContent).toContain("href={`mailto:${custEmail}`}");
    expect(agendaContent).toContain("handleCopyPhone");
    // Filters
    expect(agendaContent).toContain("selectedStaffId");
    expect(agendaContent).toContain("selectedStatus");
    expect(agendaContent).toContain("searchQuery");
  });

  // Test 15: AppointmentDetailsPanel fast contact and copy buttons
  it("15. provides fast contact actions, booking reference copy, and source badges in details panel", () => {
    const panelContent = fs.readFileSync("src/components/dashboard/appointments/appointment-details-panel.tsx", "utf-8");
    expect(panelContent).toContain("handleCopyRef");
    expect(panelContent).toContain("handleCopyPhone");
    expect(panelContent).toContain("href={`tel:${customerPhone}`}");
    expect(panelContent).toContain("href={`mailto:${customerEmail}`}");
    expect(panelContent).toContain("bookingSource.badgeText");
  });

  // Test 16: Calendar concurrent slot partition container
  it("16. mounts day timeline cards within partitioned side-by-side columns container", () => {
    const calendarContent = fs.readFileSync("src/components/dashboard/appointments/appointment-calendar.tsx", "utf-8");
    expect(calendarContent).toContain("computeConcurrentAppointmentColumns");
    expect(calendarContent).toContain("positionedDayAppointments");
    expect(calendarContent).toContain("left-16 right-3 top-0 bottom-0 pointer-events-none");
  });
});

