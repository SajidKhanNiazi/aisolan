import { createDraft, updateDraft, unsealDraft } from "./draft";
import { buildConfirmationCard } from "./adapter";
import {
  getPublicSalonProfile,
  getPublicAppointmentAvailability,
} from "@/features/public-booking/server";
import { formatCurrency } from "@/features/services/types";
import type {
  BookingDraft,
  ChannelContext,
  BookingDraftStage,
} from "./types";
import type { ConversationalCard } from "./adapter";

export interface OrchestrationResult {
  textMessage: string;
  stage: BookingDraftStage;
  draft: BookingDraft;
  draftToken: string;
  card?: ConversationalCard;
  suggestedSlots?: Array<{
    time: string;
    period: string;
    staffName?: string;
    staffId?: string;
    startsAtUtc: string;
  }>;
}

/**
 * Resolves current salon local date parts using its IANA timezone.
 */
function getSalonNowDate(timeZone: string): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  dayOfWeek: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateStr = formatter.format(new Date());
    const [y, m, d] = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return { year: y, month: m, day: d, dateStr, dayOfWeek };
  } catch {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      dateStr,
      dayOfWeek: now.getUTCDay(),
    };
  }
}

/**
 * Extracts target date relative to salon timezone from customer input.
 */
function extractDateFromText(
  text: string,
  timeZone: string
): string | null {
  const lower = text.toLowerCase();

  // 1. Direct ISO match (YYYY-MM-DD)
  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const now = getSalonNowDate(timeZone);

  // 2. "today" / "aaj"
  if (/\b(today|aaj)\b/i.test(lower)) {
    return now.dateStr;
  }

  // 3. "tomorrow" / "kal"
  if (/\b(tomorrow|kal)\b/i.test(lower)) {
    const target = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
    return target.toISOString().split("T")[0];
  }

  // 4. Weekdays ("monday", "friday", etc.)
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < weekdays.length; i++) {
    if (new RegExp(`\\b${weekdays[i]}\\b`, "i").test(lower)) {
      let diff = (i - now.dayOfWeek + 7) % 7;
      if (diff === 0) diff = 7; // Next occurrence
      const target = new Date(Date.UTC(now.year, now.month - 1, now.day + diff));
      return target.toISOString().split("T")[0];
    }
  }

  return null;
}

/**
 * Extracts time string (e.g. "10:00 AM", "14:30", "10", "4pm") from text.
 */
function extractTimeFromText(text: string): string | null {
  const match = text.match(/\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] || "00";
    const ampm = match[3].toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  // 24-hour format match (e.g., 14:00, 09:30)
  const match24 = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/);
  if (match24) {
    return `${String(parseInt(match24[1], 10)).padStart(2, "0")}:${match24[2]}`;
  }

  // Simple "at 10" or "at 2"
  const simpleMatch = text.match(/\bat\s+([1-9]|1[0-2])\b/i);
  if (simpleMatch) {
    const h = parseInt(simpleMatch[1], 10);
    // Assume daytime salon hours (e.g. 9-11 is AM, 1-6 is PM)
    const hour = h >= 8 && h <= 11 ? h : h < 8 ? h + 12 : h;
    return `${String(hour).padStart(2, "0")}:00`;
  }

  return null;
}

/**
 * Extracts customer name, phone, and email from text.
 */
function extractCustomerDetails(text: string): {
  name?: string;
  phone?: string;
  email?: string;
} {
  const result: { name?: string; phone?: string; email?: string } = {};

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Phone (UK, US, International formats: +44..., 07..., (555)...)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].trim();
  }

  // Name (words before phone or email, or labeled like "Ahmed Khan, ...")
  let clean = text;
  if (result.email) clean = clean.replace(result.email, "");
  if (result.phone) clean = clean.replace(result.phone, "");

  const parts = clean
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1 && !/\b(my|name|is|phone|email|please|book|i|am)\b/i.test(p));

  if (parts.length > 0 && parts[0].length >= 2 && parts[0].length <= 50) {
    result.name = parts[0];
  }

  return result;
}

