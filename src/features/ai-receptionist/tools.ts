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
    description:
      "List active specialists/staff members and their assigned services, or check if a specialist is qualified for a service.",
    parameters: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "Optional service UUID to filter only staff who perform this service.",
        },
        serviceName: {
          type: "string",
          description:
            "Optional service name (e.g. 'Classic Haircut' or 'Express Hair Wash') to filter only staff qualified for that service.",
        },
        staffId: {
          type: "string",
          description: "Optional specialist UUID.",
        },
        staffName: {
          type: "string",
          description:
            "Optional specialist name (e.g. 'Daniel QA', 'Omar QA', 'Emma QA') to check whether this specific specialist is qualified or retrieve their assigned services.",
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
        const found = resolveServiceFromText(args.serviceName.trim(), salonData.services);
        if (found) {
          targetServiceId = found.id;
        }
      }

      const targetService = targetServiceId
        ? salonData.services.find((s) => s.id === targetServiceId)
        : undefined;

      let targetStaff = typeof args.staffId === "string"
        ? salonData.staff.find((st) => st.id === args.staffId)
        : undefined;

      if (!targetStaff && typeof args.staffName === "string" && args.staffName.trim() !== "") {
        targetStaff = findMatchingStaffFromText(args.staffName.trim(), salonData.staff);
      }

      const filteredStaff = salonData.staff.filter((st) => {
        if (!targetService) return true;
        return (targetService.assignedStaffIds || []).includes(st.id);
      });

      let specificSpecialist:
        | {
            id: string;
            name: string;
            displayName: string;
            role: string;
            isQualified?: boolean;
            targetServiceName?: string;
            targetServiceId?: string;
            qualifiedServices: string[];
            otherQualifiedStaffForService?: string[];
          }
        | undefined = undefined;

      if (targetStaff) {
        const anySt = targetStaff as unknown as { displayName?: string; name?: string; role?: string };
        const name = anySt.displayName || anySt.name || "Specialist";
        const role = anySt.role || "Specialist";
        const qualifiedServices = (salonData.services || [])
          .filter((svc) => (svc.assignedStaffIds || []).includes(targetStaff.id))
          .map((svc) => svc.name);

        const isQualified = targetService
          ? (targetService.assignedStaffIds || []).includes(targetStaff.id)
          : true;

        const otherQualifiedStaff = targetService
          ? salonData.staff
              .filter((st) => (targetService.assignedStaffIds || []).includes(st.id) && st.id !== targetStaff.id)
              .map((st) => st.displayName)
          : [];

        specificSpecialist = {
          id: targetStaff.id,
          name,
          displayName: name,
          role,
          isQualified,
          targetServiceName: targetService?.name,
          targetServiceId: targetService?.id,
          qualifiedServices,
          otherQualifiedStaffForService: otherQualifiedStaff,
        };
      }

      return {
        specificSpecialist,
        targetService: targetService
          ? {
              id: targetService.id,
              name: targetService.name,
              qualifiedStaffNames: filteredStaff.map((st) => st.displayName),
            }
          : undefined,
        staff: filteredStaff.map((st) => {
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
      let targetServiceId = typeof rawArgs.serviceId === "string" ? rawArgs.serviceId.trim() : undefined;
      const targetServiceName =
        typeof rawArgs.serviceName === "string" ? rawArgs.serviceName.trim() : undefined;

      const isAnaphoricArg =
        targetServiceName &&
        /^(that|it|this|the recommended service|recommended|same|that one|this one)$/i.test(targetServiceName);

      // Check active draft state if serviceId was not passed explicitly or was anaphoric
      if ((!targetServiceId || isAnaphoricArg) && ctx.draftToken) {
        try {
          const draft = await getDraftFromToken(ctx.draftToken);
          if (draft?.serviceId) {
            targetServiceId = draft.serviceId;
          }
        } catch {
          // ignore draft load error
        }
      }

      if (!targetServiceId && targetServiceName && !isAnaphoricArg) {
        const found = resolveServiceFromText(targetServiceName, profile.data.services);
        if (found) {
          targetServiceId = found.id;
        }
      }

      // Fallback for general availability inquiry if no specific service requested (e.g. "Any openings tomorrow?", "Who is available Friday?")
      if (!targetServiceId && !targetServiceName && profile.data.services.length > 0) {
        targetServiceId = profile.data.services[0].id;
      }

      // Validate service ID exists in authoritative salon catalog and is active
      const resolvedService = targetServiceId
        ? profile.data.services.find(
            (s) =>
              s.id === targetServiceId &&
              (s as { isActive?: boolean }).isActive !== false &&
              (s as { isArchived?: boolean }).isArchived !== true
          )
        : undefined;

      if (!resolvedService) {
        return {
          available: false,
          availableSlotsCount: 0,
          error: "Please specify which treatment or service you would like to book so I can check availability for you.",
          slots: [],
          suggestedSlots: [],
        };
      }

      const serviceDisplayName = resolvedService.name;

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

      // Authoritative qualification verification (Universal fail-closed across all salons and specialists)
      const assignedStaffIds =
        resolvedService.assignedStaffIds ||
        (profile.data?.staff || [])
          .filter((st) =>
            ((st as unknown as { assignedServiceIds?: string[] }).assignedServiceIds || []).includes(
              resolvedService.id
            )
          )
          .map((st) => st.id);

      if (
        Array.isArray(resolvedService.assignedStaffIds) &&
        resolvedService.assignedStaffIds.length === 0
      ) {
        return {
          serviceId: resolvedService.id,
          serviceName: resolvedService.name,
          durationMinutes: resolvedService.durationMinutes,
          priceFormatted: formatCurrency(resolvedService.priceAmount, profile.data.currency),
          available: false,
          availableSlotsCount: 0,
          error: `${resolvedService.name} is currently not available for online booking as no specialists are assigned. (Setup warning: Salon owner must assign qualified staff to this service in dashboard).`,
          slots: [],
          suggestedSlots: [],
          isStaffConfigMissing: true,
        };
      }

      if (staffId) {
        const salon = profile.data!;
        const requestedStaffObj = salon.staff.find((s) => s.id === staffId);
        if (!requestedStaffObj) {
          return {
            available: false,
            availableSlotsCount: 0,
            serviceName: serviceDisplayName,
            error: "The requested specialist is not available at this salon.",
            slots: [],
            suggestedSlots: [],
          };
        }

        if (!assignedStaffIds.includes(staffId)) {
          const requestedStaffName =
            (requestedStaffObj as unknown as { displayName?: string; name?: string })?.displayName ||
            (requestedStaffObj as unknown as { displayName?: string; name?: string })?.name ||
            targetStaffName ||
            "The requested specialist";

          const staffSpecialties = salon.services
            .filter((s) => (s.assignedStaffIds || []).includes(staffId!))
            .map((s) => s.name);

          const qualifiedSpecialists = assignedStaffIds
            .map((id) => {
              const st = salon.staff.find((s) => s.id === id);
              return (
                (st as unknown as { displayName?: string; name?: string })?.displayName ||
                (st as unknown as { displayName?: string; name?: string })?.name ||
                null
              );
            })
            .filter((n): n is string => Boolean(n));

          const alternatives =
            qualifiedSpecialists.length > 0
              ? qualifiedSpecialists.join(" and ")
              : "another qualified specialist";

          const specialtyClause =
            staffSpecialties.length > 0
              ? `specializes in ${staffSpecialties.join(", ")} only and does not perform ${
                  resolvedService.name.toLowerCase().includes("haircut") ? "haircuts" : resolvedService.name
                }`
              : `is not qualified to perform ${resolvedService.name}`;

          return {
            available: false,
            availableSlotsCount: 0,
            serviceName: serviceDisplayName,
            staffName: requestedStaffName,
            error: `${requestedStaffName} ${specialtyClause}. For ${resolvedService.name}, our qualified specialists are ${alternatives}.`,
            qualifiedSpecialists,
          };
        }
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
              serviceId: resolvedService.id,
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
            serviceId: resolvedService.id,
            serviceName: resolvedService.name,
            durationMinutes: resolvedService.durationMinutes,
            priceFormatted: formatCurrency(resolvedService.priceAmount, profile.data.currency),
            available: false,
            error: `No slots available in the upcoming 7 days for ${resolvedService.name}.`,
            availableSlotsCount: 0,
            slots: [],
            suggestedSlots: [],
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

        const isSpecificStaffRequested = Boolean(
          staffId ||
          (targetStaffName && !/^(any|anyone|no preference|any staff|any specialist)$/i.test(targetStaffName))
        );
        const requestedStaffName = isSpecificStaffRequested && staffId ? staffMap.get(staffId) : targetStaffName || null;

        return {
          date: discoveredDate,
          serviceId: resolvedService.id,
          serviceName: resolvedService.name,
          durationMinutes: resolvedService.durationMinutes,
          priceFormatted: formatCurrency(resolvedService.priceAmount, profile.data.currency),
          available: true,
          availableSlotsCount: filtered.length,
          suggestedSlots: filtered.slice(0, 3).map((s) => {
            const time = s.localTime || s.startTimeLocal || "Available";
            // D21/D22B: omit staff names unless the customer explicitly requested a named specialist
            const slotStaffName = isSpecificStaffRequested
              ? (requestedStaffName || "Specialist")
              : null;
            return {
              time,
              period: s.period,
              ...(slotStaffName ? { staffName: slotStaffName } : {}),
            };
          }),
          staffPreference: isSpecificStaffRequested ? "specific" : "any",
          ...(isSpecificStaffRequested && requestedStaffName ? { staffName: requestedStaffName } : {}),
        };
      }

      // Explicit target date availability lookup
      const availRes = await getPublicAppointmentAvailability(
        {
          businessSlug: ctx.businessSlug,
          serviceId: resolvedService.id,
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
          serviceId: resolvedService.id,
          serviceName: resolvedService.name,
          durationMinutes: resolvedService.durationMinutes,
          priceFormatted: formatCurrency(resolvedService.priceAmount, profile.data.currency),
          available: false,
          error: availRes.error || `No slots available on ${targetDateStr} for ${resolvedService.name}.`,
          availableSlotsCount: 0,
          slots: [],
          suggestedSlots: [],
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

      if (finalSlots.length === 0) {
        const isStaffConfigMissing =
          !resolvedService.assignedStaffIds || resolvedService.assignedStaffIds.length === 0;

        return {
          date: targetDateStr,
          serviceId: resolvedService.id,
          serviceName: resolvedService.name,
          durationMinutes: resolvedService.durationMinutes,
          priceFormatted: formatCurrency(resolvedService.priceAmount, profile.data.currency),
          available: false,
          availableSlotsCount: 0,
          error: isStaffConfigMissing
            ? `${resolvedService.name} is currently not available for online booking as no specialists are assigned. (Setup warning: Salon owner must assign qualified staff to this service in dashboard).`
            : `There are currently no open appointment slots for ${resolvedService.name} on ${targetDateStr}.`,
          slots: [],
          suggestedSlots: [],
          isStaffConfigMissing,
        };
      }

      const isSpecificStaffRequested = Boolean(
        staffId ||
        (targetStaffName && !/^(any|anyone|no preference|any staff|any specialist)$/i.test(targetStaffName))
      );
      const requestedStaffName = isSpecificStaffRequested && staffId ? staffMap.get(staffId) : targetStaffName || null;

      // Offer top 3 slots for conversational clarity and mobile friendliness
      const slotLimit = 3;

      return {
        date: targetDateStr,
        serviceId: resolvedService.id,
        serviceName: resolvedService.name,
        durationMinutes: resolvedService.durationMinutes,
        priceFormatted: formatCurrency(resolvedService.priceAmount, profile.data.currency),
        available: true,
        availableSlotsCount: finalSlots.length,
        suggestedSlots: finalSlots.slice(0, slotLimit).map((s) => {
          const anySlot = s as unknown as {
            availableStaffIds?: string[];
            staffName?: string;
            localTime?: string;
            startTimeLocal?: string;
            period: string;
          };
          const time = anySlot.localTime || anySlot.startTimeLocal || "Available";
          // D21/D22B: omit staff names unless the customer explicitly requested a named specialist
          const slotStaffName = isSpecificStaffRequested
            ? (requestedStaffName || anySlot.staffName || "Specialist")
            : null;

          return {
            time,
            period: anySlot.period,
            ...(slotStaffName ? { staffName: slotStaffName } : {}),
          };
        }),
        staffPreference: isSpecificStaffRequested ? "specific" : "any",
        ...(isSpecificStaffRequested && requestedStaffName ? { staffName: requestedStaffName } : {}),
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

      const requestedServiceId =
        typeof rawArgs.serviceId === "string" ? rawArgs.serviceId.trim() : undefined;
      if (requestedServiceId) {
        const foundById = profile.data.services.find((s) => s.id === requestedServiceId);
        if (foundById) targetService = foundById;
      }

      const requestedServiceName =
        typeof rawArgs.serviceName === "string" ? rawArgs.serviceName.trim() : undefined;
      const isAnaphoricDraftArg =
        requestedServiceName &&
        /^(that|it|this|the recommended service|recommended|same|that one|this one)$/i.test(
          requestedServiceName
        );

      if (requestedServiceName && !isAnaphoricDraftArg && !requestedServiceId) {
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

            // Universal qualification guard: If requested staff is not qualified for targetService, fall back to "any"
            const assignedStaffIds =
              targetService?.assignedStaffIds ||
              (profile.data.staff || [])
                .filter((st) =>
                  ((st as unknown as { assignedServiceIds?: string[] }).assignedServiceIds || []).includes(
                    targetService?.id || ""
                  )
                )
                .map((st) => st.id);

            const isQualified =
              targetService
                ? assignedStaffIds.length > 0 && assignedStaffIds.includes(foundStaff.id)
                : true;

            if (!isQualified) {
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

      if (!staffName && staffPreference === "any") {
        staffName = "Any Specialist";
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
          suggestedSlots = slots.slice(0, 3).map((s) => {
            const slot: { time: string; period: string; staffName?: string } = {
              time: s.localTime || "Available",
              period: s.period,
            };
            // Only attach staffName when the customer explicitly requested a named specialist
            if (staffPreference === "specific" && staffName && staffName !== "Any Specialist") {
              slot.staffName = staffName;
            }
            return slot;
          });

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

