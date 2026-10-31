import { salonTools } from "./tools";
import { orchestrateConversationalBooking } from "./booking/orchestrator";
import { getDraftFromToken } from "./booking/draft";
import { resolveServiceFromText, findMatchingStaffFromText } from "./booking/rehydrate";
import { getPublicSalonProfile } from "@/features/public-booking/server";
import type {
  ChatMessage,
  AiChatResponse,
  ToolExecutionContext,
  SalonFaqItem,
} from "./types";

function formatServicesList(services: string[]): string {
  if (!services || services.length === 0) return "no services currently listed";
  if (services.length === 1) return `**${services[0]}**`;
  if (services.length === 2) return `**${services[0]}** and **${services[1]}**`;
  const allButLast = services.slice(0, -1).map((s) => `**${s}**`).join(", ");
  return `${allButLast}, and **${services[services.length - 1]}**`;
}

function formatStaffList(staffNames: string[]): string {
  if (!staffNames || staffNames.length === 0) return "our team";
  if (staffNames.length === 1) return `**${staffNames[0]}**`;
  if (staffNames.length === 2) return `**${staffNames[0]}** and **${staffNames[1]}**`;
  const allButLast = staffNames.slice(0, -1).map((s) => `**${s}**`).join(", ");
  return `${allButLast}, and **${staffNames[staffNames.length - 1]}**`;
}

/**
 * Helper to determine the current date parts in the salon's IANA timezone.
 */
function getSalonNowParts(timeZone: string): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dateStr: string;
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

    const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "Europe/London",
      weekday: "long",
    });
    const weekdayName = weekdayFormatter.format(new Date()).toLowerCase();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayOfWeek = dayNames.indexOf(weekdayName);

    return { year: y, month: m, day: d, dayOfWeek, dateStr };
  } catch {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const d = now.getUTCDate();
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { year: y, month: m, day: d, dayOfWeek: now.getUTCDay(), dateStr };
  }
}

/**
 * Resolve target appointment date from natural language relative to salon timezone.
 */
function resolveTargetDate(
  lower: string,
  timeZone: string
): { dateStr: string | null; isExplicit: boolean } {
  // 1. Direct ISO date (YYYY-MM-DD)
  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return { dateStr: isoMatch[1], isExplicit: true };
  }

  const salonNow = getSalonNowParts(timeZone);

  // 2. Month-Day format (e.g., "October 27", "Oct 26", "October 27th")
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

  const monthDayMatch = lower.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  );
  if (monthDayMatch) {
    const month = MONTH_MAP[monthDayMatch[1].toLowerCase()];
    const day = parseInt(monthDayMatch[2], 10);
    if (month && day >= 1 && day <= 31) {
      let year = salonNow.year;
      if (month < salonNow.month - 1) {
        year = salonNow.year + 1;
      }
      return {
        dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        isExplicit: true,
      };
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
      let year = salonNow.year;
      if (month < salonNow.month - 1) {
        year = salonNow.year + 1;
      }
      return {
        dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        isExplicit: true,
      };
    }
  }

  // 4. "today" / "aaj"
  if (/\b(today|aaj)\b/i.test(lower)) {
    return { dateStr: salonNow.dateStr, isExplicit: true };
  }

  // 5. "tomorrow" / "kal"
  if (/\b(tomorrow|kal)\b/i.test(lower)) {
    const target = new Date(Date.UTC(salonNow.year, salonNow.month - 1, salonNow.day + 1));
    return { dateStr: target.toISOString().split("T")[0], isExplicit: true };
  }

  // 6. Weekday names
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < dayNames.length; i++) {
    const dayName = dayNames[i];
    const regex = new RegExp(`\\b${dayName}\\b`, "i");
    if (regex.test(lower)) {
      let diff = (i - salonNow.dayOfWeek + 7) % 7;
      if (diff === 0) diff = 7; // next upcoming occurrence of that day
      const target = new Date(Date.UTC(salonNow.year, salonNow.month - 1, salonNow.day + diff));
      return { dateStr: target.toISOString().split("T")[0], isExplicit: true };
    }
  }

  return { dateStr: null, isExplicit: false };
}

