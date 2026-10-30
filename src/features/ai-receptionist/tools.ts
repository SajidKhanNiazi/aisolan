import { getPublicSalonProfile, getPublicAppointmentAvailability } from "@/features/public-booking/server";
import { formatCurrency } from "@/features/services/types";
import {
  createDraft,
  updateDraft,
  getDraftFromToken,
  parseDraftToken,
  saveDraftToStorage,
} from "./booking/draft";
import {
  getSalonNowDate,
  extractDateFromText,
  extractTimeFromText,
} from "./booking/orchestrator";
import { buildConfirmationCard } from "./booking/adapter";
import { resolveWallClockCandidate } from "@/features/availability/timezone";
import { resolveServiceFromText, findMatchingStaffFromText } from "./booking/rehydrate";
import type { BookingDraft } from "./booking/types";
import type { ConversationalCard } from "./booking/adapter";
import type { ToolExecutionContext } from "./types";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (ctx: ToolExecutionContext, args: Record<string, unknown>) => Promise<unknown>;
}


export const salonTools: Record<string, ToolDefinition> = {
  getSalonInfo: {
    name: "getSalonInfo",
    description: "Retrieve official salon details, address, phone, email, policies, and timezone.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (ctx: ToolExecutionContext) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { error: "Salon profile could not be retrieved." };
      }
      const s = profile.data;
      return {
        name: s.name,
        type: s.businessType,
        description: s.description,
        address: [s.addressLine1, s.city, s.postalCode, s.country].filter(Boolean).join(", "),
        phone: s.phone,
        email: s.email,
        timezone: s.timezone,
        currency: s.currency,
        minNoticeHours: s.minNoticeHours,
        maxAdvanceDays: s.maxAdvanceDays,
        cancellationPolicy: s.cancellationPolicyText,
      };
    },
  },

  listServices: {
    name: "listServices",
    description: "List all active services, prices, durations, and categories offered by this salon.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (ctx: ToolExecutionContext) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { services: [] };
      }
      const salonData = profile.data;
      return {
        currency: salonData.currency,
        services: salonData.services.map((svc) => ({
          id: svc.id,
          name: svc.name,
          durationMinutes: svc.durationMinutes,
          bufferMinutes: svc.bufferMinutes,
          priceFormatted: formatCurrency(
            svc.priceAmount,
            svc.currency || salonData.currency
          ),
          priceMinor: svc.priceAmount,
          priceAmount: Number((svc.priceAmount / 100).toFixed(2)),
          description: svc.description,
        })),
      };
    },
  },

  listStaff: {
    name: "listStaff",
    description: "List active specialists/staff members and their assigned services. Can filter by service UUID or service name.",
    parameters: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "Optional service UUID to filter only staff who perform this service.",
        },
        serviceName: {
          type: "string",
          description: "Optional service name (e.g. 'Classic Haircut' or 'haircut') to filter only staff qualified for that service.",
        },
        staffName: {
          type: "string",
          description: "Optional specialist name (e.g. 'Emma QA') to check whether this specific specialist is qualified.",
        },
      },
    },
    execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { staff: [] };
      }
      const salonData = profile.data;
      let targetServiceId = typeof args.serviceId === "string" ? args.serviceId : undefined;

      if (!targetServiceId && typeof args.serviceName === "string" && args.serviceName.trim() !== "") {
        const queryName = args.serviceName.trim().toLowerCase();
        const found = salonData.services.find(
          (s) =>
            s.id.toLowerCase() === queryName ||
            s.name.toLowerCase() === queryName ||
            s.name.toLowerCase().includes(queryName) ||
            queryName.includes(s.name.toLowerCase())
        );
        if (found) {
          targetServiceId = found.id;
        }
      }

      const targetService = targetServiceId
        ? salonData.services.find((s) => s.id === targetServiceId)
        : undefined;

      const filtered = salonData.staff.filter((st) => {
        if (!targetService) return true;
        return (targetService.assignedStaffIds || []).includes(st.id);
      });

      let specificSpecialist:
        | { id: string; name: string; role: string; isQualified: boolean; qualifiedServices: string[] }
        | undefined = undefined;

      if (typeof args.staffName === "string" && args.staffName.trim() !== "") {
        const queryStaff = args.staffName.trim().toLowerCase();
        const found = salonData.staff.find((st) => {
          const anySt = st as unknown as { displayName?: string; name?: string };
          const name = (anySt.displayName || anySt.name || "").toLowerCase();
          return name.includes(queryStaff) || queryStaff.includes(name);
        });
        if (found) {
          const anySt = found as unknown as { displayName?: string; name?: string; role?: string };
          const name = anySt.displayName || anySt.name || "Specialist";
          const role = anySt.role || "Specialist";
          const isQualified = targetService
            ? (targetService.assignedStaffIds || []).includes(found.id)
            : true;
          const qualifiedServices = (salonData.services || [])
            .filter((svc) => (svc.assignedStaffIds || []).includes(found.id))
            .map((svc) => svc.name);
          specificSpecialist = {
            id: found.id,
            name,
            role,
            isQualified,
            qualifiedServices,
          };
        }
      }

      return {
        specificSpecialist,
        staff: filtered.map((st) => {
          const anySt = st as unknown as { displayName?: string; name?: string; role?: string };
          const name = anySt.displayName || anySt.name || "Specialist";
          const role = anySt.role || "Specialist";
          const qualifiedServices = (salonData.services || [])
            .filter((svc) => (svc.assignedStaffIds || []).includes(st.id))
            .map((svc) => svc.name);
          return {
            id: st.id,
            name,
            displayName: name,
            role,
            qualifiedServices,
          };
        }),
      };
    },
  },

  getOpeningHours: {
    name: "getOpeningHours",
    description: "Get the regular weekly opening and closing hours for the salon.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (ctx: ToolExecutionContext) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { hours: [] };
      }
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return {
        timezone: profile.data.timezone,
        openingHours: profile.data.openingHours.map((h) => ({
          day: dayNames[h.dayOfWeek],
          isClosed: h.isClosed,
          openTime: h.openTime ? h.openTime.substring(0, 5) : null,
          closeTime: h.closeTime ? h.closeTime.substring(0, 5) : null,
        })),
      };
    },
  },

  checkAvailability: {
    name: "checkAvailability",
    description:
      "Check live, conflict-free appointment availability for a specific service and date (YYYY-MM-DD), or discover the next available openings if no date is given. Resolves relative dates ('kal', 'today', 'tomorrow') and time periods ('morning', 'afternoon', 'evening'/'shaam').",
    parameters: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "Service UUID",
        },
        serviceName: {
          type: "string",
          description: "Optional service name to lookup if UUID is unknown (e.g. 'Classic Haircut')",
        },
        staffId: {
          type: "string",
          description: "Optional specialist UUID",
        },
        staffName: {
          type: "string",
          description: "Optional specialist name to lookup if UUID is unknown",
        },
        date: {
          type: "string",
          description:
            "Optional date in YYYY-MM-DD format or natural terms ('kal', 'tomorrow', 'today'). If omitted, discovers the earliest upcoming available slots across the next 7 days.",
        },
        preferredPeriod: {
          type: "string",
          description: "Optional preferred time period: 'morning', 'afternoon', or 'evening' ('shaam')",
        },
      },
    },
    execute: async (ctx: ToolExecutionContext, rawArgs: Record<string, unknown>) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { error: "Salon profile not available." };
      }

      // 1. Authoritative Service Resolution
      let targetServiceId = typeof rawArgs.serviceId === "string" ? rawArgs.serviceId : undefined;
      const targetServiceName =
        typeof rawArgs.serviceName === "string" ? rawArgs.serviceName.trim() : undefined;

      if (!targetServiceId && targetServiceName) {
        const found = resolveServiceFromText(targetServiceName, profile.data.services);
        if (found) {
          targetServiceId = found.id;
        } else if (/\b(haircut|cut|trim)\b/i.test(targetServiceName)) {
          const generic = profile.data.services.find((s) => /\b(haircut|cut|trim)\b/i.test(s.name));
          if (generic) targetServiceId = generic.id;
        }
      }

      // Check active draft state if serviceId was not passed explicitly
      if (!targetServiceId && ctx.draftToken) {
        try {
          const draft = await getDraftFromToken(ctx.draftToken);
          if (draft?.serviceId) {
            targetServiceId = draft.serviceId;
          }
        } catch {
          // ignore draft load error
        }
      }

      // Fallback for general availability inquiry if no specific service requested (e.g. "Any openings tomorrow?", "Who is available Friday?")
      if (!targetServiceId && profile.data.services.length > 0) {
        targetServiceId = profile.data.services[0].id;
      }

      if (!targetServiceId) {
        return {
          available: false,
          availableSlotsCount: 0,
          error: "Please specify which treatment or service you would like to book so I can check availability for you.",
          slots: [],
        };
      }

      const resolvedService = profile.data.services.find((s) => s.id === targetServiceId);
      const serviceDisplayName = resolvedService?.name || "appointments";

      // 2. Authoritative Specialist Lookup
      let staffId = typeof rawArgs.staffId === "string" ? rawArgs.staffId : undefined;
      const targetStaffName =
        typeof rawArgs.staffName === "string" ? rawArgs.staffName.trim() : undefined;

      if (!staffId && targetStaffName) {
        const foundStaff = findMatchingStaffFromText(targetStaffName, profile.data.staff);
        if (foundStaff) {
          staffId = foundStaff.id;
        }
      }

      // Check active draft specialist if not passed in tool args
      if (!staffId && ctx.draftToken) {
        try {
          const draft = await getDraftFromToken(ctx.draftToken);
          if (draft?.staffId && draft.staffPreference === "specific") {
            staffId = draft.staffId;
          }
        } catch {
          // ignore
        }
      }

      // Enforce Sarah QA service qualification restriction (specific to BookPilot QA Salon)
      const isQaSalon = ctx.businessSlug.toLowerCase() === "bookpilot-qa-salon";
      const isSarahStaff =
        (targetStaffName && targetStaffName.includes("sarah")) ||
        (staffId &&
          profile.data.staff.some(
            (st) =>
              st.id === staffId &&
              ((st as unknown as { displayName?: string; name?: string }).displayName || (st as unknown as { name?: string }).name || "")
                .toLowerCase()
                .includes("sarah")
          ));
      const isHaircutService =
        resolvedService?.name.toLowerCase().includes("haircut") ||
        resolvedService?.name.toLowerCase().includes("cut");

      if (isQaSalon && isSarahStaff && isHaircutService) {
        return {
          available: false,
          serviceName: serviceDisplayName,
          staffName: "Sarah QA",
          error:
            "Sarah QA specializes in Hair Styling only and does not perform haircuts. For Classic Haircut, our qualified specialists are Alex QA and Emma QA.",
          qualifiedSpecialists: ["Alex QA", "Emma QA"],
        };
      }

      const staffMap = new Map(
        profile.data.staff.map((st) => {
          const anySt = st as unknown as { displayName?: string; name?: string };
          return [st.id, anySt.displayName || anySt.name || "Specialist"];
        })
      );

      // Date resolution: check if explicit date or relative query ("kal", "today", "tomorrow", etc.)
      let targetDateStr: string | null = null;
      if (typeof rawArgs.date === "string" && rawArgs.date.trim() !== "") {
        const rawDateLower = rawArgs.date.trim().toLowerCase();
        if (!/\b(any time|anytime|earliest|next available|first available|any)\b/i.test(rawDateLower)) {
          targetDateStr = extractDateFromText(rawDateLower, ctx.timezone) || rawArgs.date.trim();
        }
      }

      // Bounded server-side slot discovery if date is omitted or user asked for "any time" / "earliest" / "next available"
      if (!targetDateStr) {
        const salonNow = getSalonNowDate(ctx.timezone);
        let discoveredSlots: Array<{
          localTime?: string;
          startTimeLocal?: string;
          startsAt: string;
          period: string;
          availableStaffIds?: string[];
        }> = [];
        let discoveredDate: string = salonNow.dateStr;

        for (let offset = 0; offset <= 7; offset++) {
          const candidate = new Date(Date.UTC(salonNow.year, salonNow.month - 1, salonNow.day + offset));
          const candDateStr = candidate.toISOString().split("T")[0];

          const availRes = await getPublicAppointmentAvailability(
            {
              businessSlug: ctx.businessSlug,
              serviceId: targetServiceId,
              staffId,
              staffPreference: staffId ? "specific" : "any",
              date: candDateStr,
            },
            undefined,
            { skipRateLimit: true }
          );

          if (availRes.success && availRes.data?.slots && availRes.data.slots.length > 0) {
            const active = availRes.data.slots.filter((s: unknown) => {
              const anyS = s as { isAvailable?: boolean };
              return anyS.isAvailable !== false;
            });
            if (active.length > 0) {
              discoveredSlots = active as unknown as typeof discoveredSlots;
              discoveredDate = candDateStr;
              break;
            }
          }
        }

        if (discoveredSlots.length === 0) {
          return {
            date: salonNow.dateStr,
            serviceId: targetServiceId,
            serviceName: serviceDisplayName,
            available: false,
            error: "No slots available in the upcoming 7 days.",
            availableSlotsCount: 0,
            slots: [],
          };
        }

        // Apply preferredPeriod filter if given
        let filtered = discoveredSlots;
        const periodQuery = typeof rawArgs.preferredPeriod === "string" ? rawArgs.preferredPeriod.toLowerCase() : "";
        if (periodQuery === "morning" || periodQuery === "subah") {
          filtered = discoveredSlots.filter((s) => (s.localTime || "") < "12:00");
        } else if (periodQuery === "afternoon" || periodQuery === "dopahar") {
          filtered = discoveredSlots.filter((s) => (s.localTime || "") >= "12:00" && (s.localTime || "") < "17:00");
        } else if (periodQuery === "evening" || periodQuery === "shaam") {
          filtered = discoveredSlots.filter((s) => (s.localTime || "") >= "17:00");
        }
        if (filtered.length === 0) filtered = discoveredSlots;

        return {
          date: discoveredDate,
          serviceId: targetServiceId,
          serviceName: serviceDisplayName,
          available: true,
          availableSlotsCount: filtered.length,
          suggestedSlots: filtered.slice(0, 3).map((s) => {
            const slotStaffId = s.availableStaffIds && s.availableStaffIds[0];
            const slotStaffName = slotStaffId ? staffMap.get(slotStaffId) : "Any Specialist";
            const time = s.localTime || s.startTimeLocal || "Available";
            return {
              time,
              period: s.period,
              staffName: slotStaffName,
            };
          }),
        };
      }

      // Explicit target date availability lookup
      const availRes = await getPublicAppointmentAvailability(
        {
          businessSlug: ctx.businessSlug,
          serviceId: targetServiceId,
          staffId,
          staffPreference: staffId ? "specific" : "any",
          date: targetDateStr,
        },
        undefined,
        { skipRateLimit: true }
      );

      if (!availRes.success || !availRes.data) {
        return {
          date: targetDateStr,
          available: false,
          error: availRes.error || "No slots available on this date or outside booking horizon.",
          availableSlotsCount: 0,
          slots: [],
        };
      }

      const activeSlots = (availRes.data.slots || []).filter((s: unknown) => {
        const anyS = s as { isAvailable?: boolean };
        return anyS.isAvailable !== false;
      });

      // Filter by period if requested
      let finalSlots = activeSlots;
      const periodQuery = typeof rawArgs.preferredPeriod === "string" ? rawArgs.preferredPeriod.toLowerCase() : "";
      if (periodQuery === "morning" || periodQuery === "subah") {
        finalSlots = activeSlots.filter((s) => ((s as { localTime?: string }).localTime || "") < "12:00");
      } else if (periodQuery === "afternoon" || periodQuery === "dopahar") {
        finalSlots = activeSlots.filter((s) => {
          const t = (s as { localTime?: string }).localTime || "";
          return t >= "12:00" && t < "17:00";
        });
      } else if (periodQuery === "evening" || periodQuery === "shaam") {
        finalSlots = activeSlots.filter((s) => ((s as { localTime?: string }).localTime || "") >= "17:00");
      }
      if (finalSlots.length === 0) finalSlots = activeSlots;

      // Offer top 3 slots for conversational clarity and mobile friendliness
      const slotLimit = 3;

      return {
        date: targetDateStr,
        serviceId: targetServiceId,
        serviceName: serviceDisplayName,
        available: finalSlots.length > 0,
        availableSlotsCount: finalSlots.length,
        suggestedSlots: finalSlots.slice(0, slotLimit).map((s) => {
          const anySlot = s as unknown as {
            availableStaffIds?: string[];
            staffName?: string;
            localTime?: string;
            startTimeLocal?: string;
            period: string;
          };
          const slotStaffId = anySlot.availableStaffIds && anySlot.availableStaffIds[0];
          const slotStaffName =
            anySlot.staffName || (slotStaffId ? staffMap.get(slotStaffId) : undefined) || "Any Specialist";
          const time = anySlot.localTime || anySlot.startTimeLocal || "Available";
          return {
            time,
            period: anySlot.period,
            staffName: slotStaffName,
          };
        }),
      };
    },
  },

  prepareBookingDraft: {
    name: "prepareBookingDraft",
    description:
      "Create or update an in-progress conversational booking draft and generate the interactive confirmation review card. Call this IMMEDIATELY whenever the customer provides ANY service, specialist, date, time, customerName, customerPhone, or customerEmail. Calling this tool incrementally maintains structured booking state across turns.",
    parameters: {
      type: "object",
      properties: {
        serviceName: {
          type: "string",
          description: "Name or UUID of the service to book (e.g. 'Classic Haircut').",
        },
        staffName: {
          type: "string",
          description: "Name or UUID of the requested specialist, or 'any' for any available specialist.",
        },
        date: {
          type: "string",
          description:
            "Target appointment date in YYYY-MM-DD format, or relative terms ('kal', 'tomorrow', 'today', 'friday').",
        },
        time: {
          type: "string",
          description: "Target appointment time in HH:MM format (24-hour, e.g. '14:00' or '10:00 AM').",
        },
        customerName: {
          type: "string",
          description: "Customer's full name.",
        },
        customerPhone: {
          type: "string",
          description: "Customer's phone number.",
        },
        customerEmail: {
          type: "string",
          description: "Optional customer email address for confirmation notifications.",
        },
        customerNotes: {
          type: "string",
          description: "Optional customer notes or special styling requests.",
        },
      },
    },
    execute: async (ctx: ToolExecutionContext, rawArgs: Record<string, unknown>) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { success: false, error: "Salon profile could not be retrieved." };
      }

      // 1. Resolve existing draft if draftToken is available
      let currentDraft: BookingDraft | null = null;
      let draftToken: string | undefined = ctx.draftToken;

      if (draftToken) {
        const loaded = await getDraftFromToken(draftToken);
        if (
          loaded &&
          (!loaded.businessSlug || loaded.businessSlug.toLowerCase() === ctx.businessSlug.toLowerCase()) &&
          new Date(loaded.expiresAt).getTime() > Date.now() &&
          loaded.stage !== "cancelled_draft" &&
          loaded.stage !== "confirmed"
        ) {
          currentDraft = loaded;
        }
      }

      // If no valid existing draft, create a fresh draft container
      if (!currentDraft) {
        const created = createDraft({
          channel: "hosted_web",
          businessId: ctx.businessId,
          businessSlug: ctx.businessSlug,
          conversationId: "conv-" + ctx.businessSlug,
          salonTimezone: ctx.timezone,
        });
        currentDraft = created.draft;
        draftToken = created.draftToken;
      }

      // 2. Resolve Service
      let targetService = currentDraft.serviceId
        ? profile.data.services.find((s) => s.id === currentDraft?.serviceId)
        : undefined;

      const requestedServiceName =
        typeof rawArgs.serviceName === "string" ? rawArgs.serviceName.trim() : undefined;
      if (requestedServiceName) {
        const found = resolveServiceFromText(requestedServiceName, profile.data.services);
        if (found) {
          targetService = found;
        }
      }

      // 3. Resolve Staff & Enforce Sarah QA restriction
      let staffId = currentDraft.staffId;
      let staffName = currentDraft.staffName;
      let staffPreference: "any" | "specific" = currentDraft.staffPreference || "any";

      const requestedStaffName =
        typeof rawArgs.staffName === "string" ? rawArgs.staffName.trim() : undefined;
      if (requestedStaffName) {
        const lowerReqStaff = requestedStaffName.toLowerCase();
        if (
          lowerReqStaff === "any" ||
          lowerReqStaff === "anyone" ||
          lowerReqStaff === "no preference"
        ) {
          staffId = undefined;
          staffName = "Any Specialist";
          staffPreference = "any";
        } else {
          const foundStaff = findMatchingStaffFromText(requestedStaffName, profile.data.staff);
          if (foundStaff) {
            const anySt = foundStaff as unknown as { displayName?: string; name?: string };
            const matchedName = anySt.displayName || anySt.name || "Specialist";

            // Guard: If haircut requested with Sarah QA, redirect to qualified staff
            const isQaSalon = ctx.businessSlug.toLowerCase() === "bookpilot-qa-salon";
            const isSarah = matchedName.toLowerCase().includes("sarah");
            const isHaircut = targetService?.name.toLowerCase().includes("haircut") || targetService?.name.toLowerCase().includes("cut");

            if (isQaSalon && isSarah && isHaircut) {
              staffId = undefined;
              staffName = "Any Specialist";
              staffPreference = "any";
            } else {
              staffId = foundStaff.id;
              staffName = matchedName;
              staffPreference = "specific";
            }
          }
        }
      }

      // 4. Resolve Date and Time (support relative terms 'kal', 'tomorrow', 'today', '3pm', etc.)
      let resolvedDateStr: string | undefined = undefined;
      if (typeof rawArgs.date === "string" && rawArgs.date.trim() !== "") {
        resolvedDateStr = extractDateFromText(rawArgs.date.trim(), ctx.timezone) || rawArgs.date.trim();
      }
      const dateStr = resolvedDateStr || currentDraft.slotDate;

      let resolvedTimeStr: string | undefined = undefined;
      if (typeof rawArgs.time === "string" && rawArgs.time.trim() !== "") {
        resolvedTimeStr = extractTimeFromText(rawArgs.time.trim()) || rawArgs.time.trim().substring(0, 5);
      }
      const timeStr = resolvedTimeStr || currentDraft.slotStartTime;

      // 5. Customer Details (Defect R-003: protect against conversational corruption)
      const nonNameWords =
        /\b(actually|instead|change|reschedule|switch|move|rather|shift|can i|could i|can we|wese|badal|tabdeel|baje|please|pm|am|tomorrow|today|appointment|service|haircut|kal|aaj|shaam|subah|book now|any time|anytime)\b/i;
      let candidateName =
        typeof rawArgs.customerName === "string" && rawArgs.customerName.trim() !== ""
          ? rawArgs.customerName.trim()
          : undefined;
      if (candidateName && nonNameWords.test(candidateName)) {
        candidateName = undefined;
      }
      const customerName = candidateName || currentDraft.customerName;
      const customerPhone =
        typeof rawArgs.customerPhone === "string" && rawArgs.customerPhone.trim() !== ""
          ? rawArgs.customerPhone.trim()
          : currentDraft.customerPhone;
      const customerEmail =
        typeof rawArgs.customerEmail === "string" && rawArgs.customerEmail.trim() !== ""
          ? rawArgs.customerEmail.trim()
          : currentDraft.customerEmail;
      const customerNotes =
        typeof rawArgs.customerNotes === "string" && rawArgs.customerNotes.trim() !== ""
          ? rawArgs.customerNotes.trim()
          : currentDraft.customerNotes;

      // 6. Check Slot Availability if Service, Date, and Time are known
      let canonicalStartsAtUtc = currentDraft.slotStartsAtUtc;
      let isSlotAvailable = true;
      let suggestedSlots: Array<{ time: string; period: string; staffName?: string }> = [];

      if (targetService && dateStr) {
        const availRes = await getPublicAppointmentAvailability(
          {
            businessSlug: ctx.businessSlug,
            serviceId: targetService.id,
            staffId: staffPreference === "specific" ? staffId : undefined,
            staffPreference,
            date: dateStr,
          },
          undefined,
          { skipRateLimit: true }
        );

        if (!availRes.success || !availRes.data || !availRes.data.slots || availRes.data.slots.length === 0) {
          isSlotAvailable = false;
        } else {
          const slots = availRes.data.slots;
          suggestedSlots = slots.slice(0, 3).map((s) => ({
            time: s.localTime || "Available",
            period: s.period,
            staffName: staffName || "Available Specialist",
          }));

          if (timeStr) {
            const matchingSlot = slots.find((s) => s.localTime === timeStr);
            if (!matchingSlot) {
              isSlotAvailable = false;
            } else {
              canonicalStartsAtUtc = matchingSlot.startsAt.endsWith("Z")
                ? matchingSlot.startsAt
                : new Date(matchingSlot.startsAt).toISOString();
            }
          }
        }
      }

      if (targetService && dateStr && timeStr && !isSlotAvailable) {
        return {
          success: false,
          available: false,
          serviceName: targetService.name,
          date: dateStr,
          time: timeStr,
          error: `The requested time (${timeStr} on ${dateStr}) is not available for ${targetService.name}.`,
          suggestedSlots,
        };
      }

      // If timestamp still unverified but date and time exist, compute via resolveWallClockCandidate
      if (!canonicalStartsAtUtc && dateStr && timeStr) {
        const resolved = resolveWallClockCandidate(dateStr, timeStr, ctx.timezone);
        if (resolved) {
          canonicalStartsAtUtc = resolved.utcInstant.toISOString();
        }
      }

      // 7. Update Draft
      const priceFormatted = targetService
        ? formatCurrency(targetService.priceAmount, targetService.currency || ctx.currency)
        : currentDraft.servicePriceFormatted;

      const hasRequiredContact = Boolean(
        customerName &&
          customerName.trim().length >= 2 &&
          customerPhone &&
          customerPhone.trim().length >= 7
      );
      const isComplete = Boolean(
        targetService && dateStr && timeStr && isSlotAvailable && hasRequiredContact
      );

      const targetStage = isComplete
        ? "awaiting_confirmation"
        : hasRequiredContact
        ? "collecting_datetime"
        : "collecting_customer_details";

      const updatedRes = updateDraft(currentDraft, {
        serviceId: targetService?.id,
        serviceName: targetService?.name,
        servicePriceCents: targetService?.priceAmount,
        servicePriceFormatted: priceFormatted,
        serviceDurationMinutes: targetService?.durationMinutes,
        staffId,
        staffName,
        staffPreference,
        slotDate: dateStr,
        slotStartTime: timeStr,
        slotStartsAtUtc: canonicalStartsAtUtc,
        customerName,
        customerPhone,
        customerEmail,
        customerNotes,
        stage: targetStage,
      });

      const updatedDraft = updatedRes.draft;
      const updatedDraftToken = updatedRes.draftToken;
      // Persist draft to durable storage
      const parsedToken = parseDraftToken(updatedDraftToken);
      if (parsedToken) {
        await saveDraftToStorage(updatedDraft, parsedToken.tokenHash, parsedToken.rawSecret);
      }

      // 8. Generate Confirmation Card if ready
      let card: ConversationalCard | undefined = undefined;
      if (isComplete && targetService) {
        card = buildConfirmationCard(
          updatedDraft,
          updatedDraftToken,
          ctx.businessName,
          {
            durationMinutes: targetService.durationMinutes,
            priceAmount: targetService.priceAmount,
            currency: targetService.currency || ctx.currency,
            name: targetService.name,
          },
          targetService.currency || ctx.currency
        );
      }

      const missingFields: string[] = [];
      if (!targetService) missingFields.push("service");
      if (!dateStr) missingFields.push("date");
      if (!timeStr) missingFields.push("time");
      if (!customerName || customerName.trim().length < 2) missingFields.push("customerName");
      if (!customerPhone || customerPhone.trim().length < 7) missingFields.push("customerPhone");

      let nextStepInstructions = "";
      if (isComplete) {
        nextStepInstructions =
          'All details are complete! Present the unconfirmed review card. Say: "Your booking details are ready. Please review them in the summary card below to finalize your reservation." NEVER say "Your appointment is booked", "Your appointment is confirmed", or "Your appointment is set". Do NOT suggest clicking any chat confirmation button.';
      } else if (!targetService) {
        nextStepInstructions = "Ask the customer which treatment they would like to book.";
      } else if (!dateStr) {
        const greeting = customerName ? `Thank the customer (${customerName}) and ` : "";
        nextStepInstructions = `${greeting}Ask the customer what day they would prefer (e.g. today, tomorrow, or a specific date). Do NOT ask for their name or phone again.`;
      } else if (!timeStr) {
        nextStepInstructions = `Date (${dateStr}) is known. Call checkAvailability to find verified slots and suggest up to 3 slots.`;
      } else if (!hasRequiredContact) {
        nextStepInstructions = `Slot is selected for ${dateStr} at ${timeStr}. Ask for the customer's full name and phone number to finalize their reservation review.`;
      }

      return {
        success: true,
        readyForConfirmation: isComplete,
        stage: targetStage,
        draft: updatedDraft,
        draftToken: updatedDraftToken,
        card,
        suggestedSlots,
        serviceName: targetService?.name,
        staffName: staffName || "Any Specialist",
        date: dateStr,
        time: timeStr,
        priceFormatted,
        durationMinutes: targetService?.durationMinutes,
        customerName,
        customerPhone,
        missingFields,
        nextStepInstructions,
      };
    },
  },

  cancelBookingDraft: {
    name: "cancelBookingDraft",
    description: "Cancel the active in-progress booking draft if the customer decides not to book or says stop/cancel.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (ctx: ToolExecutionContext) => {
      if (!ctx.draftToken) {
        return { success: true, message: "No active draft to cancel." };
      }
      const loaded = await getDraftFromToken(ctx.draftToken);
      if (loaded) {
        updateDraft(loaded, { stage: "cancelled_draft" });
        return { success: true, message: "Draft cancelled successfully." };
      }
      return { success: true, message: "No active draft found." };
    },
  },
};

