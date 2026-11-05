import { formatCurrency } from "@/features/services/types";
import { extractDateFromText, extractTimeFromText } from "./orchestrator";
import {
  createDraft,
  updateDraft,
  getDraftFromToken,
  parseDraftToken,
  saveDraftToStorage,
} from "./draft";
import type { BookingDraft, ConversationalChannel } from "./types";
import type { PublicSalonProfile, PublicService } from "@/features/public-booking/types";
import type { ChatMessage } from "../types";

/**
/**
 * Normalizes text for robust punctuation- and case-insensitive comparison.
 * Replaces '&' with 'and', strips non-alphanumeric chars, normalizes spaces.
 */
export function normalizeServiceComparisonText(str: string): string {
  return str
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a service that was explicitly recommended or highlighted by the assistant in its response.
 * Looks for patterns like "recommend our Haircut & Beard", "recommend Haircut & Beard", "Recommended: Haircut & Beard".
 */
export function resolveServiceFromAssistantRecommendation<T extends { id?: string; name: string }>(
  assistantText: string,
  services: T[]
): T | undefined {
  if (!assistantText || !services || services.length === 0) return undefined;

  const normAssistant = normalizeServiceComparisonText(assistantText);

  // Check services mentioned right after "recommend" or "suggest"
  const recRegex = /\b(?:recommend(?:ed|ing)?|suggest(?:ed|ing)?)\s+(?:our\s+|the\s+)?([a-z0-9\s]+)/i;
  const match = recRegex.exec(normAssistant);
  if (match && match[1]) {
    const candidateSnippet = match[1].slice(0, 40);
    const matchedService = resolveServiceFromText(candidateSnippet, services);
    if (matchedService) {
      return matchedService;
    }
  }

  // Fallback: check which services appear in assistant text, sorted by normalized length descending
  const sorted = [...services].sort(
    (a, b) => normalizeServiceComparisonText(b.name).length - normalizeServiceComparisonText(a.name).length
  );
  for (const s of sorted) {
    const normName = normalizeServiceComparisonText(s.name);
    if (normAssistant.includes(normName)) {
      return s;
    }
  }

  return undefined;
}

/**
 * Detects if a customer message ambiguously asks about multiple disparate services
 * connected with disjunctions (e.g. "or", "either", "vs") without choosing one.
 */
export function detectAmbiguousServiceMention<T extends { id?: string; name: string }>(
  text: string,
  services: T[]
): { isAmbiguous: boolean; matchedServices: T[] } {
  if (!text || !services || services.length === 0) {
    return { isAmbiguous: false, matchedServices: [] };
  }

  const normQuery = normalizeServiceComparisonText(text);
  const isDisjunctive = /\b(or|either|vs|versus|ya)\b/i.test(normQuery);
  if (!isDisjunctive) {
    return { isAmbiguous: false, matchedServices: [] };
  }

  const matched = services.filter((s) => {
    const normName = normalizeServiceComparisonText(s.name);
    const tokens = normName
      .split(/\s+/)
      .filter((t) => t.length >= 3 && t !== "and" && t !== "the");
    return (
      normQuery.includes(normName) ||
      (tokens.length > 1 && tokens.every((t) => new RegExp(`\\b${t}\\b`, "i").test(normQuery)))
    );
  });

  if (matched.length > 1) {
    return { isAmbiguous: true, matchedServices: matched };
  }

  return { isAmbiguous: false, matchedServices: matched };
}

/**
 * Resolves a service accurately and deterministically from conversation text.
 * Prioritizes normalized exact matches and compound/combo services before single-token fallbacks.
 * Never switches to a sub-component (e.g. Beard Trim) when a compound service (Haircut & Beard) is mentioned.
 */
export function resolveServiceFromText<T extends { id?: string; name: string }>(
  text: string,
  services: T[]
): T | undefined {
  if (!text || !services || services.length === 0) return undefined;
  const rawLower = text.trim().toLowerCase();

  // 1. Direct UUID match (if user or tool passed exact serviceId)
  const idMatch = services.find((s) => s.id && s.id.toLowerCase() === rawLower);
  if (idMatch) return idMatch;

  const normQuery = normalizeServiceComparisonText(text);
  if (!normQuery) return undefined;

  // Sort services by normalized name length descending (longest / most specific compound service first)
  const sorted = [...services].sort(
    (a, b) => normalizeServiceComparisonText(b.name).length - normalizeServiceComparisonText(a.name).length
  );

  // Tier 1: Exact full normalized service name match (word-boundary safe or exact substring)
  for (const s of sorted) {
    const normName = normalizeServiceComparisonText(s.name);
    if (!normName) continue;
    if (
      normQuery === normName ||
      new RegExp(`(?:^|\\s)${normName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`).test(normQuery) ||
      normQuery.includes(normName)
    ) {
      return s;
    }
  }

  // Tier 2: Compound / combo match where all significant words in the service name appear in the query
  // e.g. "Haircut & Beard" requires both "haircut" AND "beard"
  // If the query contains "haircut and beard trim", both "haircut" and "beard" are present,
  // so the compound package matches first (checked before single-component services).
  for (const s of sorted) {
    const normName = normalizeServiceComparisonText(s.name);
    const tokens = normName
      .split(/\s+/)
      .filter((t) => t.length >= 3 && t !== "and" && t !== "the" && t !== "for" && t !== "with");
    if (tokens.length > 1 && tokens.every((t) => new RegExp(`\\b${t}\\b`, "i").test(normQuery))) {
      return s;
    }
  }

  // Tier 3: Single-token match ONLY if the token uniquely identifies a single service
  // E.g., if only one service contains "balayage", "balayage" matches it.
  // If multiple services contain "haircut" (e.g. "Classic Haircut" and "Haircut & Beard"),
  // a generic "haircut" mention is ambiguous and returns undefined (does not guess!).
  const queryTokens = normQuery.split(/\s+/).filter((t) => t.length >= 4);
  for (const token of queryTokens) {
    const matchingServices = sorted.filter((s) =>
      new RegExp(`\\b${token}\\b`, "i").test(normalizeServiceComparisonText(s.name))
    );
    if (matchingServices.length === 1) {
      return matchingServices[0];
    }
  }

  return undefined;
}

/**
 * Resolves a specialist from conversation text.
 */
export function findMatchingStaffFromText<T extends { id?: string; name?: string; displayName?: string }>(
  text: string,
  staffList: T[]
): T | undefined {
  if (!text || !staffList || staffList.length === 0) return undefined;
  const lower = text.trim().toLowerCase();

  for (const st of staffList) {
    const name = ((st.displayName || st.name || "") as string).trim().toLowerCase();
    if (!name || name.length < 2) continue;
    if (lower.includes(name)) return st;

    const parts = name.split(/\s+/).filter((p) => p.length >= 3);
    if (parts.length > 0 && parts.some((p) => new RegExp(`\\b${p}\\b`, "i").test(lower))) {
      return st;
    }
  }

  return undefined;
}

/**
 * Rehydrates conversational booking draft state across serverless turns.
 * Inspects multi-turn message history to preserve selected service, staff, date, time,
 * and customer contact details even if the client omitted or lost draftToken.
 */
export async function rehydrateDraftFromHistory(
  messages: ChatMessage[],
  salon: PublicSalonProfile,
  existingDraftToken?: string | null,
  channel: ConversationalChannel = "embedded_web"
): Promise<{ draft: BookingDraft; draftToken: string } | null> {
  let currentDraft: BookingDraft | null = null;
  let activeToken: string | null = null;

  // 1. Try loading existing draft from token if provided
  if (existingDraftToken && typeof existingDraftToken === "string" && existingDraftToken.trim().length > 0) {
    try {
      const loaded = await getDraftFromToken(existingDraftToken.trim());
      if (
        loaded &&
        (!loaded.businessSlug || loaded.businessSlug.toLowerCase() === salon.slug.toLowerCase()) &&
        new Date(loaded.expiresAt).getTime() > Date.now() &&
        loaded.stage !== "cancelled_draft" &&
        loaded.stage !== "confirmed"
      ) {
        currentDraft = loaded;
        activeToken = existingDraftToken.trim();
      }
    } catch {
      // Fall through to history rehydration
    }
  }

  // Helper to persist
  const persist = async (d: BookingDraft, tok: string) => {
    const parsed = parseDraftToken(tok);
    if (parsed) {
      await saveDraftToStorage(d, parsed.tokenHash, parsed.rawSecret);
    }
  };

  // Filter user messages
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  if (userMessages.length === 0) {
    if (currentDraft && activeToken) return { draft: currentDraft, draftToken: activeToken };
    return null;
  }

  // Full conversation text for broader context
  const fullUserText = userMessages.join("\n");
  const fullTextLower = fullUserText.toLowerCase();

  // Identify latest user message and preceding assistant message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const latestUserQuery = lastUserMsg?.content || "";
  const latestUserQueryLower = latestUserQuery.trim().toLowerCase();

  let prevAssistantMsg: ChatMessage | undefined = undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      for (let j = i - 1; j >= 0; j--) {
        if (messages[j].role === "assistant") {
          prevAssistantMsg = messages[j];
          break;
        }
      }
      break;
    }
  }

  // 2. Resolve Service across turns
  let resolvedService: PublicService | undefined = undefined;

  // A. Check if the latest user query explicitly names or switches a service
  const explicitLatestMatch = resolveServiceFromText(latestUserQuery, salon.services);
  if (explicitLatestMatch) {
    resolvedService = explicitLatestMatch;
  }

  // B. Check if the latest query is an anaphoric follow-up ("that", "it", "cost of that", "slots for that", "tomorrow afternoon", etc.)
  const isAnaphoricOrFollowUp =
    !explicitLatestMatch &&
    (/\b(that|it|this|the recommended|recommended|same|that one|this one|first one)\b/i.test(
      latestUserQueryLower
    ) ||
      /\b(how much|cost|price|rates?|slots?|openings?|available|availability|tomorrow|today|kal|aaj)\b/i.test(
        latestUserQueryLower
      ));

  if (!resolvedService && isAnaphoricOrFollowUp) {
    // 1. Look for recommendation in previous assistant message
    if (prevAssistantMsg) {
      const recMatch = resolveServiceFromAssistantRecommendation(
        prevAssistantMsg.content,
        salon.services
      );
      if (recMatch) {
        resolvedService = recMatch;
      }
    }

    // 2. Fall back to existing draft service if already established
    if (!resolvedService && currentDraft?.serviceId) {
      resolvedService = salon.services.find((s) => s.id === currentDraft?.serviceId);
    }
  }

  // C. Fall back to earlier user messages in reverse chronological order
  if (!resolvedService) {
    for (const msg of [...userMessages].reverse()) {
      const matched = resolveServiceFromText(msg, salon.services);
      if (matched) {
        resolvedService = matched;
        break;
      }
    }
  }

  // D. Final fallback to loaded draft service
  if (!resolvedService && currentDraft?.serviceId) {
    resolvedService = salon.services.find((s) => s.id === currentDraft?.serviceId);
  }

  // Safe redacted service resolution telemetry
  const sanitizedQuery = latestUserQuery.substring(0, 100).replace(/[\r\n]+/g, " ");
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[Service Resolution Telemetry] Salon: ${salon.slug} | Query: "${sanitizedQuery}" | ResolvedServiceId: ${resolvedService?.id || "none"} | CanonicalName: "${resolvedService?.name || "none"}" | AuthoritativePrice: ${resolvedService ? formatCurrency(resolvedService.priceAmount, salon.currency) : "n/a"} | Duration: ${resolvedService?.durationMinutes || "n/a"}m`
    );
  }

  // 3. Resolve Specialist / Staff
  let resolvedStaffId: string | null | undefined = currentDraft?.staffId;
  let resolvedStaffName: string | null | undefined = currentDraft?.staffName;
  let resolvedStaffPreference: "any" | "specific" = currentDraft?.staffPreference || "any";

  for (const msg of [...userMessages].reverse()) {
    const matchedStaff = findMatchingStaffFromText(msg, salon.staff);
    if (matchedStaff) {
      const anySt = matchedStaff as unknown as { displayName?: string; name?: string };
      const matchedName = anySt.displayName || anySt.name || "Specialist";

      // Check authoritative assignment against resolved service
      const isAssigned = resolvedService
        ? (resolvedService.assignedStaffIds || []).length > 0 &&
          (resolvedService.assignedStaffIds || []).includes(matchedStaff.id)
        : true;

      if (salon.allowStaffSelection === false) {
        resolvedStaffId = null;
        resolvedStaffName = "Any Specialist";
        resolvedStaffPreference = "any";
      } else if (!isAssigned) {
        resolvedStaffId = null;
        resolvedStaffName = matchedName;
        resolvedStaffPreference = "specific";
      } else {
        resolvedStaffId = matchedStaff.id;
        resolvedStaffName = matchedName;
        resolvedStaffPreference = "specific";
      }
      break;
    }
  }

  // 4. Resolve Date
  let resolvedDate: string | undefined = undefined;
  for (const msg of [...userMessages].reverse()) {
    const d = extractDateFromText(msg, salon.timezone);
    if (d) {
      resolvedDate = d;
      break;
    }
  }
  if (!resolvedDate && currentDraft?.slotDate) {
    resolvedDate = currentDraft.slotDate;
  }

  // 5. Resolve Time
  let resolvedTime: string | undefined = undefined;
  for (const msg of [...userMessages].reverse()) {
    const t = extractTimeFromText(msg);
    if (t) {
      resolvedTime = t;
      break;
    }
  }
  if (!resolvedTime && currentDraft?.slotStartTime) {
    resolvedTime = currentDraft.slotStartTime;
  }

  // Check if latest message is a pure staff qualification inquiry (e.g. "Which services can Daniel QA perform?")
  const isQualificationQuestion =
    /\b(which|what)\s+(services?|treatments?|haircuts?)\s+(can|does|do)\b/i.test(latestUserQuery) ||
    /\bwhat\s+can\s+[a-zA-Z\s]+?\s+(perform|do|offer|provide)\b/i.test(latestUserQuery) ||
    /\b(can|does|is|could)\s+[a-zA-Z\s]+?\s+(perform|do|offer|provide|cut|handle|qualified)\b/i.test(latestUserQuery) ||
    /\bwho\s+(can|does|will|offers?|performs?|provides?)\b/i.test(latestUserQuery);

  // 6. If at least service or date or staff was detected, ensure we have a valid draft container
  const hasAnyBookingDetails = Boolean(
    resolvedService ||
    resolvedDate ||
    (resolvedStaffId && !isQualificationQuestion) ||
    /\b(book|appointment|schedule|reserve)\b/i.test(fullTextLower)
  );

  if ((!hasAnyBookingDetails || (isQualificationQuestion && !resolvedDate && !currentDraft)) && !currentDraft) {
    return null;
  }

  if (!currentDraft || !activeToken) {
    const created = createDraft({
      channel,
      businessId: salon.id,
      businessSlug: salon.slug,
      conversationId: `conv-${salon.slug}-${Date.now()}`,
      salonTimezone: salon.timezone,
    });
    currentDraft = created.draft;
    activeToken = created.draftToken;
  }

  // Update draft with any newly resolved fields using authoritative database data
  const updates: Partial<BookingDraft> = {};
  if (resolvedService && resolvedService.id !== currentDraft.serviceId) {
    updates.serviceId = resolvedService.id;
    updates.serviceName = resolvedService.name;
    updates.serviceDurationMinutes = resolvedService.durationMinutes;
    updates.servicePriceCents = resolvedService.priceAmount;
    updates.servicePriceFormatted = formatCurrency(resolvedService.priceAmount, salon.currency);
  }
  if (resolvedStaffId !== undefined && resolvedStaffId !== currentDraft.staffId) {
    updates.staffId = resolvedStaffId;
    updates.staffName = resolvedStaffName;
    updates.staffPreference = resolvedStaffPreference;
  }
  if (resolvedDate && resolvedDate !== currentDraft.slotDate) {
    updates.slotDate = resolvedDate;
    updates.slotStartsAtUtc = undefined;
  }
  if (resolvedTime && resolvedTime !== currentDraft.slotStartTime) {
    updates.slotStartTime = resolvedTime;
    updates.slotStartsAtUtc = undefined;
  }

  if (Object.keys(updates).length > 0) {
    const res = updateDraft(currentDraft, updates);
    currentDraft = res.draft;
    activeToken = res.draftToken;
    await persist(currentDraft, activeToken);
  }

  return { draft: currentDraft, draftToken: activeToken };
}
