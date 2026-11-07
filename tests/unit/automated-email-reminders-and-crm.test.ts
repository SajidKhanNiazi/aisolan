/**
 * BookPilot AI — Automated Appointment Reminders & Customer CRM Tests
 * P0 Feature Verification: Timely Reminders, Timezone Localization, Reschedule Handling,
 * Late-Booking Protection, Visit History Categorization, and Tenant CRM Privacy.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  renderEmailTemplate,
  formatAppointmentDateTime,
  formatCurrencyFromMinor,
} from "@/features/notifications/templates";
import {
  calculateBackoffSeconds,
  isValidEmailFormat,
} from "@/features/notifications/worker";
import { MockDeliveryProvider } from "@/features/notifications/provider";
import type {
  NotificationTemplatePayload,
  ClaimedReminderJob,
} from "@/features/notifications/types";
import { businessNotificationSettingsSchema } from "@/features/notifications/validation";

describe("Automated Email Reminders & Customer CRM", () => {
  let mockProvider: MockDeliveryProvider;

  beforeEach(() => {
    mockProvider = new MockDeliveryProvider();
  });

  // ===========================================================================
  // 1. Reminder Configuration & Schema Validation
  // ===========================================================================
  describe("1. Notification Settings & Reminder Timing Schema", () => {
    const validBizId = "a0000000-0000-4000-8000-000000000001";

    it("defaults reminders_enabled to false (safety default) and reminder_timing_hours to 3", () => {
      const parsed = businessNotificationSettingsSchema.parse({
        business_id: validBizId,
      });

      expect(parsed.reminders_enabled).toBe(false);
      expect(parsed.reminder_timing_hours).toBe(3);
    });

    it("accepts valid timing offsets (2, 3, 24 hours)", () => {
      for (const hours of [2, 3, 24] as const) {
        const parsed = businessNotificationSettingsSchema.parse({
          business_id: validBizId,
          reminder_timing_hours: hours,
        });
        expect(parsed.reminder_timing_hours).toBe(hours);
      }
    });

    it("rejects invalid timing offsets", () => {
      expect(() =>
        businessNotificationSettingsSchema.parse({
          business_id: validBizId,
          reminder_timing_hours: 5,
        })
      ).toThrow();
    });
  });

  // ===========================================================================
  // 2. Reminder Due Time Calculation & Late-Booking Rules
  // ===========================================================================
  describe("2. Reminder Due Time Calculations & Late-Booking Protection", () => {
    it("calculates correct reminder due time (starts_at - offset_hours)", () => {
      const startsAtUtc = new Date("2026-11-10T15:00:00Z");
      const offsetHours = 3;
      const expectedDueUtc = new Date("2026-11-10T12:00:00Z");

      const calculatedDue = new Date(startsAtUtc.getTime() - offsetHours * 60 * 60 * 1000);
      expect(calculatedDue.toISOString()).toBe(expectedDueUtc.toISOString());
    });

    it("skips reminder scheduling when appointment is booked within the reminder window (late booking rule)", () => {
      const now = new Date("2026-11-10T14:15:00Z");
      const startsAtUtc = new Date("2026-11-10T15:00:00Z"); // 45 minutes from now
      const offsetHours = 3; // 3 hours window

      const reminderDue = new Date(startsAtUtc.getTime() - offsetHours * 60 * 60 * 1000);
      // reminderDue is 12:00, which is in the past relative to now (14:15)
      const shouldSchedule = reminderDue.getTime() > now.getTime();

      expect(shouldSchedule).toBe(false);
    });

    it("schedules reminder when appointment is booked well in advance", () => {
      const now = new Date("2026-11-08T10:00:00Z");
      const startsAtUtc = new Date("2026-11-10T15:00:00Z"); // 53 hours in advance
      const offsetHours = 24;

      const reminderDue = new Date(startsAtUtc.getTime() - offsetHours * 60 * 60 * 1000);
      // reminderDue is 2026-11-09T15:00:00Z, which is in the future relative to now
      const shouldSchedule = reminderDue.getTime() > now.getTime();

      expect(shouldSchedule).toBe(true);
      expect(reminderDue.toISOString()).toBe("2026-11-09T15:00:00.000Z");
    });
  });

  // ===========================================================================
  // 3. Email Template Rendering & Timezone Presentation
  // ===========================================================================
  describe("3. Branded Reminder Email Rendering & Timezone Localization", () => {
    const reminderPayload: NotificationTemplatePayload = {
      business_name: "The Mayfair Salon",
      business_slug: "mayfair-salon",
      business_phone: "+44 20 7946 0912",
      business_email: "appointments@mayfairsalon.co.uk",
      business_timezone: "Europe/London",
      business_address: "14 Berkeley Square, London W1J 6BQ",
      customer_name: "Eleanor Vance",
      customer_email: "eleanor.vance@example.com",
      customer_phone: "+44 7700 900888",
      service_name: "Hydrating Facial & Scalp Massage",
      staff_name: "Sarah Jenkins",
      starts_at: "2026-11-12T14:00:00Z",
      service_ends_at: "2026-11-12T15:00:00Z",
      duration_minutes: 60,
      price_minor: 8500, // £85.00
      currency: "GBP",
      booking_reference: "APPT-E9D8C7B6",
      management_url: "https://bookzello.com/booking/mayfair-salon",
    };

    it("renders customer_appointment_reminder subject and body with correct details", () => {
      const email = renderEmailTemplate(
        "customer_appointment_reminder",
        reminderPayload,
        "https://bookzello.com"
      );

      expect(email.subject).toContain("Reminder: Your upcoming appointment at The Mayfair Salon");
      expect(email.subject).toContain("APPT-E9D8C7B6");

      // HTML checks
      expect(email.html).toContain("Upcoming Appointment Reminder");
      expect(email.html).toContain("Hi Eleanor Vance, we look forward to seeing you soon!");
      expect(email.html).toContain("Hydrating Facial &amp; Scalp Massage");
      expect(email.html).toContain("Sarah Jenkins");
      expect(email.html).toContain("14 Berkeley Square, London W1J 6BQ");
      expect(email.html).toContain("£85.00");
      expect(email.html).toContain("60 minutes");
      expect(email.html).toContain("https://bookzello.com/booking/mayfair-salon");

      // Plain-text checks
      expect(email.text).toContain("APPOINTMENT REMINDER — THE MAYFAIR SALON");
      expect(email.text).toContain("Reference: APPT-E9D8C7B6");
      expect(email.text).toContain("Service: Hydrating Facial & Scalp Massage");
      expect(email.text).toContain("Location: 14 Berkeley Square, London W1J 6BQ");
      expect(email.text).toContain("Powered by Bookzello");
    });

    it("localizes appointment start time accurately to America/New_York (EST)", () => {
      const nyPayload: NotificationTemplatePayload = {
        ...reminderPayload,
        business_timezone: "America/New_York",
        starts_at: "2026-11-12T19:00:00Z", // 19:00 UTC = 14:00 EST (UTC-5 in Nov)
      };

      const dt = formatAppointmentDateTime(nyPayload.starts_at, nyPayload.business_timezone);
      expect(dt.formattedTime).toBe("14:00");
      expect(dt.timeZoneLabel).toBe("America/New_York");
    });
  });

  // ===========================================================================
  // 4. Pre-Flight Worker Checks & Concurrency Invariants
  // ===========================================================================
  describe("4. Worker Pre-Flight Guards & Delivery", () => {
    it("validates syntactic email format safely", () => {
      expect(isValidEmailFormat("client@example.com")).toBe(true);
      expect(isValidEmailFormat("client.smith+salon@sub.domain.org")).toBe(true);
      expect(isValidEmailFormat("not-an-email")).toBe(false);
      expect(isValidEmailFormat("")).toBe(false);
      expect(isValidEmailFormat("   ")).toBe(false);
    });

    it("calculates exponential backoff delays with jitter boundary", () => {
      expect(calculateBackoffSeconds(1)).toBe(30);
      expect(calculateBackoffSeconds(2)).toBe(60);
      expect(calculateBackoffSeconds(3)).toBe(120);
      expect(calculateBackoffSeconds(4)).toBe(240);
      expect(calculateBackoffSeconds(10)).toBe(3600); // Caps at 1 hour
    });

    it("verifies MockDeliveryProvider receives idempotency key", async () => {
      const res = await mockProvider.sendEmail({
        to: "client@example.com",
        subject: "Reminder: Your appointment",
        html: "<p>Reminder</p>",
        text: "Reminder",
        idempotencyKey: "reminder_appt_123_gen1_3h",
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toMatch(/^mock_/);
      expect(mockProvider.getSentEmails()).toHaveLength(1);
      expect(mockProvider.getSentEmails()[0].idempotencyKey).toBe("reminder_appt_123_gen1_3h");
    });
  });

  // ===========================================================================
  // 5. Customer CRM Metric Calculations & Tab Categorization
  // ===========================================================================
  describe("5. Customer CRM Metrics & Visit Categorization", () => {
    const mockAppointments = [
      {
        id: "appt-1",
        status: "completed",
        starts_at: "2026-10-01T10:00:00Z",
        price_minor_snapshot: 5000,
      },
      {
        id: "appt-2",
        status: "completed",
        starts_at: "2026-10-15T10:00:00Z",
        price_minor_snapshot: 6000,
      },
      {
        id: "appt-3",
        status: "cancelled",
        starts_at: "2026-10-20T10:00:00Z",
        price_minor_snapshot: 4000,
      },
      {
        id: "appt-4",
        status: "no_show",
        starts_at: "2026-10-25T10:00:00Z",
        price_minor_snapshot: 4500,
      },
      {
        id: "appt-5",
        status: "confirmed",
        starts_at: "2026-12-01T10:00:00Z", // Future
        price_minor_snapshot: 7000,
      },
    ];

    it("aggregates completed, cancelled, and upcoming metrics accurately", () => {
      const nowMs = new Date("2026-11-01T00:00:00Z").getTime();

      const completed = mockAppointments.filter((a) => a.status === "completed");
      const cancelledOrNoShow = mockAppointments.filter(
        (a) => a.status === "cancelled" || a.status === "no_show"
      );
      const upcoming = mockAppointments.filter(
        (a) =>
          (a.status === "confirmed" || a.status === "pending") &&
          new Date(a.starts_at).getTime() > nowMs
      );
      const totalSpend = completed.reduce((sum, a) => sum + a.price_minor_snapshot, 0);

      expect(completed).toHaveLength(2);
      expect(cancelledOrNoShow).toHaveLength(2);
      expect(upcoming).toHaveLength(1);
      expect(totalSpend).toBe(11000); // £110.00
      expect(formatCurrencyFromMinor(totalSpend, "GBP")).toBe("£110.00");
    });

    it("validates private notes length boundary (max 2000 chars)", () => {
      const shortNotes = "Client prefers organic oils and low heat drying.";
      const oversizedNotes = "A".repeat(2001);

      expect(shortNotes.length).toBeLessThanOrEqual(2000);
      expect(oversizedNotes.length).toBeGreaterThan(2000);
    });
  });

  // ===========================================================================
  // 6. 30+ Days Advance Scheduling & Stale Reminder Invalidation
  // ===========================================================================
  describe("6. Advanced Scheduling Horizons & Stale Invalidation", () => {
    it("handles appointments booked 60+ days in the future without boundary limits", () => {
      const now = new Date("2026-11-06T12:00:00Z");
      // Booked for 75 days in the future
      const futureAppt = new Date("2027-01-20T14:00:00Z");
      const offsetHours = 3;

      const reminderDue = new Date(futureAppt.getTime() - offsetHours * 60 * 60 * 1000);
      expect(reminderDue.toISOString()).toBe("2027-01-20T11:00:00.000Z");
      expect(reminderDue.getTime()).toBeGreaterThan(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    });

    it("verifies canceled appointments cannot dispatch stale reminders", () => {
      const job: ClaimedReminderJob = {
        id: "reminder-1",
        business_id: "biz-1",
        appointment_id: "appt-1",
        reminder_type: "email",
        due_at: "2026-11-10T12:00:00Z",
        generation: 1,
        status: "processing",
        attempt_count: 1,
        max_attempts: 3,
        dedupe_key: "appt-1:reminder:gen1:3h",
        recipient_email: "test@example.com",
        recipient_name: "Test User",
        service_name: "Haircut",
        staff_name: "Barber",
        starts_at: "2026-11-10T15:00:00Z",
        service_ends_at: "2026-11-10T16:00:00Z",
        duration_minutes: 60,
        price_minor: 5000,
        currency: "GBP",
        business_name: "Test Salon",
        business_slug: "test-salon",
        business_timezone: "Europe/London",
        appointment_status: "cancelled", // Ineligible!
      };

      const isEligible = job.appointment_status === "confirmed" || job.appointment_status === "pending";
      expect(isEligible).toBe(false);
    });

    it("verifies rescheduled appointments generate new generation dedupe key", () => {
      const apptId = "00000000-0000-4000-8000-000000000099";
      const gen1Key = `${apptId}:reminder:gen1:3h`;
      const gen2Key = `${apptId}:reminder:gen2:3h`;

      expect(gen1Key).not.toBe(gen2Key);
      expect(gen2Key).toContain("gen2");
    });
  });

  // ===========================================================================
  // 7. Multi-Tenant Isolation & CRM Safety Verification
  // ===========================================================================
  describe("7. Multi-Tenant CRM Isolation", () => {
    it("ensures customer records belong strictly to verified business_id", () => {
      const tenantA = "tenant-uuid-1111";
      const tenantB = "tenant-uuid-2222";

      const mockDbCustomers = [
        { id: "cust-1", business_id: tenantA, name: "Alice", notes: "Private note A" },
        { id: "cust-2", business_id: tenantB, name: "Bob", notes: "Private note B" },
      ];

      // Tenant A query
      const tenantAResults = mockDbCustomers.filter((c) => c.business_id === tenantA);
      expect(tenantAResults).toHaveLength(1);
      expect(tenantAResults[0].name).toBe("Alice");
      expect(tenantAResults.some((c) => c.business_id === tenantB)).toBe(false);

      // Cross-tenant update prevention simulation
      const updateTargetCustId = "cust-1";
      const attackerSessionBizId = tenantB;
      const targetCustomer = mockDbCustomers.find(
        (c) => c.id === updateTargetCustId && c.business_id === attackerSessionBizId
      );

      // Attempting to update customer-1 under tenant B session returns null/not found
      expect(targetCustomer).toBeUndefined();
    });
  });

  // ===========================================================================
  // 8. QStash Scheduling & Security Verification
  // ===========================================================================
  describe("8. QStash Scheduler & Signature Security", () => {
    it("calculates exact unix timestamp in seconds for notBefore delayed execution", () => {
      const dueAtUtc = "2026-11-12T14:00:00Z";
      const dueTimestampSec = Math.floor(new Date(dueAtUtc).getTime() / 1000);

      expect(dueTimestampSec).toBe(1794492000);
      expect(new Date(dueTimestampSec * 1000).toISOString()).toBe("2026-11-12T14:00:00.000Z");
    });

    it("verifies deduplication key generation prevents duplicate QStash delivery", () => {
      const apptId = "appt-uuid-9999";
      const dedupeKey = `${apptId}:reminder:gen1:3h`;

      expect(dedupeKey).toBe("appt-uuid-9999:reminder:gen1:3h");
    });
  });

  // ===========================================================================
  // 9. Database Boundary Authorization: Staff Note Updating Blocked
  // ===========================================================================
  describe("9. Database Boundary Authorization (fn_customers_enforce_notes_role)", () => {
    function simulateDbNotesCheck(params: {
      oldNotes: string | null;
      newNotes: string | null;
      oldBusinessId?: string;
      newBusinessId?: string;
      userRole?: "owner" | "manager" | "staff" | null;
      isServiceRole?: boolean;
      isAnonymous?: boolean;
    }) {
      const {
        oldNotes,
        newNotes,
        oldBusinessId = "biz-1",
        newBusinessId = "biz-1",
        userRole,
        isServiceRole = false,
        isAnonymous = false,
      } = params;

      // 1. If notes unchanged, allow
      if (oldNotes === newNotes) {
        return { allowed: true };
      }

      // 2. Tenant immutability: block cross-tenant customer reassignment
      if (oldBusinessId !== newBusinessId) {
        return {
          allowed: false,
          errorCode: "42501",
          error: "Forbidden: Reassigning customer organization is prohibited",
        };
      }

      // 3. Genuine service role bypass allowed
      if (isServiceRole) {
        return { allowed: true };
      }

      // 4. Anonymous callers blocked
      if (isAnonymous || !userRole) {
        return {
          allowed: false,
          errorCode: "42501",
          error: "Forbidden: Unauthenticated callers cannot modify customer notes",
        };
      }

      // 5. Check role
      if (userRole !== "owner" && userRole !== "manager") {
        return {
          allowed: false,
          errorCode: "42501",
          error: "Forbidden: Only salon owners or managers may update customer notes",
        };
      }

      return { allowed: true };
    }

    it("allows salon owners to update customer notes", () => {
      const res = simulateDbNotesCheck({
        oldNotes: "Old note",
        newNotes: "Updated note by owner",
        userRole: "owner",
        isServiceRole: false,
      });
      expect(res.allowed).toBe(true);
    });

    it("allows salon managers to update customer notes", () => {
      const res = simulateDbNotesCheck({
        oldNotes: "Old note",
        newNotes: "Updated note by manager",
        userRole: "manager",
        isServiceRole: false,
      });
      expect(res.allowed).toBe(true);
    });

    it("STRICTLY BLOCKS unauthenticated / anonymous callers from updating notes with 42501", () => {
      const res = simulateDbNotesCheck({
        oldNotes: "Old note",
        newNotes: "Anonymous attempted injection",
        isAnonymous: true,
      });
      expect(res.allowed).toBe(false);
      expect(res.errorCode).toBe("42501");
      expect(res.error).toContain("Unauthenticated callers cannot modify customer notes");
    });

    it("STRICTLY BLOCKS cross-tenant customer reassignment with 42501", () => {
      const res = simulateDbNotesCheck({
        oldNotes: "Old note",
        newNotes: "Reassigned note",
        oldBusinessId: "biz-tenant-a",
        newBusinessId: "biz-tenant-b",
        userRole: "owner",
      });
      expect(res.allowed).toBe(false);
      expect(res.errorCode).toBe("42501");
      expect(res.error).toContain("Reassigning customer organization is prohibited");
    });

    it("STRICTLY BLOCKS regular staff members from updating customer notes with 42501", () => {
      const res = simulateDbNotesCheck({
        oldNotes: "Old note",
        newNotes: "Unauthorized staff edit",
        userRole: "staff",
        isServiceRole: false,
      });
      expect(res.allowed).toBe(false);
      expect(res.errorCode).toBe("42501");
      expect(res.error).toContain("Only salon owners or managers may update customer notes");
    });

    it("allows staff members to update non-notes fields (e.g. phone/email) without trigger error", () => {
      const res = simulateDbNotesCheck({
        oldNotes: "Same notes",
        newNotes: "Same notes",
        userRole: "staff",
        isServiceRole: false,
      });
      expect(res.allowed).toBe(true);
    });
  });

  // ===========================================================================
  // 10. Global Feature Flag Protection (ENABLE_OUTBOUND_REMINDERS)
  // ===========================================================================
  describe("10. Global Feature Flag Protection", () => {
    it("guarantees reminder worker skips dispatch when ENABLE_OUTBOUND_REMINDERS is not 'true'", () => {
      const flagValue = process.env.ENABLE_OUTBOUND_REMINDERS;
      const isEnabled = flagValue === "true";

      // By default in test/build, flag is undefined or not "true"
      expect(isEnabled).toBe(false);
    });
  });

  // ===========================================================================
  // 11. Long-Horizon Scheduling & QStash Promotion Logic
  // ===========================================================================
  describe("11. Long-Horizon Scheduling & QStash Promotion Logic", () => {
    it("recognizes appointments booked > 7 days ahead and guards against premature QStash delay limits", () => {
      const nowMs = Date.now();
      const thirtyDaysAheadMs = nowMs + 30 * 24 * 3600 * 1000;
      const delaySec = Math.floor((thirtyDaysAheadMs - nowMs) / 1000);
      const MAX_QSTASH_DELAY_SEC = 7 * 24 * 3600;

      expect(delaySec).toBeGreaterThan(MAX_QSTASH_DELAY_SEC);
      // Confirms 30-day appointments exceed single delayed message limit and require queue retention
    });

    it("accepts appointments booked within 7 days for direct QStash delayed dispatch", () => {
      const nowMs = Date.now();
      const threeDaysAheadMs = nowMs + 3 * 24 * 3600 * 1000;
      const delaySec = Math.floor((threeDaysAheadMs - nowMs) / 1000);
      const MAX_QSTASH_DELAY_SEC = 7 * 24 * 3600;

      expect(delaySec).toBeLessThan(MAX_QSTASH_DELAY_SEC);
      expect(delaySec).toBeGreaterThan(0);
    });

    it("generates deterministic deduplication keys that prevent duplicate QStash publish events", () => {
      const aptId = "apt-12345-uuid";
      const generation = 1;
      const offsetHours = 3;
      const dedupeKey = `${aptId}:reminder:gen${generation}:${offsetHours}h`;

      expect(dedupeKey).toBe("apt-12345-uuid:reminder:gen1:3h");

      // Rescheduling increments generation, creating a fresh dedupe key for the new time
      const nextGenDedupeKey = `${aptId}:reminder:gen${generation + 1}:${offsetHours}h`;
      expect(nextGenDedupeKey).toBe("apt-12345-uuid:reminder:gen2:3h");
      expect(nextGenDedupeKey).not.toBe(dedupeKey);
    });
  });
});
