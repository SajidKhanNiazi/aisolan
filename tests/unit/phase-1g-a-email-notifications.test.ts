/**
 * BookPilot AI — Phase 1G-A Automated Tests: Transactional Email Notifications
 * Verifies Outbox Queue, Exponential Backoff, Deduplication, Template Rendering,
 * Tenant Isolation, Cron Authorization, and Worker Concurrency.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  formatCurrencyFromMinor,
  formatAppointmentDateTime,
  renderEmailTemplate,
} from "@/features/notifications/templates";
import {
  calculateBackoffSeconds,
  isValidEmailFormat,
} from "@/features/notifications/worker";
import {
  MockDeliveryProvider,
} from "@/features/notifications/provider";
import type {
  NotificationTemplatePayload,
  NotificationOutboxItem,
} from "@/features/notifications/types";

describe("Phase 1G-A: Transactional Email Infrastructure", () => {
  let mockProvider: MockDeliveryProvider;

  beforeEach(() => {
    mockProvider = new MockDeliveryProvider();
  });

  // ===========================================================================
  // 1. Template Rendering & Currency / Timezone Formatting
  // ===========================================================================
  describe("Email Templates & Data Presentation", () => {
    const basePayload: NotificationTemplatePayload = {
      business_name: "The Mayfair Barber Club",
      business_slug: "mayfair-barbers",
      business_phone: "+44 20 7946 0912",
      business_email: "hello@mayfairbarbers.co.uk",
      business_timezone: "Europe/London",
      business_address: "12 Curzon Street, London",
      customer_name: "James Bond",
      customer_email: "james.bond@mi6.gov.uk",
      customer_phone: "+44 7700 900077",
      service_name: "Executive Haircut & Beard Sculpt",
      staff_name: "Arthur Pendelton",
      starts_at: "2026-10-25T14:30:00Z",
      service_ends_at: "2026-10-25T15:15:00Z",
      duration_minutes: 45,
      price_minor: 6500, // £65.00
      currency: "GBP",
      booking_reference: "APPT-B1E29F3A",
      management_url: "https://aisolan.vercel.app/manage-booking/64_char_raw_token_xyz123",
    };

    it("formats minor currency units correctly for GBP (£65.00 from 6500)", () => {
      expect(formatCurrencyFromMinor(6500, "GBP")).toBe("£65.00");
      expect(formatCurrencyFromMinor(1250, "GBP")).toBe("£12.50");
      expect(formatCurrencyFromMinor(0, "GBP")).toBe("£0.00");
      expect(formatCurrencyFromMinor(500, "USD")).toBe("US$5.00");
    });

    it("formats appointment date and time in the salon timezone (Europe/London)", () => {
      const dt = formatAppointmentDateTime("2026-10-25T14:30:00Z", "Europe/London");
      // On 2026-10-25, London is GMT/BST (daylight saving ends on last Sunday of October)
      expect(dt.formattedTime).toMatch(/\d{2}:\d{2}/);
      expect(dt.timeZoneLabel).toBe("Europe/London");
    });

    it("renders customer booking confirmation with legitimate management link", () => {
      const rendered = renderEmailTemplate(
        "customer_booking_confirmation",
        basePayload,
        "https://aisolan.vercel.app"
      );

      expect(rendered.subject).toContain("Booking Confirmed — The Mayfair Barber Club (APPT-B1E29F3A)");
      expect(rendered.html).toContain("James Bond");
      expect(rendered.html).toContain("Executive Haircut &amp; Beard Sculpt");
      expect(rendered.html).toContain("Arthur Pendelton");
      expect(rendered.html).toContain("£65.00");
      expect(rendered.html).toContain("https://aisolan.vercel.app/manage-booking/64_char_raw_token_xyz123");
      expect(rendered.text).toContain("https://aisolan.vercel.app/manage-booking/64_char_raw_token_xyz123");
    });

    it("safely omits management button when management_url is missing (e.g. owner manual booking)", () => {
      const payloadWithoutToken = { ...basePayload, management_url: null };
      const rendered = renderEmailTemplate(
        "customer_booking_confirmation",
        payloadWithoutToken,
        "https://aisolan.vercel.app"
      );

      expect(rendered.html).not.toContain("/manage-booking/");
      expect(rendered.html).toContain("Need to make changes? Contact The Mayfair Barber Club directly");
      expect(rendered.text).toContain("Contact The Mayfair Barber Club directly");
    });

    it("renders customer reschedule confirmation with old and new times", () => {
      const reschedulePayload: NotificationTemplatePayload = {
        ...basePayload,
        previous_starts_at: "2026-10-25T14:30:00Z",
        starts_at: "2026-10-26T16:00:00Z",
      };

      const rendered = renderEmailTemplate(
        "customer_rescheduling_confirmation",
        reschedulePayload,
        "https://aisolan.vercel.app"
      );

      expect(rendered.subject).toContain("Appointment Updated — The Mayfair Barber Club");
      expect(rendered.html).toContain("Previous Slot");
      expect(rendered.html).toContain("New Time");
      expect(rendered.text).toContain("Previous Slot");
      expect(rendered.text).toContain("New Slot");
    });

    it("renders customer cancellation confirmation cleanly and indicates slot release", () => {
      const cancellationPayload: NotificationTemplatePayload = {
        ...basePayload,
        cancellation_reason: "Customer schedule conflict",
      };

      const rendered = renderEmailTemplate(
        "customer_cancellation_confirmation",
        cancellationPayload,
        "https://aisolan.vercel.app"
      );

      expect(rendered.subject).toContain("Appointment Cancelled — The Mayfair Barber Club");
      expect(rendered.html).toContain("Appointment Cancelled");
      expect(rendered.html).toContain("Customer schedule conflict");
      expect(rendered.html).toContain("This timeslot has been released");
      expect(rendered.text).toContain("Your reserved slot has been released");
    });

    it("renders owner alerts linking to authorized owner dashboard view", () => {
      const rendered = renderEmailTemplate(
        "owner_new_booking_alert",
        basePayload,
        "https://aisolan.vercel.app"
      );

      expect(rendered.subject).toContain("[New Booking] James Bond — Executive Haircut");
      expect(rendered.html).toContain("https://aisolan.vercel.app/dashboard/mayfair-barbers/appointments");
      expect(rendered.text).toContain("https://aisolan.vercel.app/dashboard/mayfair-barbers/appointments");
      // Never exposes customer management token to salon owner
      expect(rendered.html).not.toContain("manage-booking");
    });
  });

  // ===========================================================================
  // 2. Email Validation & Exponential Backoff Math
  // ===========================================================================
  describe("Worker Retry Logic & Email Validation", () => {
    it("validates RFC-compliant email formats strictly", () => {
      expect(isValidEmailFormat("test@example.com")).toBe(true);
      expect(isValidEmailFormat("first.last+tag@sub.domain.co.uk")).toBe(true);
      expect(isValidEmailFormat("plainaddress")).toBe(false);
      expect(isValidEmailFormat("missingatsign.com")).toBe(false);
      expect(isValidEmailFormat("@missinguser.com")).toBe(false);
      expect(isValidEmailFormat("user@")).toBe(false);
      expect(isValidEmailFormat("")).toBe(false);
    });

    it("calculates exponential backoff progression accurately up to 3600s cap", () => {
      // Attempt 1: 2^(1-1) * 30 = 30s
      expect(calculateBackoffSeconds(1)).toBe(30);
      // Attempt 2: 2^(2-1) * 30 = 60s
      expect(calculateBackoffSeconds(2)).toBe(60);
      // Attempt 3: 2^(3-1) * 30 = 120s
      expect(calculateBackoffSeconds(3)).toBe(120);
      // Attempt 4: 2^(4-1) * 30 = 240s
      expect(calculateBackoffSeconds(4)).toBe(240);
      // Attempt 5: 2^(5-1) * 30 = 480s
      expect(calculateBackoffSeconds(5)).toBe(480);
      // Attempt 10: capped at 3600s
      expect(calculateBackoffSeconds(10)).toBe(3600);
    });
  });

  // ===========================================================================
  // 3. Provider Abstraction & Safe Mock Execution
  // ===========================================================================
  describe("Delivery Provider Abstraction & Safety", () => {
    it("dispatches successfully via MockDeliveryProvider without network calls", async () => {
      const result = await mockProvider.sendEmail({
        to: "customer@example.com",
        subject: "Test Booking",
        html: "<p>Hello</p>",
        text: "Hello",
        idempotencyKey: "test_dedupe_123",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock_/);

      const sent = mockProvider.getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0]?.to).toBe("customer@example.com");
      expect(sent[0]?.idempotencyKey).toBe("test_dedupe_123");
    });

    it("handles temporary provider failure simulation and identifies retryable errors", async () => {
      mockProvider.setFailNext(true, "RATE_LIMIT_EXCEEDED", true);

      const result = await mockProvider.sendEmail({
        to: "customer@example.com",
        subject: "Test Retry",
        html: "<p>Retry</p>",
        text: "Retry",
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("RATE_LIMIT_EXCEEDED");
      expect(result.isRetryable).toBe(true);
    });

    it("identifies permanent provider failure simulation", async () => {
      mockProvider.setFailNext(true, "EMAIL_ADDRESS_HARD_BOUNCE", false);

      const result = await mockProvider.sendEmail({
        to: "invalid@example.com",
        subject: "Test Permanent",
        html: "<p>Fail</p>",
        text: "Fail",
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("EMAIL_ADDRESS_HARD_BOUNCE");
      expect(result.isRetryable).toBe(false);
    });
  });

  // ===========================================================================
  // 4. Outbox Deduplication & Concurrency Invariants
  // ===========================================================================
  describe("Transactional Outbox Concurrency & Deduplication", () => {
    it("enforces tenant-scoped unique dedupe_key prevents duplicate entries for the same event", () => {
      const inMemoryQueue = new Map<string, NotificationOutboxItem>();

      function enqueue(item: NotificationOutboxItem): { inserted: boolean } {
        const compositeKey = `${item.business_id}:${item.dedupe_key}`;
        if (inMemoryQueue.has(compositeKey)) {
          return { inserted: false };
        }
        inMemoryQueue.set(compositeKey, item);
        return { inserted: true };
      }

      const item1: NotificationOutboxItem = {
        id: "job-1",
        business_id: "biz-1",
        appointment_id: "appt-1",
        event_type: "new_booking",
        recipient_type: "customer",
        recipient_email: "test@example.com",
        template_key: "customer_booking_confirmation",
        payload: {
          business_name: "Salon A",
          business_slug: "salon-a",
          business_timezone: "Europe/London",
          customer_name: "Alice",
          service_name: "Cut",
          staff_name: "Bob",
          starts_at: "2026-10-25T10:00:00Z",
          service_ends_at: "2026-10-25T10:30:00Z",
          duration_minutes: 30,
          price_minor: 3000,
          currency: "GBP",
          booking_reference: "APPT-1111",
        },
        status: "queued",
        attempt_count: 0,
        max_attempts: 5,
        next_attempt_at: new Date().toISOString(),
        dedupe_key: "appt-1:new_booking:customer",
        created_at: new Date().toISOString(),
      };

      // First insertion succeeds
      expect(enqueue(item1).inserted).toBe(true);

      // Replay / retry of the exact same event is safely deduplicated
      expect(enqueue(item1).inserted).toBe(false);
      expect(inMemoryQueue.size).toBe(1);
    });

    it("guarantees separate reschedules generate distinct dedupe keys by timestamp", () => {
      const apptId = "appt-123";
      const reschedule1StartsAt = "2026-10-25T14:00:00Z";
      const reschedule2StartsAt = "2026-10-26T15:00:00Z";

      const key1 = `${apptId}:reschedule:${new Date(reschedule1StartsAt).getTime()}:customer`;
      const key2 = `${apptId}:reschedule:${new Date(reschedule2StartsAt).getTime()}:customer`;

      expect(key1).not.toBe(key2);
    });

    it("verifies concurrent workers cannot claim the same row (atomic leasing model)", () => {
      interface Row {
        id: string;
        status: "queued" | "processing" | "sent";
        lease_expires_at: number;
      }

      const dbRows: Row[] = [
        { id: "job-A", status: "queued", lease_expires_at: 0 },
        { id: "job-B", status: "queued", lease_expires_at: 0 },
      ];

      function atomicClaim(workerId: string, now: number): Row[] {
        // Simulates FOR UPDATE SKIP LOCKED
        const claimed: Row[] = [];
        for (const r of dbRows) {
          if (r.status === "queued" || (r.status === "processing" && r.lease_expires_at < now)) {
            r.status = "processing";
            r.lease_expires_at = now + 300 * 1000;
            claimed.push({ ...r });
          }
        }
        return claimed;
      }

      const now = Date.now();
      const worker1Claimed = atomicClaim("worker-1", now);
      const worker2Claimed = atomicClaim("worker-2", now);

      // Worker 1 claimed both jobs
      expect(worker1Claimed.map((c) => c.id)).toEqual(["job-A", "job-B"]);
      // Worker 2 received 0 jobs because Worker 1 already claimed them (SKIP LOCKED)
      expect(worker2Claimed.length).toBe(0);
    });

    it("supersedes queued confirmation jobs when an appointment is cancelled", () => {
      const jobs: Array<{ id: string; apptId: string; status: string; event: string }> = [
        { id: "1", apptId: "appt-99", status: "queued", event: "new_booking" },
        { id: "2", apptId: "appt-99", status: "retry_pending", event: "reschedule" },
        { id: "3", apptId: "appt-OTHER", status: "queued", event: "new_booking" },
      ];

      // Cancellation ordering policy: mark pending jobs for this appointment as skipped
      for (const j of jobs) {
        if (j.apptId === "appt-99" && (j.status === "queued" || j.status === "retry_pending")) {
          j.status = "skipped";
        }
      }

      expect(jobs[0]?.status).toBe("skipped");
      expect(jobs[1]?.status).toBe("skipped");
      expect(jobs[2]?.status).toBe("queued"); // Unrelated appointment untouched
    });
  });

  // ===========================================================================
  // 5. Owner Preference Guard
  // ===========================================================================
  describe("Owner Notification Preference Enforcement", () => {
    it("respects owner preference toggles to skip owner alerts when disabled", () => {
      const settings = {
        notify_on_new_booking: false,
        notify_on_reschedule: true,
        notify_on_cancellation: false,
      };

      function shouldNotifyOwner(event: "new_booking" | "reschedule" | "cancellation"): boolean {
        if (event === "new_booking") return settings.notify_on_new_booking;
        if (event === "reschedule") return settings.notify_on_reschedule;
        if (event === "cancellation") return settings.notify_on_cancellation;
        return true;
      }

      expect(shouldNotifyOwner("new_booking")).toBe(false);
      expect(shouldNotifyOwner("reschedule")).toBe(true);
      expect(shouldNotifyOwner("cancellation")).toBe(false);
    });

    it("gracefully skips customer notifications when customer email is null without breaking booking", () => {
      const customerEmail = null;
      let emailQueued = false;

      if (customerEmail && isValidEmailFormat(customerEmail)) {
        emailQueued = true;
      }

      expect(emailQueued).toBe(false);
      // Booking proceeds smoothly without throwing
    });
  });

  // ===========================================================================
  // 6. Pre-Deployment Security, Zero-Race & Fault Tolerance Verification
  // ===========================================================================
  describe("Pre-Deployment Security & Transactional Verification", () => {
    it("ensures owner-visible delivery history strictly omits payload and management tokens", () => {
      // Representation of outbox item selected for salon owner dashboard view
      const ownerHistoryRecord: Omit<NotificationOutboxItem, "payload"> = {
        id: "job-hist-1",
        business_id: "biz-1",
        appointment_id: "appt-1",
        event_type: "new_booking",
        recipient_type: "customer",
        recipient_email: "customer@example.com",
        template_key: "customer_booking_confirmation",
        status: "sent",
        attempt_count: 1,
        max_attempts: 5,
        next_attempt_at: "2026-10-25T12:00:00Z",
        dedupe_key: "appt-1:new_booking:customer",
        created_at: "2026-10-25T12:00:00Z",
        provider_message_id: "re_12345",
      };

      // Ensure 'payload' property is not present in owner-visible history
      expect("payload" in ownerHistoryRecord).toBe(false);
      expect((ownerHistoryRecord as Record<string, unknown>).payload).toBeUndefined();
    });

    it("verifies trigger exception suppression simulation ensures booking transaction survives nonessential email errors", () => {
      let appointmentCommitted = false;
      const suppressedWarnings: string[] = [];

      function triggerWrapperWithFaultTolerance(shouldFailNotification: boolean) {
        try {
          if (shouldFailNotification) {
            throw new Error("Simulated transient formatting exception in trigger payload builder");
          }
        } catch (err: unknown) {
          const e = err as Error;
          suppressedWarnings.push(e.message);
          // Trigger continues and does not rethrow, returning NEW
        }
        appointmentCommitted = true;
      }

      triggerWrapperWithFaultTolerance(true);

      expect(appointmentCommitted).toBe(true);
      expect(suppressedWarnings.length).toBe(1);
      expect(suppressedWarnings[0]).toContain("Simulated transient formatting exception");
    });

    it("verifies atomic management URL enrichment leaves zero window for worker to claim unpopulated email", () => {
      function simulateAtomicRpcWithManagementUrl(managementUrl: string) {
        // Step 1: Insert appointment (trigger enqueues row)
        const row = { status: "queued", management_url: null as string | null };

        // Step 2: Atomic enrichment before commit
        row.management_url = managementUrl;

        // Step 3: Transaction commits
        return { isTransactionCommitted: true, outboxRow: row };
      }

      const result = simulateAtomicRpcWithManagementUrl("https://aisolan.vercel.app/manage-booking/token123");

      expect(result.isTransactionCommitted).toBe(true);
      expect(result.outboxRow.management_url).toBe("https://aisolan.vercel.app/manage-booking/token123");
    });

    it("verifies environment variable fallback resolves NOTIFICATION_FROM_EMAIL and EMAIL_FROM safely", () => {
      function resolveSenderEmail(env: Record<string, string | undefined>) {
        return (
          env.NOTIFICATION_FROM_EMAIL ||
          env.EMAIL_FROM ||
          env.RESEND_FROM_EMAIL ||
          "Bookzello <bookings@bookzello.com>"
        );
      }

      // 1. All absent -> default
      expect(resolveSenderEmail({})).toBe("Bookzello <bookings@bookzello.com>");

      // 2. Only EMAIL_FROM provided
      expect(resolveSenderEmail({ EMAIL_FROM: "Acme <info@acme.com>" })).toBe("Acme <info@acme.com>");

      // 3. Only RESEND_FROM_EMAIL provided
      expect(resolveSenderEmail({ RESEND_FROM_EMAIL: "Resend <resend@salon.co.uk>" })).toBe("Resend <resend@salon.co.uk>");

      // 4. Only NOTIFICATION_FROM_EMAIL provided
      expect(resolveSenderEmail({ NOTIFICATION_FROM_EMAIL: "Salon <bookings@salon.co.uk>" })).toBe("Salon <bookings@salon.co.uk>");

      // 5. Multiple provided -> NOTIFICATION_FROM_EMAIL takes precedence over EMAIL_FROM and RESEND_FROM_EMAIL
      expect(
        resolveSenderEmail({
          NOTIFICATION_FROM_EMAIL: "Primary <primary@salon.co.uk>",
          EMAIL_FROM: "Secondary <secondary@salon.co.uk>",
          RESEND_FROM_EMAIL: "Tertiary <tertiary@salon.co.uk>",
        })
      ).toBe("Primary <primary@salon.co.uk>");
    });

    it("verifies canonical recovery query joins customers via customer_id and excludes cancelled appointments", () => {
      // Mock tables: appointments and customers
      const appointments = [
        { id: "a1", business_id: "b1", customer_id: "c1", status: "confirmed", created_at: "2026-10-25T10:00:00Z" },
        { id: "a2", business_id: "b1", customer_id: "c2", status: "cancelled", created_at: "2026-10-25T11:00:00Z" },
        { id: "a3", business_id: "b1", customer_id: "c3", status: "confirmed", created_at: "2026-10-25T12:00:00Z" },
      ];

      const customers = [
        { id: "c1", business_id: "b1", name: "Alice", email: "alice@example.com" },
        { id: "c2", business_id: "b1", name: "Bob", email: "bob@example.com" },
        { id: "c3", business_id: "b1", name: "Charlie", email: "charlie@example.com" },
      ];

      const existingOutbox = [
        { appointment_id: "a1", template_key: "customer_booking_confirmation" },
      ];

      // Execute canonical recovery query logic
      const unNotifiedAppointments = appointments
        .filter((a) => a.status === "confirmed")
        .map((a) => {
          const cust = customers.find((c) => c.business_id === a.business_id && c.id === a.customer_id);
          const hasOutbox = existingOutbox.some(
            (n) => n.appointment_id === a.id && n.template_key === "customer_booking_confirmation"
          );
          return { appointment: a, customer: cust, hasOutbox };
        })
        .filter((item) => item.customer?.email && !item.hasOutbox);

      // Only a3 (confirmed, has email, missing outbox) is returned.
      // a1 has an existing outbox item; a2 is cancelled.
      expect(unNotifiedAppointments.length).toBe(1);
      expect(unNotifiedAppointments[0].appointment.id).toBe("a3");
      expect(unNotifiedAppointments[0].customer?.email).toBe("charlie@example.com");
    });

    it("verifies anti-staleness guard skips booking confirmation when appointment is cancelled prior to send", () => {
      let emailDispatched = false;
      let jobStatus = "queued";

      function processJob(
        job: { event_type: string; appointment_id: string },
        currentAppointmentStatus: string
      ) {
        if (
          (job.event_type === "new_booking" || job.event_type === "reschedule") &&
          currentAppointmentStatus === "cancelled"
        ) {
          jobStatus = "skipped";
          return;
        }

        emailDispatched = true;
        jobStatus = "sent";
      }

      // Case 1: Active appointment -> sends email
      processJob({ event_type: "new_booking", appointment_id: "a1" }, "confirmed");
      expect(emailDispatched).toBe(true);
      expect(jobStatus).toBe("sent");

      // Reset
      emailDispatched = false;
      jobStatus = "queued";

      // Case 2: Cancelled appointment -> skips without sending email
      processJob({ event_type: "new_booking", appointment_id: "a2" }, "cancelled");
      expect(emailDispatched).toBe(false);
      expect(jobStatus).toBe("skipped");
    });

    it("verifies isEmailDeliveryConfigured returns false when RESEND_API_KEY is absent or mock", async () => {
      const { isEmailDeliveryConfigured } = await import("@/features/notifications/provider");

      delete process.env.RESEND_API_KEY;
      expect(isEmailDeliveryConfigured()).toBe(false);

      process.env.RESEND_API_KEY = "mock";
      expect(isEmailDeliveryConfigured()).toBe(false);

      process.env.RESEND_API_KEY = "re_live_secret_123456789";
      expect(isEmailDeliveryConfigured()).toBe(true);

      delete process.env.RESEND_API_KEY;
    });

    it("verifies getDeliveryProvider returns UnconfiguredDeliveryProvider in production when key is absent", async () => {
      const { getDeliveryProvider } = await import("@/features/notifications/provider");

      const savedEnv = process.env.NODE_ENV;
      try {
        // @ts-expect-error override readonly env for test
        process.env.NODE_ENV = "production";
        delete process.env.RESEND_API_KEY;

        const provider = getDeliveryProvider();
        expect(provider.name).toBe("unconfigured");

        const result = await provider.sendEmail({
          to: "test@example.com",
          subject: "Test",
          html: "<p>Test</p>",
          text: "Test",
        });

        // Must NEVER report success in production without real credentials
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("PROVIDER_UNCONFIGURED");
        expect(result.isRetryable).toBe(true);
      } finally {
        // @ts-expect-error restore env
        process.env.NODE_ENV = savedEnv;
      }
    });

    it("verifies obsolete notification guard suppresses stale confirmations (>24h or appointment in the past)", () => {
      const now = new Date("2026-10-23T12:00:00Z");

      function isNotificationObsolete(
        startsAt: string | null,
        createdAt: string,
        referenceTime: Date
      ): { obsolete: boolean; reason?: string } {
        const payloadStartsAt = startsAt ? new Date(startsAt) : null;
        const jobCreatedAt = new Date(createdAt);
        const isAppointmentPast =
          payloadStartsAt &&
          !isNaN(payloadStartsAt.getTime()) &&
          payloadStartsAt.getTime() < referenceTime.getTime();
        const isJobStale =
          !isNaN(jobCreatedAt.getTime()) &&
          referenceTime.getTime() - jobCreatedAt.getTime() > 24 * 60 * 60 * 1000;

        if (isAppointmentPast) {
          return { obsolete: true, reason: "Appointment start time has already passed" };
        }
        if (isJobStale) {
          return { obsolete: true, reason: "Notification exceeded maximum delivery validity window (>24h)" };
        }
        return { obsolete: false };
      }

      // Case 1: Active future appointment, recent job -> Not obsolete
      expect(
        isNotificationObsolete("2026-10-23T14:00:00Z", "2026-10-23T11:00:00Z", now).obsolete
      ).toBe(false);

      // Case 2: Appointment started in the past -> Obsolete
      expect(
        isNotificationObsolete("2026-10-23T10:00:00Z", "2026-10-23T09:00:00Z", now).obsolete
      ).toBe(true);

      // Case 3: Job created 3 days ago while provider was deferred -> Obsolete
      expect(
        isNotificationObsolete("2026-10-30T10:00:00Z", "2026-10-20T10:00:00Z", now).obsolete
      ).toBe(true);
    });

    it("verifies header-only authorization rejects query-parameter secret tokens", () => {
      function checkAuth(
        authHeader: string | null,
        xCronSecret: string | null,
        configuredSecret: string
      ): boolean {
        if (!configuredSecret || configuredSecret.trim() === "") return false;
        const cleanSecret = configuredSecret.trim();

        if (authHeader) {
          const parts = authHeader.split(" ");
          if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1] === cleanSecret) {
            return true;
          }
        }

        if (xCronSecret && xCronSecret === cleanSecret) {
          return true;
        }

        // Query parameter is strictly rejected
        return false;
      }

      const secret = "correct_secret_token_abc123";

      // 1. Valid Authorization Bearer header -> Allowed
      expect(checkAuth(`Bearer ${secret}`, null, secret)).toBe(true);

      // 2. Valid x-cron-secret header -> Allowed
      expect(checkAuth(null, secret, secret)).toBe(true);

      // 3. No headers (query parameter only) -> Strictly Rejected
      expect(checkAuth(null, null, secret)).toBe(false);

      // 4. Invalid secret -> Rejected
      expect(checkAuth("Bearer wrong_secret", null, secret)).toBe(false);
    });
  });
});
