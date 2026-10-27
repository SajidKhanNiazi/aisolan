import {
  verifyAndLoadDraft,
  updateDraftStageAtomic,
  markDraftConfirmed,
  markDraftFailed,
  loadDraftFromStorage,
} from "./draft";
import {
  createPublicBooking,
  getPublicAppointmentAvailability,
} from "@/features/public-booking/server";
import { enforcePublicBookingRateLimit } from "@/features/public-booking/rate-limit";
import { resolveWallClockCandidate } from "@/features/availability/timezone";
import type {
  BookingConfirmationRequest,
  BookingConfirmationOutcome,
} from "./types";

/**
 * Checks whether AI booking writes are enabled on this server.
 * Default is FALSE until explicitly enabled by owner.
 */
export function isAiBookingWritesEnabled(): boolean {
  return process.env.AI_BOOKING_WRITES_ENABLED === "true";
}

/**
 * Checks whether AI booking writes are permitted for the requested salon.
 * Enforces server-side allowlist via AI_BOOKING_ALLOWED_SALONS.
 * Defaults strictly to the single authorized QA salon ("bookpilot-qa-salon").
 * Generic QA/test slugs ("qa-salon", "test-salon") are strictly excluded.
 */
export function isSalonAllowedForAiBooking(businessSlug: string): boolean {
  const allowedList = process.env.AI_BOOKING_ALLOWED_SALONS;
  if (!allowedList || allowedList.trim() === "") {
    return businessSlug.toLowerCase() === "bookpilot-qa-salon";
  }
  const slugs = allowedList.split(",").map((s) => s.trim().toLowerCase());
  return slugs.includes(businessSlug.toLowerCase());
}

/**
 * Confirms a conversational booking draft atomically.
 * Re-checks availability, validates draft integrity, enforces feature flags,
 * locks draft against concurrent double-confirmation, and calls the existing
 * atomic booking RPC via createPublicBooking.
 */
