import {
  createDraft,
  updateDraft,
  getDraftFromToken,
  parseDraftToken,
  saveDraftToStorage,
} from "./draft";
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

const MONTH_MAP: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

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

  // 2. Month-Day format (e.g., "October 27", "Oct 26", "October 27th")
  const monthDayMatch = lower.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  );
  if (monthDayMatch) {
    const month = MONTH_MAP[monthDayMatch[1].toLowerCase()];
    const day = parseInt(monthDayMatch[2], 10);
    if (month && day >= 1 && day <= 31) {
      let year = now.year;
      if (month < now.month - 1) {
        year = now.year + 1;
      }
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // 3. Day-Month format (e.g., "27th October", "26 Oct", "27th of October")
  const dayMonthMatch = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/i
  );
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const month = MONTH_MAP[dayMonthMatch[2].toLowerCase()];
    if (month && day >= 1 && day <= 31) {
      let year = now.year;
      if (month < now.month - 1) {
        year = now.year + 1;
      }
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // 4. "today" / "aaj"
  if (/\b(today|aaj)\b/i.test(lower)) {
    return now.dateStr;
  }

  // 5. "tomorrow" / "kal"
  if (/\b(tomorrow|kal)\b/i.test(lower)) {
    const target = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
    return target.toISOString().split("T")[0];
  }

  // 6. Weekdays ("monday", "friday", etc.)
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
/**
 * Extracts customer name, phone, and email from text.
 * Defect R-003 Remediation:
 * - If customer name is already known (existingCustomerName), it is NEVER overwritten by
 *   conversational text, questions, or rescheduling requests (e.g. "Actually, can I change the time to 3 PM instead?")
 *   unless the user provides an explicit name correction prefix like "my name is X" or "name: X".
 * - Rescheduling and conversational words ("Actually", "Instead", "Please", "Can I", "Wese", etc.)
 *   are strictly classified as non-names.
 */
function extractCustomerDetails(
  text: string,
  stage?: BookingDraftStage,
  existingCustomerName?: string
): {
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

  // Detect explicit name assignment prefixes (e.g. "my name is Alex", "name: Alex", "for Alex")
  const prefixMatch = text.match(/\b(?:my\s+name\s+is|name\s+is|i\s+am|name:|call\s+me)\s+([a-zA-Z\s'-]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    const candidate = prefixMatch[1].split(/[,;\n]/)[0].trim();
    if (
      candidate.length >= 2 &&
      candidate.length <= 50 &&
      !/\b(book|haircut|appointment|service|classic|actually|instead|please|change|tomorrow|today|pm|am)\b/i.test(candidate)
    ) {
      result.name = candidate;
      return result;
    }
  }

  // If customer name is ALREADY populated in the active draft, do NOT overwrite it
  // unless user used an explicit name prefix above.
  if (existingCustomerName && existingCustomerName.trim().length >= 2) {
    return result;
  }

  // Check if text is a rescheduling or time modification request
  const isRescheduleOrAdjustment =
    /\b(actually|instead|change|reschedule|switch|move|rather|shift|different time|different slot|can i|could i|can we|wese|badal|tabdeel|baje)\b/i.test(text) ||
    extractTimeFromText(text) !== null;

  if (isRescheduleOrAdjustment) {
    return result;
  }

  // Only extract bare name if phone/email is present or in details collection stage
  const isContactSubmission = Boolean(
    result.phone ||
    result.email ||
    stage === "collecting_customer_details"
  );

  if (!isContactSubmission) {
    return result;
  }

  let clean = text;
  if (result.email) clean = clean.replace(result.email, "");
  if (result.phone) clean = clean.replace(result.phone, "");

  // Strip conversational label prefixes
  clean = clean.replace(
    /\b(my\s+name\s+is|name\s+is|i\s+am|my\s+phone\s+is|phone\s+number\s+is|my\s+email\s+is|email\s+address\s+is|name:|phone:|email:|contact:)\b/gi,
    ""
  );

  const nonNameWords = /\b(my|name|phone|email|please|book|booking|i|am|is|for|contact|want|need|like|to|a|an|the|haircut|treatment|service|appointment|classic|beard|trim|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|at|with|actually|instead|change|can|could|would|will|shall|may|might|me|you|we|they|he|she|it|yes|no|yeah|yep|nope|sure|ok|okay|time|date|slot|hour|pm|am|morning|afternoon|evening|night|wese|lekin|magar|bhi|toh|aur|ka|ki|ke|hai|hain|hoon|karna|karwana|chahiye|kardo|badlo|tabdeel)\b/i;

  const parts = clean
    .split(/[,;\n]/)
    .map((p) => p.replace(/^[^\w]+|[^\w]+$/g, "").trim())
    .filter((p) => p.length >= 2 && !/^\d+$/.test(p) && !nonNameWords.test(p));

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

  // Helper to persist draft to Supabase storage before returning
  const persistDraft = async (d: BookingDraft, tok: string) => {
    const parsed = parseDraftToken(tok);
    if (parsed) {
      await saveDraftToStorage(d, parsed.tokenHash, parsed.rawSecret);
    }
  };

  // 1. Resolve or create current draft
  let currentDraft: BookingDraft;
  let draftToken: string;

  if (existingDraftToken) {
    const loaded = await getDraftFromToken(existingDraftToken);
    if (
      loaded &&
      (!loaded.businessSlug || loaded.businessSlug.toLowerCase() === ctx.businessSlug.toLowerCase()) &&
      new Date(loaded.expiresAt).getTime() > Date.now() &&
      loaded.stage !== "cancelled_draft" &&
      loaded.stage !== "confirmed"
    ) {
      currentDraft = loaded;
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
    await persistDraft(res.draft, res.draftToken);
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
      stage: "collecting_datetime",
      ...(isSwitchFromPreviousService
        ? {
            slotDate: undefined,
            slotStartTime: undefined,
            slotStartsAtUtc: undefined,
          }
        : {}),
    });
    currentDraft = res.draft;
    draftToken = res.draftToken;
  } else if (selectedService) {
    // Defect 1H-B-003: If service was already selected in an earlier turn, keep authoritative duration and price synced
    const formattedPrice = formatCurrency(selectedService.priceAmount, salon.currency);
    if (
      currentDraft.serviceDurationMinutes !== selectedService.durationMinutes ||
      currentDraft.servicePriceFormatted !== formattedPrice ||
      currentDraft.servicePriceCents !== selectedService.priceAmount ||
      currentDraft.serviceName !== selectedService.name
    ) {
      const res = updateDraft(currentDraft, {
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePriceCents: selectedService.priceAmount,
        servicePriceFormatted: formattedPrice,
        serviceDurationMinutes: selectedService.durationMinutes,
      });
      currentDraft = res.draft;
      draftToken = res.draftToken;
    }
  }

  // Defect 1H-B-003: If service on draft is no longer available in the active salon services catalog
  if (currentDraft.serviceId && !selectedService) {
    return {
      textMessage:
        "The selected treatment is no longer available. Please select another treatment from our menu or use the booking wizard.",
      stage: "collecting_service",
      draft: currentDraft,
      draftToken,
    };
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
    await persistDraft(res.draft, res.draftToken);
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
    if (!name || name.length < 2) return false;
    if (lower.includes(name)) return true;
    const parts = name.split(/\s+/).filter((p) => p.length >= 3);
    if (parts.some((p) => new RegExp(`\\b${p}\\b`, "i").test(lower))) return true;
    return false;
  });

  let candidateStaff = matchedStaff;
  if (!candidateStaff) {
    const withMatch = lower.match(/\bwith\s+([a-zA-Z]+)\b/i);
    if (withMatch) {
      const target = withMatch[1].toLowerCase();
      candidateStaff = salon.staff.find((st) => {
        const anySt = st as unknown as { displayName?: string; name?: string };
        const name = (anySt.displayName || anySt.name || "").toLowerCase();
        return name.includes(target) || target.includes(name);
      });
    }
  }

  if (candidateStaff) {
    const anySt = candidateStaff as unknown as { displayName?: string; name?: string };
    const staffName = anySt.displayName || anySt.name || "Specialist";
    const res = updateDraft(currentDraft, {
      staffId: candidateStaff.id,
      staffName,
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
      await persistDraft(res.draft, res.draftToken);
      return {
        textMessage: `I checked our schedule for **${targetDate}**, but there are no open slots available for ${currentDraft.serviceName}. Would you like to check another day?`,
        stage: "slot_unavailable",
        draft: res.draft,
        draftToken: res.draftToken,
      };
    }

    const availableSlots = availRes.data.slots;

    // If customer specified a specific time (e.g. 10:00, 14:00)
    if (currentDraft.slotStartTime) {
      const matchedSlot = availableSlots.find((s) => s.localTime === currentDraft.slotStartTime);

      if (matchedSlot) {
        let chosenStaffId = currentDraft.staffId;
        let chosenStaffName = currentDraft.staffName;

        if (!chosenStaffId || !matchedSlot.availableStaffIds?.includes(chosenStaffId)) {
          chosenStaffId = matchedSlot.availableStaffIds?.[0] || null;
          const staffObj = chosenStaffId ? salon.staff.find((st) => st.id === chosenStaffId) : null;
          const anySt = staffObj as unknown as { displayName?: string; name?: string } | null;
          chosenStaffName = anySt ? (anySt.displayName || anySt.name || "Specialist") : "Specialist";
        }

        const nextStage =
          currentDraft.customerName && currentDraft.customerPhone
            ? "awaiting_confirmation"
            : "collecting_customer_details";

        const res = updateDraft(currentDraft, {
          slotDate: targetDate,
          slotStartTime: currentDraft.slotStartTime,
          slotStartsAtUtc: matchedSlot.startsAt,
          staffId: chosenStaffId,
          staffName: chosenStaffName,
          stage: nextStage,
        });
        currentDraft = res.draft;
        draftToken = res.draftToken;
      } else {
        // Slot unavailable at requested time -> suggest alternatives
        const suggested = availableSlots.slice(0, 4).map((s) => s.localTime);
        await persistDraft(currentDraft, draftToken);
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
      await persistDraft(res.draft, res.draftToken);

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
  const customerDetails = extractCustomerDetails(
    userInput,
    currentDraft.stage,
    currentDraft.customerName
  );
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
      await persistDraft(res.draft, res.draftToken);
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
    // Defect 1H-B-003: Authoritatively resolve duration and price from the server-verified service record
    const authoritativeService = salon.services.find((s) => s.id === currentDraft.serviceId);
    if (!authoritativeService) {
      return {
        textMessage:
          "I could not verify the details for your selected treatment. Please choose your service again or use the booking wizard.",
        stage: "failed",
        draft: currentDraft,
        draftToken,
      };
    }

    const authoritativeDuration = authoritativeService.durationMinutes;
    const authoritativePriceFormatted = formatCurrency(
      authoritativeService.priceAmount,
      salon.currency
    );

    const res = updateDraft(currentDraft, {
      stage: "awaiting_confirmation",
      serviceDurationMinutes: authoritativeDuration,
      servicePriceCents: authoritativeService.priceAmount,
      servicePriceFormatted: authoritativePriceFormatted,
      serviceName: authoritativeService.name,
    });
    const card = buildConfirmationCard(
      res.draft,
      res.draftToken,
      salon.name,
      authoritativeService,
      salon.currency
    );
    await persistDraft(res.draft, res.draftToken);

    return {
      textMessage: `Please review your appointment details below and select **Confirm Booking** to finalize your reservation:`,
      stage: "awaiting_confirmation",
      draft: res.draft,
      draftToken: res.draftToken,
      card,
    };
  }

  // 10. Service selected, prompt for day/time
  if (currentDraft.serviceId && !currentDraft.slotStartsAtUtc) {
    await persistDraft(currentDraft, draftToken);
    return {
      textMessage: `I'd love to help you book our **${currentDraft.serviceName}** (${currentDraft.servicePriceFormatted || ""}, ${currentDraft.serviceDurationMinutes || 30} mins)! Which date or day of the week would you prefer to visit? You can also choose your slot in the booking wizard.`,
      stage: "collecting_datetime",
      draft: currentDraft,
      draftToken,
    };
  }

  // 11. Fallback prompt
  await persistDraft(currentDraft, draftToken);
  return {
    textMessage: `I'm assisting you with booking **${currentDraft.serviceName || "a treatment"}**. Please let me know your preferred day and time!`,
    stage: currentDraft.stage,
    draft: currentDraft,
    draftToken,
  };
}