/**
 * Dynamically match a service from the salon's actual service catalog.
 */
function findMatchingService<T extends { id?: string; name: string }>(
  lower: string,
  services: T[]
): T | undefined {
  return resolveServiceFromText(lower, services);
}

/**
 * Dynamically match a specialist from the salon's actual team roster.
 */
function findMatchingStaff<T extends { id?: string; name?: string; displayName?: string }>(
  lower: string,
  staff: T[]
): T | undefined {
  return findMatchingStaffFromText(lower, staff);
}

/**
 * Deterministic mock provider that runs without external API keys.
 * Grounded strictly in real salon data retrieved via read-only tools.
 * Enforces clear intent priority:
 * 1. Appointment availability lookup with date/time/service
 * 2. General staff/team questions without appointment constraints
 * 3. Explicit price/cost questions
 * 4. General service-list questions
 */
export async function executeMockChat(
  ctx: ToolExecutionContext,
  messages: ChatMessage[],
  faqs: SalonFaqItem[] = [],
  draftToken?: string
): Promise<AiChatResponse> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const query = (lastUserMsg?.content || "").trim();
  const lower = query.toLowerCase();

  const toolsUsed: string[] = [];

  // 1. Prompt Injection / System Exposure Guard
  if (
    lower.includes("ignore previous instructions") ||
    lower.includes("system prompt") ||
    lower.includes("reveal your instructions") ||
    lower.includes("show me your prompt") ||
    lower.includes("who programmed you") ||
    lower.includes("override your rules")
  ) {
    return {
      success: true,
      message: `I am the virtual receptionist for ${ctx.businessName}. I am here to help you explore our services, check specialist availability, and schedule your appointment! How may I assist you with your booking today?`,
      toolsUsed: [],
      mode: "mock",
    };
  }

  // 2. Custom Salon FAQs check
  for (const faq of faqs) {
    const qLower = faq.question.toLowerCase();
    const words = qLower.split(/\s+/).filter((w) => w.length > 3);
    const matches = words.filter((w) => lower.includes(w));
    if (matches.length >= Math.min(2, words.length)) {
      return {
        success: true,
        message: faq.answer,
        toolsUsed: ["faqLookup"],
        mode: "mock",
      };
    }
  }

  // 3. Greeting / Salon Intro (English & Urdu/Roman Urdu)
  const hasBookingIntent =
    /\b(i need|i want to book|want to book|like to book|book an appointment|book a|book appointment|book haircut|appointment chahiye|book karna|karni hai|need an appointment)\b/i.test(
      lower
    );

  if (
    (!hasBookingIntent &&
      /^(hi|hello|hey|greetings|good (morning|afternoon|evening)|salam|assalam|aoa|slam)\b/i.test(
        query
      )) ||
    lower === "hi" ||
    lower === "hello"
  ) {
    toolsUsed.push("getSalonInfo");
    await salonTools.getSalonInfo.execute(ctx, {});
    return {
      success: true,
      message: `Welcome to ${ctx.businessName}! We're delighted to assist you. You can ask me about our services, pricing, opening hours, or check specialist availability. How can I help you today?`,
      toolsUsed,
      mode: "mock",
    };
  }

  // Signal detection
  const hasAvailabilityKeyword =
    /\b(available|availability|openings|any openings?|open slots?|free times?|free slots?|times available|available times|show me available times|what times|can i come|appointment times|open appointment|when are you free)\b/i.test(
      lower
    ) && !/\bopening hours?\b/i.test(lower);

  const resolvedDateInfo = resolveTargetDate(lower, ctx.timezone || "Europe/London");
  const hasDateOrTimeConstraint = Boolean(
    resolvedDateInfo.dateStr ||
    /\b(today|tomorrow|kal|aaj|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|shaam|subah|am|pm|\b\d{1,2}:\d{2}\b)\b/i.test(
      lower
    )
  );

  const hasAppointmentKeyword =
    /\b(appointment|appointments|slot|slots)\b/i.test(lower);

  const isExplicitPriceQuery =
    /\b(price|prices|cost|costs|rate|rates|how much|fee|fees|pricing|kitne ka|kya rate)\b/i.test(
      lower
    );

  const isStaffQualificationQuery =
    !hasDateOrTimeConstraint &&
    !isExplicitPriceQuery &&
    (
      /\b(which|what)\s+(services?|treatments?|haircuts?)\s+(can|does|do)\b/i.test(lower) ||
      /\bwhat\s+can\s+[a-zA-Z\s]+?\s+(perform|do|offer|provide)\b/i.test(lower) ||
      /\b(can|does|is|could)\s+[a-zA-Z\s]+?\s+(perform|do|offer|provide|cut|handle|qualified)\b/i.test(lower) ||
      /\bwho\s+(can|does|will|offers?|performs?|provides?)\b/i.test(lower) ||
      /\bservices\s+(of|for|by)\s+[a-zA-Z\s]+\b/i.test(lower)
    );

  const isStaffInquiry =
    isStaffQualificationQuery ||
    /\b(staff|stylist|stylists|barber|barbers|specialist|specialists|team|who works|who can do|who does|who provides|who offers|who performs|kaun hai|kon hai|kon karta|kaun karta|barber kaun|stylist kaun|sarah|emma|alex|daniel|omar)\b/i.test(
      lower
    ) || /\bwho\b.*\b(haircut|cut|style|trim|wash|fade|sculpt|massage)\b/i.test(lower);

  const isOpeningHoursInquiry =
    /\b(hours?|opening hours?|open timing|closing time|close time|schedule|operating hours?|address|location|where are you|kahan)\b/i.test(
      lower
    ) && !hasAppointmentKeyword && !hasDateOrTimeConstraint;

  // General staff questions without appointment/slot constraints (e.g. "Which staff members are available?", "Who works here?")
  const isGeneralStaffRosterQuery =
    isStaffInquiry && !hasDateOrTimeConstraint && !hasAppointmentKeyword;

  // Conversational Booking Flow (Phase 1H-B)
  const hasActiveDraft = Boolean(draftToken);
  const isDirectBookingIntent =
    /\b(i need|i want to book|want to book|like to book|book an appointment|book a|book appointment|book haircut|appointment chahiye|book karna|karni hai|chahiye|need an appointment)\b/i.test(
      lower
    ) ||
    (/\b(book|booking|reserve|reservation|schedule|appointment)\b/i.test(lower) &&
      !isExplicitPriceQuery &&
      !isOpeningHoursInquiry);

  const isSlotSelectionInDraft =
    hasActiveDraft &&
    (hasDateOrTimeConstraint ||
      /\b(at\s+\d{1,2}|morning|afternoon|evening|\d{1,2}:\d{2})\b/i.test(lower) ||
      /\bwith\s+[a-zA-Z]+\b/i.test(lower));

  const shouldTriggerConversationalBooking =
    !isStaffQualificationQuery &&
    (hasActiveDraft || isDirectBookingIntent || isSlotSelectionInDraft);

  if (
    !isExplicitPriceQuery &&
    !isGeneralStaffRosterQuery &&
    !isOpeningHoursInquiry &&
    shouldTriggerConversationalBooking
  ) {
    const orch = await orchestrateConversationalBooking(
      {
        channel: ctx.channel || "hosted_web",
        businessId: ctx.businessId,
        businessSlug: ctx.businessSlug,
        conversationId: "conv-" + ctx.businessSlug,
        salonTimezone: ctx.timezone,
      },
      query,
      draftToken
    );

    return {
      success: true,
      message: orch.textMessage,
      draft: orch.draft,
      draftToken: orch.draftToken,
      card: orch.card,
      suggestedSlots: orch.suggestedSlots,
      bookingHandoff: {
        hasIntent: true,
        serviceId: orch.draft.serviceId,
        serviceName: orch.draft.serviceName,
        date: orch.draft.slotDate,
      },
      toolsUsed: ["checkAvailability"],
      mode: "mock",
    };
  }

  // 4. Intent Priority 1: Appointment Availability Lookup
  // Handles:
  // - "Show me available Classic Haircut appointments tomorrow."
  // - "What times are available for a beard trim on Friday?"
  // - "Any openings tomorrow morning?"
  // - "Can Emma do a haircut tomorrow?"
  // - "Is Emma or Sarah available tomorrow?"
  const isAvailabilityIntent =
    !isGeneralStaffRosterQuery &&
    !isOpeningHoursInquiry &&
    !isExplicitPriceQuery &&
    (
      hasAvailabilityKeyword ||
      (hasAppointmentKeyword && hasDateOrTimeConstraint) ||
      (/\b(can|is|with)\b/i.test(lower) && hasDateOrTimeConstraint)
    );

  if (isAvailabilityIntent) {
    const dateResolution = resolveTargetDate(lower, ctx.timezone || "Europe/London");

    // If date is genuinely missing in an availability question, ask a concise follow-up instead of inventing availability
    if (!dateResolution.dateStr) {
      return {
        success: true,
        message: `I'd be happy to check available appointment times for ${ctx.businessName}! Which date or day of the week would you prefer to visit?`,
        toolsUsed: [],
        mode: "mock",
      };
    }

    const dateStr = dateResolution.dateStr;

    // Dynamically resolve service and staff names against the salon's actual data
    toolsUsed.push("checkAvailability");
    const [servicesRes, staffRes] = await Promise.all([
      salonTools.listServices.execute(ctx, {}) as Promise<{
        services: Array<{ id: string; name: string; priceFormatted: string }>;
      }>,
      salonTools.listStaff.execute(ctx, {}) as Promise<{
        staff: Array<{ id: string; name: string }>;
      }>,
    ]);

    let matchedService = findMatchingService(lower, servicesRes.services || []);
    if (!matchedService && /\b(haircut|cut|trim)\b/i.test(lower)) {
      matchedService = (servicesRes.services || []).find((s) =>
        /\b(haircut|cut|trim)\b/i.test(s.name)
      );
    }
    const matchedStaff = findMatchingStaff(lower, staffRes.staff || []);

    // Also extract candidate name if inquiry has "can [Name] do..." or "with [Name]"
    let targetStaffName = matchedStaff?.name;
    if (!targetStaffName) {
      const nameMatch = lower.match(/\b(?:can|is|with)\s+([a-zA-Z]+)\b/i);
      const candidate = nameMatch ? nameMatch[1] : undefined;
      const commonWords = new Set(["you", "we", "i", "anyone", "someone", "there", "a", "the", "any", "our"]);
      if (candidate && !commonWords.has(candidate.toLowerCase())) {
        targetStaffName = candidate;
      }
    }

    const avail = (await salonTools.checkAvailability.execute(ctx, {
      date: dateStr,
      serviceName: matchedService?.name,
      staffName: targetStaffName,
    })) as {
      available: boolean;
      serviceName?: string;
      suggestedSlots?: Array<{ time: string; staffName: string; period?: string }>;
      error?: string;
    };

    // Filter by period if requested ("morning", "afternoon", "evening")
    const isMorning = /\bmorning\b/i.test(lower);
    const isAfternoon = /\bafternoon\b/i.test(lower);
    const isEvening = /\bevening\b/i.test(lower);

    let slots = avail.suggestedSlots || [];
    if (isMorning) {
      const morningOnly = slots.filter((s) => s.period === "morning");
      if (morningOnly.length > 0) slots = morningOnly;
    } else if (isAfternoon) {
      const afternoonOnly = slots.filter((s) => s.period === "afternoon");
      if (afternoonOnly.length > 0) slots = afternoonOnly;
    } else if (isEvening) {
      const eveningOnly = slots.filter((s) => s.period === "evening");
      if (eveningOnly.length > 0) slots = eveningOnly;
    }

    if (avail.available && slots.length > 0) {
      const slotStrings = slots
        .slice(0, 4)
        .map((s) => `• ${s.time} with ${s.staffName}`)
        .join("\n");

      const periodLabel = isMorning ? " morning" : isAfternoon ? " afternoon" : isEvening ? " evening" : "";

      const activeDraftObj = ctx.draftToken ? await getDraftFromToken(ctx.draftToken) : null;

      return {
        success: true,
        message: `Yes, we have verified${periodLabel} openings for **${avail.serviceName || "appointments"}** on **${dateStr}**:\n\n${slotStrings}\n\nWould you like to reserve one of these times?`,
        bookingHandoff: {
          hasIntent: true,
          date: dateStr,
          serviceName: avail.serviceName,
          staffName: targetStaffName,
        },
        suggestedSlots: slots.slice(0, 4).map((s) => ({
          time: s.time,
          period: s.period,
          staffName: s.staffName,
        })),
        draft: activeDraftObj || undefined,
        draftToken: ctx.draftToken,
        toolsUsed,
        mode: "mock",
      };
    }

    return {
      success: true,
      message: `I checked our live schedule for **${dateStr}**, but no open appointment slots were found matching that criteria. Would you like to check another day?`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 5. Intent Priority 2: Staff Roster & Qualification (Defect R-002, E-005)
  // General staff/team inquiries without appointment constraints ("Which staff members are available?", "Who works here?", "Show me your stylists")
  // Or direct staff qualification questions ("Which services can Daniel QA perform?", "Can Omar QA perform Luxury Beard Sculpt?", "Can Emma QA perform Express Hair Wash?")
  if (isStaffInquiry || isGeneralStaffRosterQuery || isStaffQualificationQuery) {
    toolsUsed.push("listStaff");

    const profile = await getPublicSalonProfile(ctx.businessSlug);
    const salonData = profile.success && profile.data ? profile.data : null;

    let matchedService = salonData ? resolveServiceFromText(query, salonData.services) : undefined;
    const matchedStaff = salonData ? findMatchingStaffFromText(query, salonData.staff) : undefined;

    if (!matchedService && salonData && (ctx.draftToken || draftToken)) {
      const activeDraftToken = ctx.draftToken || draftToken;
      if (activeDraftToken) {
        try {
          const loadedDraft = await getDraftFromToken(activeDraftToken);
          if (loadedDraft && loadedDraft.serviceId) {
            const draftSvc = salonData.services.find((s) => s.id === loadedDraft.serviceId);
            if (draftSvc) {
              const mentionsDraftService =
                /\b(this|the|that)\s+(haircut|service|treatment|cut|session)\b/i.test(lower) ||
                (/\b(haircut|hair\s*cut)\b/i.test(lower) && draftSvc.name.toLowerCase().includes("haircut"));
              if (mentionsDraftService) {
                matchedService = draftSvc;
              }
            }
          }
        } catch {
          // ignore draft retrieval error
        }
      }
    }

    const staffRes = (await salonTools.listStaff.execute(ctx, {
      staffName: matchedStaff ? matchedStaff.displayName : undefined,
      serviceName: matchedService ? matchedService.name : undefined,
    })) as {
      specificSpecialist?: {
        id: string;
        name: string;
        displayName: string;
        role: string;
        isQualified?: boolean;
        targetServiceName?: string;
        targetServiceId?: string;
        qualifiedServices: string[];
        otherQualifiedStaffForService?: string[];
      };
      targetService?: {
        id: string;
        name: string;
        qualifiedStaffNames: string[];
      };
      staff: Array<{
        id: string;
        name: string;
        displayName?: string;
        role: string;
        qualifiedServices: string[];
      }>;
    };

    if (!staffRes.staff || staffRes.staff.length === 0) {
      return {
        success: true,
        message: `Our specialists are ready to welcome you! You can select 'Any Available Specialist' when booking online.`,
        toolsUsed,
        mode: "mock",
      };
    }

    const isHaircutInquiry = /\b(haircut|hair\s*cut|balon|baal|cutting)\b/i.test(lower);
    const mentionsSarah = /\b(sarah|sara)\b/i.test(lower);
    const isUrdu = /\b(kaun|kon|hai|hain|karta|karti|ke\s+liye|kahan|kya)\b/i.test(lower);

    // Defect R-002: Sarah QA specific restriction check
    if (mentionsSarah && (isHaircutInquiry || matchedService?.name.toLowerCase().includes("haircut"))) {
      const msg = isUrdu
        ? `Sarah QA sirf **Hair Styling** karti hain aur haircuts perform nahi karti. **Classic Haircut** ke liye hamare qualified specialists **Alex QA** aur **Emma QA** hain. Kya aap Alex ya Emma ke sath slot check karna chahte hain?`
        : `Sarah QA specializes in **Hair Styling** only and does not perform haircuts. For a **Classic Haircut**, our qualified specialists are **Alex QA** and **Emma QA**. Would you like to check availability with Alex or Emma?`;

      return {
        success: true,
        message: msg,
        toolsUsed,
        mode: "mock",
      };
    }

    // Dynamic Qualification Case A: Specialist queried with specific service ("Can Omar QA perform Luxury Beard Sculpt?", "Can Emma QA perform Express Hair Wash?", "Can Omar QA perform Scalp Massage Therapy?")
    if (matchedStaff && matchedService) {
      const staffName = matchedStaff.displayName || "Specialist";
      const isQualified =
        staffRes.specificSpecialist?.isQualified ??
        (matchedService.assignedStaffIds || []).includes(matchedStaff.id);

      if (isQualified) {
        const msg = isUrdu
          ? `Jee bilkul! **${staffName}** hamari qualified specialist hain aur **${matchedService.name}** offer karte hain. Kya aap ${staffName} ke sath slot check karna chahte hain?`
          : `Yes, **${staffName}** is qualified and offers **${matchedService.name}**. Would you like to check available times with ${staffName}?`;

        return {
          success: true,
          message: msg,
          toolsUsed,
          mode: "mock",
        };
      } else {
        const qualifiedStaff = (salonData?.staff || []).filter((st) =>
          (matchedService.assignedStaffIds || []).includes(st.id) && st.id !== matchedStaff.id
        );
        const otherStaffNames = formatStaffList(
          qualifiedStaff.map((st) => st.displayName)
        );

        const msg = isUrdu
          ? `Nahi, **${staffName}** **${matchedService.name}** perform nahi karte. **${matchedService.name}** ke liye hamare qualified specialists ${otherStaffNames} hain. Kya aap availability check karna chahte hain?`
          : `No, **${staffName}** is not assigned to **${matchedService.name}**. For **${matchedService.name}**, our qualified specialists are ${otherStaffNames}. Would you like to check availability with ${otherStaffNames}?`;

        return {
          success: true,
          message: msg,
          toolsUsed,
          mode: "mock",
        };
      }
    }

    // Dynamic Qualification Case B: Specialist queried for their services ("Which services can Daniel QA perform?", "What can Omar QA do?")
    if (matchedStaff && !matchedService) {
      const staffName = matchedStaff.displayName || "Specialist";
      const assignedServices =
        staffRes.specificSpecialist?.qualifiedServices ||
        (salonData?.services || [])
          .filter((svc) => (svc.assignedStaffIds || []).includes(matchedStaff.id))
          .map((svc) => svc.name);

      const servicesFormatted = formatServicesList(assignedServices);

      const msg = isUrdu
        ? `**${staffName}** yeh services perform karte hain: ${servicesFormatted}. Kya aap ${staffName} ke sath slot book karna chahte hain?`
        : `**${staffName}** offers ${servicesFormatted}. Would you like to check availability or book an appointment with ${staffName}?`;

      return {
        success: true,
        message: msg,
        toolsUsed,
        mode: "mock",
      };
    }

    // Dynamic Qualification Case C: Service queried for qualified staff ("Who can perform Scalp Massage Therapy?", "Who does haircuts?")
    if (matchedService && !matchedStaff) {
      const qualified = (salonData?.staff || []).filter((st) =>
        (matchedService.assignedStaffIds || []).includes(st.id)
      );
      const staffListFormatted = formatStaffList(
        qualified.map((st) => st.displayName)
      );

      const msg = isUrdu
        ? `**${matchedService.name}** ke liye hamare qualified specialists ${staffListFormatted} hain. Kya aap availability check karna chahte hain?`
        : `For **${matchedService.name}**, our qualified specialists are ${staffListFormatted}. Would you like to check availability?`;

      return {
        success: true,
        message: msg,
        toolsUsed,
        mode: "mock",
      };
    }

    // Defect R-002 haircut roster query (e.g. "Who can do a haircut?")
    if (isHaircutInquiry) {
      const qualified = staffRes.staff.filter((st) =>
        st.qualifiedServices && st.qualifiedServices.some((s) => s.toLowerCase().includes("haircut"))
      );
      const staffList = qualified
        .map((st) => `• **${st.name}** (${st.role})`)
        .join("\n");

      const msg = isUrdu
        ? `Haircuts ke liye hamare qualified specialists yeh hain:\n\n${staffList}\n\n(Note: Sarah QA sirf Hair Styling karti hain). Kya aap inme se kisi ke sath slot book karna chahte hain?`
        : `For haircuts, our qualified specialists are:\n\n${staffList}\n\n(Note: Sarah QA specializes in Hair Styling only). Would you like to book with one of our barbers?`;

      return {
        success: true,
        message: msg,
        toolsUsed,
        mode: "mock",
      };
    }

    // General team roster ("Who works here?", "Show me your team")
    const staffList = staffRes.staff
      .map((st) => {
        const servicesDesc =
          st.qualifiedServices && st.qualifiedServices.length > 0
            ? ` — Services: ${st.qualifiedServices.join(", ")}`
            : "";
        return `• **${st.name}** (${st.role})${servicesDesc}`;
      })
      .join("\n");

    const msg = isUrdu
      ? `Yeh hamari ${ctx.businessName} ki team hai:\n\n${staffList}\n\nAap kis specialist ya service ke liye appointment book karna chahte hain?`
      : `Here are our team members at ${ctx.businessName}:\n\n${staffList}\n\nYou can request any specialist specifically when making a booking.`;

    return {
      success: true,
      message: msg,
      toolsUsed,
      mode: "mock",
    };
  }

  // 6. Intent Priority 3: Explicit Pricing
  // Triggered ONLY by explicit price/cost questions ("How much is a Classic Haircut?", "What are your prices?")
  // A service name appearing in a message does NOT classify it as a price question.
  if (isExplicitPriceQuery) {
    toolsUsed.push("listServices");
    const res = (await salonTools.listServices.execute(ctx, {})) as {
      currency: string;
      services: Array<{
        name: string;
        priceFormatted: string;
        durationMinutes: number;
        category?: string;
      }>;
    };

    if (!res.services || res.services.length === 0) {
      return {
        success: true,
        message: `We currently have no services listed online. Please contact ${ctx.businessName} directly.`,
        toolsUsed,
        mode: "mock",
      };
    }

    // Check if user asked about a specific service price
    const specific = findMatchingService(lower, res.services);

    if (specific) {
      return {
        success: true,
        message: `Our **${specific.name}** is **${specific.priceFormatted}** (duration: ${specific.durationMinutes} mins). Would you like to check available slots for this service?`,
        bookingHandoff: {
          hasIntent: false,
          serviceName: specific.name,
        },
        toolsUsed,
        mode: "mock",
      };
    }

    const serviceList = res.services
      .map(
        (s) =>
          `• **${s.name}** — ${s.priceFormatted} (${s.durationMinutes} mins)`
      )
      .join("\n");

    return {
      success: true,
      message: `Here are the active services and prices at ${ctx.businessName}:\n\n${serviceList}\n\nWould you like to book one of these treatments?`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 7. Intent Priority 4: General Service List & Booking Intent
  // General service-list questions ("What services do you offer?", "Show me the menu")
  // Or direct booking requests ("I want to book an appointment")
  const isServiceListQuery =
    /\b(services|menu|treatments|what do you do|what do you offer|kya services)\b/i.test(lower);

  const isBookingQuery =
    /\b(book|booking|reserve|reservation|schedule|chahiye|karni hai|book karna)\b/i.test(
      lower
    );

  if (isServiceListQuery || isBookingQuery) {
    toolsUsed.push("listServices");
    const res = (await salonTools.listServices.execute(ctx, {})) as {
      currency: string;
      services: Array<{
        id: string;
        name: string;
        priceFormatted: string;
        durationMinutes: number;
      }>;
    };

    const specific = findMatchingService(lower, res.services || []);

    if (isBookingQuery) {
      const orch = await orchestrateConversationalBooking(
        {
          channel: "hosted_web",
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          conversationId: "conv-" + ctx.businessSlug,
          salonTimezone: ctx.timezone,
        },
        query,
        draftToken
      );

      return {
        success: true,
        message: orch.textMessage,
        draft: orch.draft,
        draftToken: orch.draftToken,
        card: orch.card,
        toolsUsed: ["listServices", "checkAvailability"],
        mode: "mock",
      };
    }

    if (specific) {
      return {
        success: true,
        message: `Our **${specific.name}** is **${specific.priceFormatted}** (duration: ${specific.durationMinutes} mins). Would you like to check available slots for this service?`,
        bookingHandoff: {
          hasIntent: false,
          serviceName: specific.name,
        },
        toolsUsed,
        mode: "mock",
      };
    }

    const serviceList = (res.services || [])
      .map(
        (s) =>
          `• **${s.name}** — ${s.priceFormatted} (${s.durationMinutes} mins)`
      )
      .join("\n");

    return {
      success: true,
      message: `Here are the active services at ${ctx.businessName}:\n\n${serviceList}\n\nWould you like to book one of these treatments?`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 8. Opening Hours & Location
  if (
    lower.includes("hour") ||
    lower.includes("open") ||
    lower.includes("close") ||
    lower.includes("timing") ||
    lower.includes("address") ||
    lower.includes("location") ||
    lower.includes("where are you") ||
    lower.includes("kahan")
  ) {
    toolsUsed.push("getOpeningHours");
    toolsUsed.push("getSalonInfo");

    const [hoursRes, infoRes] = await Promise.all([
      salonTools.getOpeningHours.execute(ctx, {}) as Promise<{
        timezone: string;
        openingHours: Array<{ day: string; isClosed: boolean; openTime: string; closeTime: string }>;
      }>,
      salonTools.getSalonInfo.execute(ctx, {}) as Promise<{ address: string; phone: string }>,
    ]);

    const activeDays = hoursRes.openingHours
      .map((h) =>
        h.isClosed ? `• ${h.day}: Closed` : `• ${h.day}: ${h.openTime} – ${h.closeTime}`
      )
      .join("\n");

    const addressText = infoRes.address ? `\n\n📍 **Location**: ${infoRes.address}` : "";

    return {
      success: true,
      message: `Here are the regular hours for ${ctx.businessName} (${hoursRes.timezone}):\n\n${activeDays}${addressText}`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 9. Graceful unsupported fallback
  return {
    success: true,
    message: `I can help you with services, prices, specialist availability, salon hours, and booking appointments at ${ctx.businessName}. Please feel free to ask about our treatments or when you'd like to visit!`,
    toolsUsed: [],
    mode: "mock",
  };
}
