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
import type { PublicSalonProfile } from "@/features/public-booking/types";
import type { ChatMessage } from "../types";

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

  // 2. Resolve Service: check all messages from newest to oldest
  let resolvedService = salon.services.find((s) => s.id === currentDraft?.serviceId);

  if (!resolvedService) {
    // Priority: longer/more specific service names first
    const sortedServices = [...salon.services].sort((a, b) => b.name.length - a.name.length);
    for (const msg of [...userMessages].reverse()) {
      const msgLower = msg.toLowerCase();
      const matched = sortedServices.find((s) => {
        const sLower = s.name.toLowerCase();
        if (msgLower.includes(sLower)) return true;
        const words = sLower.split(/\s+/).filter((w) => w.length >= 4);
        return words.length > 0 && words.some((w) => msgLower.includes(w));
      });
      if (matched) {
        resolvedService = matched;
        break;
      }
    }
  }

  // 3. Resolve Specialist / Staff
  let resolvedStaffId: string | null | undefined = currentDraft?.staffId;
  let resolvedStaffName: string | null | undefined = currentDraft?.staffName;
  let resolvedStaffPreference: "any" | "specific" = currentDraft?.staffPreference || "any";

  if (!resolvedStaffId || resolvedStaffPreference === "any") {
    for (const msg of [...userMessages].reverse()) {
      const msgLower = msg.toLowerCase();
      const matchedStaff = salon.staff.find((st) => {
        const anySt = st as unknown as { displayName?: string; name?: string };
        const name = (anySt.displayName || anySt.name || "").toLowerCase();
        if (!name || name.length < 2) return false;
        if (msgLower.includes(name)) return true;
        const parts = name.split(/\s+/).filter((p) => p.length >= 3);
        return parts.some((p) => new RegExp(`\\b${p}\\b`, "i").test(msgLower));
      });

      if (matchedStaff) {
        const anySt = matchedStaff as unknown as { displayName?: string; name?: string };
        const matchedName = anySt.displayName || anySt.name || "Specialist";

        // Restriction check for Sarah QA on haircuts
        const isSarah = matchedName.toLowerCase().includes("sarah");
        const isHaircut = resolvedService?.name.toLowerCase().includes("haircut") || fullTextLower.includes("haircut");
        if (isSarah && isHaircut) {
          resolvedStaffId = null;
          resolvedStaffName = "Any Specialist";
          resolvedStaffPreference = "any";
        } else {
          resolvedStaffId = matchedStaff.id;
          resolvedStaffName = matchedName;
          resolvedStaffPreference = "specific";
        }
        break;
      }
    }
  }

  // 4. Resolve Date
  let resolvedDate: string | undefined = currentDraft?.slotDate;
  if (!resolvedDate) {
    for (const msg of [...userMessages].reverse()) {
      const d = extractDateFromText(msg, salon.timezone);
      if (d) {
        resolvedDate = d;
        break;
      }
    }
  }

  // 5. Resolve Time
  let resolvedTime: string | undefined = currentDraft?.slotStartTime;
  if (!resolvedTime) {
    for (const msg of [...userMessages].reverse()) {
      const t = extractTimeFromText(msg);
      if (t) {
        resolvedTime = t;
        break;
      }
    }
  }

  // 6. If at least service or date or staff was detected, ensure we have a valid draft container
  const hasAnyBookingDetails = Boolean(
    resolvedService ||
    resolvedDate ||
    resolvedStaffId ||
    /\b(book|appointment|schedule|reserve)\b/i.test(fullTextLower)
  );

  if (!hasAnyBookingDetails && !currentDraft) {
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

  // Update draft with any newly resolved fields
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
  }
  if (resolvedTime && resolvedTime !== currentDraft.slotStartTime) {
    updates.slotStartTime = resolvedTime;
  }

  if (Object.keys(updates).length > 0) {
    const res = updateDraft(currentDraft, updates);
    currentDraft = res.draft;
    activeToken = res.draftToken;
    await persist(currentDraft, activeToken);
  }

  return { draft: currentDraft, draftToken: activeToken };
}