function findMatchingService<T extends { name: string }>(
  lower: string,
  services: T[]
): T | undefined {
  if (!services || services.length === 0) return undefined;

  const sorted = [...services].sort((a, b) => b.name.length - a.name.length);
  for (const s of sorted) {
    const sLower = s.name.toLowerCase();
    if (lower.includes(sLower)) {
      return s;
    }
  }

  for (const s of sorted) {
    const words = s.name.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    if (words.length > 0 && words.some((w) => lower.includes(w))) {
      return s;
    }
  }

  return undefined;
}

/**
 * Server-authoritative booking draft orchestrator.
 * Handles state transitions, slot checks, corrections, and explicit confirmation preparation.
 */
export async function orchestrateConversationalBooking(
  ctx: ChannelContext,
  userInput: string,
  existingDraftToken?: string
): Promise<OrchestrationResult> {
  const lower = userInput.trim().toLowerCase();

  // 1. Resolve or create current draft
  let currentDraft: BookingDraft;
  let draftToken: string;

  if (existingDraftToken) {
    const unsealed = unsealDraft(existingDraftToken);
    if (unsealed && unsealed.businessSlug === ctx.businessSlug) {
      currentDraft = unsealed;
      draftToken = existingDraftToken;
    } else {
      const created = createDraft(ctx);
      currentDraft = created.draft;
      draftToken = created.draftToken;
    }
  } else {
    const created = createDraft(ctx);
    currentDraft = created.draft;
    draftToken = created.draftToken;
  }

  // 2. Cancellation Intent
  if (
    /\b(cancel|don't book|dont book|nevermind|stop booking|stop|no thanks)\b/i.test(
      lower
    ) &&
    currentDraft.stage !== "confirmed"
  ) {
    const res = updateDraft(currentDraft, { stage: "cancelled_draft" });
    return {
      textMessage:
        "No problem, I've cancelled your booking draft. Let me know whenever you'd like to check other services or dates!",
      stage: "cancelled_draft",
      draft: res.draft,
      draftToken: res.draftToken,
    };
  }

  // 3. Load Public Salon Profile to validate services & staff
  const profileRes = await getPublicSalonProfile(ctx.businessSlug);
  if (!profileRes.success || !profileRes.data) {
    return {
      textMessage:
        "I'm unable to access the salon's schedule right now. Please try again or use the online booking form.",
      stage: "failed",
      draft: currentDraft,
      draftToken,
    };
  }

  const salon = profileRes.data;

  // 4. Detect or Correct Service
  let selectedService = salon.services.find((s) => s.id === currentDraft.serviceId);
  const matchedService = findMatchingService(lower, salon.services);

  if (matchedService && matchedService.id !== currentDraft.serviceId) {
    selectedService = matchedService;
    const isSwitchFromPreviousService = Boolean(currentDraft.serviceId);
    // Changing an existing selected service resets slot and confirmation state
    const res = updateDraft(currentDraft, {
      serviceId: matchedService.id,
      serviceName: matchedService.name,
      servicePriceCents: matchedService.priceAmount,
      servicePriceFormatted: formatCurrency(matchedService.priceAmount, salon.currency),
      serviceDurationMinutes: matchedService.durationMinutes,
      ...(isSwitchFromPreviousService
        ? {
            slotDate: undefined,
            slotStartTime: undefined,
            slotStartsAtUtc: undefined,
            stage: "collecting_datetime" as const,
          }
        : {}),
    });
    currentDraft = res.draft;
    draftToken = res.draftToken;
  }

  // If no service has been selected yet
  if (!currentDraft.serviceId && !selectedService) {
    const serviceList = salon.services
      .map(
        (s) =>
          `• **${s.name}** (${formatCurrency(s.priceAmount, salon.currency)}, ${s.durationMinutes} mins)`
      )
      .join("\n");

    const res = updateDraft(currentDraft, { stage: "collecting_service" });
    return {
      textMessage: `Which treatment would you like to book at ${salon.name}?\n\n${serviceList}`,
      stage: "collecting_service",
      draft: res.draft,
      draftToken: res.draftToken,
    };
  }

  // 5. Detect or Correct Specialist / Staff
  const matchedStaff = salon.staff.find((st) => {
    const anySt = st as unknown as { displayName?: string; name?: string };
    const name = (anySt.displayName || anySt.name || "").toLowerCase();
    return name.length >= 3 && lower.includes(name);
  });

  if (matchedStaff) {
    const anySt = matchedStaff as unknown as { displayName?: string; name?: string };
    const res = updateDraft(currentDraft, {
      staffId: matchedStaff.id,
      staffName: anySt.displayName || anySt.name || "Specialist",
      staffPreference: "specific",
      stage: currentDraft.slotStartsAtUtc ? currentDraft.stage : "collecting_datetime",
    });
    currentDraft = res.draft;
    draftToken = res.draftToken;
  } else if (lower.includes("any specialist") || lower.includes("anyone") || lower.includes("any staff")) {
    const res = updateDraft(currentDraft, {
      staffId: null,
      staffName: "Any Specialist",
      staffPreference: "any",
    });
    currentDraft = res.draft;
    draftToken = res.draftToken;
  }

  // 6. Detect Date and Time
  const detectedDate = extractDateFromText(userInput, salon.timezone);
  const detectedTime = extractTimeFromText(userInput);

  if (detectedDate && detectedDate !== currentDraft.slotDate) {
    const res = updateDraft(currentDraft, {
      slotDate: detectedDate,
      slotStartTime: detectedTime || undefined,
      slotStartsAtUtc: undefined,
      stage: "checking_availability",
    });
    currentDraft = res.draft;
    draftToken = res.draftToken;
  } else if (detectedTime && detectedTime !== currentDraft.slotStartTime) {
    const res = updateDraft(currentDraft, {
      slotStartTime: detectedTime,
      slotStartsAtUtc: undefined,
      stage: "checking_availability",
    });
    currentDraft = res.draft;
    draftToken = res.draftToken;
  }

  // 7. Check Availability if we have a target date
  const targetDate = currentDraft.slotDate || detectedDate;

  if (targetDate && currentDraft.serviceId && !currentDraft.slotStartsAtUtc) {
    const availRes = await getPublicAppointmentAvailability(
      {
        businessSlug: ctx.businessSlug,
        serviceId: currentDraft.serviceId,
        staffId: currentDraft.staffId || undefined,
        staffPreference: currentDraft.staffPreference,
        date: targetDate,
      },
      undefined,
      { skipRateLimit: true }
    );

    if (!availRes.success || !availRes.data || !availRes.data.slots || availRes.data.slots.length === 0) {
      const res = updateDraft(currentDraft, {
        stage: "slot_unavailable",
        lastValidationStatus: "slot_unavailable",
      });
      return {
        textMessage: `I checked our schedule for **${targetDate}**, but there are no open slots available for ${currentDraft.serviceName}. Would you like to check another day?`,
        stage: "slot_unavailable",
        draft: res.draft,
        draftToken: res.draftToken,
      };
    }

    const availableSlots = availRes.data.slots;

    // If customer specified a specific time (e.g. 10:00)
    if (currentDraft.slotStartTime) {
      const matchedSlot = availableSlots.find((s) => s.localTime === currentDraft.slotStartTime);

      if (matchedSlot) {
        const slotStaffId = matchedSlot.availableStaffIds?.[0];
        const staffObj = slotStaffId ? salon.staff.find((st) => st.id === slotStaffId) : null;
        const anySt = staffObj as unknown as { displayName?: string; name?: string } | null;
        const staffName = anySt ? (anySt.displayName || anySt.name) : (currentDraft.staffName || "Specialist");

        const res = updateDraft(currentDraft, {
          slotDate: targetDate,
          slotStartTime: currentDraft.slotStartTime,
          slotStartsAtUtc: matchedSlot.startsAt,
          staffId: currentDraft.staffId || slotStaffId || null,
          staffName,
          stage: "collecting_customer_details",
        });
        currentDraft = res.draft;
        draftToken = res.draftToken;
      } else {
        // Slot unavailable at requested time -> suggest alternatives
        const suggested = availableSlots.slice(0, 4).map((s) => s.localTime);
        return {
          textMessage: `The ${currentDraft.slotStartTime} slot is not available on **${targetDate}**. Here are the closest available times:\n\n${suggested.map((t: string) => `• **${t}**`).join("\n")}\n\nWould any of these work for you?`,
          stage: "checking_availability",
          draft: currentDraft,
          draftToken,
        };
      }
    } else {
      // Present available slots
      const suggestedSlots = availableSlots.slice(0, 6).map((s) => ({
        time: s.localTime,
        period: s.period,
        startsAtUtc: s.startsAt,
        staffName: currentDraft.staffName || "Specialist",
      }));

      const slotPills = suggestedSlots.map((s: { time: string }) => `• **${s.time}**`).join("\n");

      const res = updateDraft(currentDraft, {
        slotDate: targetDate,
        stage: "collecting_datetime",
      });

      return {
        textMessage: `Here are available times for **${currentDraft.serviceName}** on **${targetDate}**:\n\n${slotPills}\n\nWhich time would you prefer?`,
        stage: "collecting_datetime",
        draft: res.draft,
        draftToken: res.draftToken,
        suggestedSlots,
      };
    }
  }

  // 8. Collect Customer Contact Details
  const customerDetails = extractCustomerDetails(userInput);
  if (customerDetails.name || customerDetails.phone || customerDetails.email) {
    const res = updateDraft(currentDraft, {
      customerName: customerDetails.name || currentDraft.customerName,
      customerPhone: customerDetails.phone || currentDraft.customerPhone,
      customerEmail: customerDetails.email || currentDraft.customerEmail,
    });
    currentDraft = res.draft;
    draftToken = res.draftToken;
  }

  // 9. Check if Ready for Explicit Confirmation Card
  if (
    currentDraft.serviceId &&
    currentDraft.slotDate &&
    currentDraft.slotStartTime &&
    currentDraft.slotStartsAtUtc
  ) {
    if (!currentDraft.customerName || !currentDraft.customerPhone) {
      const res = updateDraft(currentDraft, { stage: "collecting_customer_details" });
      const isAffirmation = /^(yes|yeah|yep|sure|haan|ji|ok|please)\b/i.test(lower);
      
      const textMessage = isAffirmation
        ? "Great. What name and phone number should I use for the booking? You can also provide an email for confirmation."
        : `${currentDraft.serviceName} takes ${currentDraft.serviceDurationMinutes || 30} minutes and costs ${currentDraft.servicePriceFormatted || ""}. ${currentDraft.staffName || "Specialist"} is available on **${currentDraft.slotDate} at ${currentDraft.slotStartTime}**.\n\nWhat name and phone number should I use for the booking? You can also provide an email for confirmation.`;

      return {
        textMessage,
        stage: "collecting_customer_details",
        draft: res.draft,
        draftToken: res.draftToken,
      };
    }

    // Ready for explicit confirmation!
    const res = updateDraft(currentDraft, { stage: "awaiting_confirmation" });
    const card = buildConfirmationCard(res.draft, res.draftToken);

    return {
      textMessage: `Please review your appointment details below and select **Confirm Booking** to finalize your reservation:`,
      stage: "awaiting_confirmation",
      draft: res.draft,
      draftToken: res.draftToken,
      card,
    };
  }

  // 10. Fallback prompt
  return {
    textMessage: `I'm assisting you with booking **${currentDraft.serviceName || "a treatment"}**. Please let me know your preferred day and time!`,
    stage: currentDraft.stage,
    draft: currentDraft,
    draftToken,
  };
}