export async function confirmBookingDraft(
  request: BookingConfirmationRequest,
  clientIp?: string
): Promise<BookingConfirmationOutcome> {
  const { businessSlug, draftId, draftToken, idempotencyKey, customerNotes } =
    request;

  // 1a. Feature Flag Guard (Server-Side)
  if (!isAiBookingWritesEnabled()) {
    return {
      success: false,
      stage: "failed",
      error:
        "Conversational booking confirmation is currently undergoing verification. Please use the booking wizard on this page to finalize your appointment.",
      code: "AI_BOOKING_WRITES_DISABLED",
    };
  }

  // 1b. Fast Client-Supplied Salon Allowlist Guard
  if (!isSalonAllowedForAiBooking(businessSlug)) {
    return {
      success: false,
      stage: "failed",
      error:
        "Conversational booking writes are restricted to authorized QA salons during verification.",
      code: "SALON_NOT_ALLOWLISTED",
    };
  }

  // 2. Rate Limit Guard
  const rateCheck = await enforcePublicBookingRateLimit({
    identifier: clientIp || "ai-confirm-client",
    businessSlug,
    action: "booking",
    limit: 5,
    windowSeconds: 60,
  });

  if (!rateCheck.allowed) {
    return {
      success: false,
      stage: "failed",
      error: rateCheck.reason || "Too many confirmation attempts. Please wait a moment.",
      code: "RATE_LIMITED",
    };
  }

  // 3. Verify Draft Integrity & Ownership
  const verifyRes = await verifyAndLoadDraft(draftId, draftToken, businessSlug);
  if (!verifyRes.valid || !verifyRes.draft) {
    return {
      success: false,
      stage: "failed",
      error: verifyRes.error || "Invalid booking draft.",
      code: verifyRes.code || "INVALID_DRAFT",
    };
  }

  const draft = verifyRes.draft;

  // 3b. Server-Verified Business Identity Allowlist Guard
  // Guarantees allowlist check cannot be bypassed by client-supplied slug mismatch
  if (!isSalonAllowedForAiBooking(draft.businessSlug)) {
    return {
      success: false,
      stage: "failed",
      error:
        "Conversational booking writes are restricted to authorized QA salons during verification.",
      code: "SALON_NOT_ALLOWLISTED",
    };
  }

  // 4. Validate Draft Completeness & Normalize Timestamp
  if (!draft.slotStartsAtUtc && draft.slotDate && draft.slotStartTime) {
    const defaultTz = "Europe/London";
    const resolved = resolveWallClockCandidate(draft.slotDate, draft.slotStartTime, defaultTz);
    if (resolved) {
      draft.slotStartsAtUtc = resolved.utcInstant.toISOString();
    }
  } else if (draft.slotStartsAtUtc) {
    const parsed = new Date(draft.slotStartsAtUtc);
    if (!isNaN(parsed.getTime())) {
      draft.slotStartsAtUtc = parsed.toISOString();
    }
  }

  if (
    !draft.serviceId ||
    !draft.slotDate ||
    !draft.slotStartTime ||
    !draft.customerName ||
    !draft.customerPhone
  ) {
    return {
      success: false,
      stage: "failed",
      error: "Booking draft is missing required details (service, time, or customer contact).",
      code: "INCOMPLETE_DRAFT",
    };
  }

  // 5. Fast-Path Durable Idempotency Check (Safe Network Retry Recovery)
  if (draft.stage === "confirmed" && draft.bookingReference) {
    return {
      success: true,
      stage: "confirmed",
      appointmentId: draft.appointmentId,
      bookingReference: draft.bookingReference,
      salonName: draft.businessSlug,
      serviceName: draft.serviceName,
      staffName: draft.staffName || "Specialist",
      startsAtLocal: `${draft.slotDate} at ${draft.slotStartTime}`,
      dateLocal: draft.slotDate,
      timeLocal: draft.slotStartTime,
      priceFormatted: draft.servicePriceFormatted,
      managementUrl: draft.managementUrl,
      emailQueued: Boolean(draft.customerEmail && draft.customerEmail.trim().length > 0),
    };
  }

  // 6. Concurrency Guard: Check if another confirmation is actively in progress
  if (draft.stage === "confirming") {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 60));
      const reloaded = await loadDraftFromStorage(draft.id);
      if (reloaded?.stage === "confirmed" && reloaded.bookingReference) {
        return {
          success: true,
          stage: "confirmed",
          appointmentId: reloaded.appointmentId,
          bookingReference: reloaded.bookingReference,
          salonName: reloaded.businessSlug,
          serviceName: reloaded.serviceName,
          staffName: reloaded.staffName || "Specialist",
          startsAtLocal: `${reloaded.slotDate} at ${reloaded.slotStartTime}`,
          dateLocal: reloaded.slotDate,
          timeLocal: reloaded.slotStartTime,
          priceFormatted: reloaded.servicePriceFormatted,
          managementUrl: reloaded.managementUrl,
          emailQueued: Boolean(reloaded.customerEmail && reloaded.customerEmail.trim().length > 0),
        };
      }
    }

    return {
      success: false,
      stage: "confirming",
      error: "Booking confirmation is already in progress for this request. Please wait a moment.",
      code: "CONFIRMATION_IN_PROGRESS",
    };
  }

  // 7. Atomic Draft Stage Lock (transitions to 'confirming' so concurrent clicks cannot race)
  const lockAcquired = await updateDraftStageAtomic(
    draft.id,
    ["awaiting_confirmation", "collecting_customer_details", "idle"],
    "confirming",
    draft.version
  );

  if (!lockAcquired) {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 60));
      const reloaded = await loadDraftFromStorage(draft.id);
      if (reloaded?.stage === "confirmed" && reloaded.bookingReference) {
        return {
          success: true,
          stage: "confirmed",
          appointmentId: reloaded.appointmentId,
          bookingReference: reloaded.bookingReference,
          salonName: reloaded.businessSlug,
          serviceName: reloaded.serviceName,
          staffName: reloaded.staffName || "Specialist",
          startsAtLocal: `${reloaded.slotDate} at ${reloaded.slotStartTime}`,
          dateLocal: reloaded.slotDate,
          timeLocal: reloaded.slotStartTime,
          priceFormatted: reloaded.servicePriceFormatted,
          managementUrl: reloaded.managementUrl,
          emailQueued: Boolean(reloaded.customerEmail && reloaded.customerEmail.trim().length > 0),
        };
      }
    }

    return {
      success: false,
      stage: "failed",
      error: "Draft confirmation conflict. The booking draft was updated or locked by another request.",
      code: "DRAFT_LOCK_FAILED",
    };
  }

  // 8. Re-check Real Availability on the Server immediately before booking
  const availRes = await getPublicAppointmentAvailability(
    {
      businessSlug,
      serviceId: draft.serviceId,
      staffId: draft.staffId || undefined,
      staffPreference: draft.staffPreference,
      date: draft.slotDate,
    },
    clientIp,
    { skipRateLimit: true }
  );

  if (!availRes.success || !availRes.data) {
    await markDraftFailed(draft.id, "slot_unavailable");
    return {
      success: false,
      stage: "slot_unavailable",
      error: availRes.error || "Selected slot is no longer available. Please choose another time.",
      code: "SLOT_UNAVAILABLE",
    };
  }

  const matchingSlot = (availRes.data.slots || []).find(
    (s) => s.localTime === draft.slotStartTime
  );

  if (!matchingSlot) {
    await markDraftFailed(draft.id, "slot_unavailable");
    return {
      success: false,
      stage: "slot_unavailable",
      error: `The ${draft.slotStartTime} slot on ${draft.slotDate} was just reserved by someone else. Please choose an alternative time.`,
      code: "SLOT_TAKEN",
    };
  }

  // Defect 1H-B-004: Validate specialist availability if a specific staff member was requested
  if (
    draft.staffId &&
    matchingSlot.availableStaffIds &&
    matchingSlot.availableStaffIds.length > 0 &&
    !matchingSlot.availableStaffIds.includes(draft.staffId)
  ) {
    await markDraftFailed(draft.id, "slot_unavailable");
    return {
      success: false,
      stage: "slot_unavailable",
      error: `The requested specialist is no longer available at ${draft.slotStartTime} on ${draft.slotDate}. Please choose an alternative time or specialist.`,
      code: "SLOT_TAKEN",
    };
  }

  // Defect 1H-B-004: Prefer the authoritative matching slot's canonical UTC ISO start timestamp
  let canonicalStartsAt: string = matchingSlot.startsAt;
  if (!canonicalStartsAt || !canonicalStartsAt.endsWith("Z")) {
    if (draft.slotStartsAtUtc) {
      const d = new Date(draft.slotStartsAtUtc);
      if (!isNaN(d.getTime())) {
        canonicalStartsAt = d.toISOString();
      }
    }
  }

  // If still unverified or not an ISO UTC timestamp, resolve via resolveWallClockCandidate
  if (!canonicalStartsAt || isNaN(new Date(canonicalStartsAt).getTime())) {
    const salonTz = availRes.data.timezone || "Europe/London";
    const resolved = resolveWallClockCandidate(
      draft.slotDate,
      draft.slotStartTime,
      salonTz
    );
    if (!resolved) {
      await markDraftFailed(draft.id, "failed");
      return {
        success: false,
        stage: "failed",
        error: "Unable to resolve valid appointment timestamp for the selected time and timezone.",
        code: "INVALID_TIMESTAMP",
      };
    }
    canonicalStartsAt = resolved.utcInstant.toISOString();
  } else {
    // Ensure canonicalStartsAt is strictly in ISO UTC format (...Z)
    canonicalStartsAt = new Date(canonicalStartsAt).toISOString();
  }

  // 9. Invoke Existing Atomic Public Booking Transaction with durable idempotencyKey
  const bookingOutcome = await createPublicBooking(
    {
      businessSlug,
      serviceId: draft.serviceId,
      staffId: draft.staffId || null,
      startsAt: canonicalStartsAt,
      customerName: draft.customerName,
      customerPhone: draft.customerPhone,
      customerEmail: draft.customerEmail || "",
      customerNotes: customerNotes || draft.customerNotes || "",
      idempotencyKey: idempotencyKey || draft.idempotencyKey,
    },
    clientIp
  );

  if (!bookingOutcome.success || !bookingOutcome.data) {
    const isSlotTaken = bookingOutcome.code === "SLOT_TAKEN";
    await markDraftFailed(draft.id, isSlotTaken ? "slot_unavailable" : "failed");
    return {
      success: false,
      stage: isSlotTaken ? "slot_unavailable" : "failed",
      error: bookingOutcome.error || "Failed to commit appointment booking.",
      code: bookingOutcome.code || "BOOKING_COMMIT_FAILED",
    };
  }

  const confirmedData = bookingOutcome.data;

  // 10. Update Draft State to Confirmed in Database & Memory
  await markDraftConfirmed(
    draft.id,
    confirmedData.appointmentId,
    confirmedData.bookingReference,
    confirmedData.managementUrl
  );

  return {
    success: true,
    stage: "confirmed",
    appointmentId: confirmedData.appointmentId,
    bookingReference: confirmedData.bookingReference,
    salonName: confirmedData.businessName || businessSlug,
    serviceName: confirmedData.serviceName || draft.serviceName,
    staffName: confirmedData.staffName || draft.staffName || "Specialist",
    startsAtLocal: `${draft.slotDate} at ${draft.slotStartTime}`,
    dateLocal: draft.slotDate,
    timeLocal: draft.slotStartTime,
    priceFormatted: draft.servicePriceFormatted,
    timezone: availRes.data.timezone,
    managementUrl: confirmedData.managementUrl,
    emailQueued: Boolean(draft.customerEmail && draft.customerEmail.trim().length > 0),
  };
}
