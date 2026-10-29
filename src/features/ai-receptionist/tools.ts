import { getPublicSalonProfile, getPublicAppointmentAvailability } from "@/features/public-booking/server";
import { formatCurrency } from "@/features/services/types";
import {
  createDraft,
  updateDraft,
  getDraftFromToken,
} from "./booking/draft";
import { buildConfirmationCard } from "./booking/adapter";
import { resolveWallClockCandidate } from "@/features/availability/timezone";
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

      return {
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
    description: "Check live, conflict-free appointment availability for a specific service and date (YYYY-MM-DD).",
    parameters: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "Service UUID",
        },
        serviceName: {
          type: "string",
          description: "Optional service name to lookup if UUID is unknown",
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
          description: "Date in YYYY-MM-DD format (must be within allowed advance booking horizon)",
        },
      },
      required: ["date"],
    },
    execute: async (ctx: ToolExecutionContext, rawArgs: Record<string, unknown>) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { error: "Salon profile not available." };
      }

      // If serviceId not directly provided, attempt lookup by serviceName
      let targetServiceId = typeof rawArgs.serviceId === "string" ? rawArgs.serviceId : undefined;
      const targetServiceName = typeof rawArgs.serviceName === "string" ? rawArgs.serviceName.trim().toLowerCase() : undefined;

      if (!targetServiceId && targetServiceName) {
        const found = profile.data.services.find(
          (s) =>
            s.name.toLowerCase() === targetServiceName ||
            s.name.toLowerCase().includes(targetServiceName) ||
            targetServiceName.includes(s.name.toLowerCase())
        );
        if (found) {
          targetServiceId = found.id;
        }
      }

      // If still no serviceId, pick first active service as default
      if (!targetServiceId && profile.data.services.length > 0) {
        targetServiceId = profile.data.services[0].id;
      }

      if (!targetServiceId) {
        return { error: "No service found for availability check." };
      }

      const dateStr = typeof rawArgs.date === "string" ? rawArgs.date : new Date().toISOString().split("T")[0];
      let staffId = typeof rawArgs.staffId === "string" ? rawArgs.staffId : undefined;
      const targetStaffName = typeof rawArgs.staffName === "string" ? rawArgs.staffName.trim().toLowerCase() : undefined;

      if (!staffId && targetStaffName) {
        const foundStaff = profile.data.staff.find((st) => {
          const anySt = st as unknown as { displayName?: string; name?: string };
          const name = (anySt.displayName || anySt.name || "").toLowerCase();
          return name.includes(targetStaffName) || targetStaffName.includes(name);
        });
        if (foundStaff) {
          staffId = foundStaff.id;
        }
      }

      const availRes = await getPublicAppointmentAvailability(
        {
          businessSlug: ctx.businessSlug,
          serviceId: targetServiceId,
          staffId,
          staffPreference: staffId ? "specific" : "any",
          date: dateStr,
        },
        undefined,
        { skipRateLimit: true }
      );

      if (!availRes.success || !availRes.data) {
        return {
          date: dateStr,
          available: false,
          error: availRes.error || "No slots available or outside booking horizon.",
          availableSlotsCount: 0,
          slots: [],
        };
      }

      const staffMap = new Map(
        profile.data.staff.map((st) => {
          const anySt = st as unknown as { displayName?: string; name?: string };
          return [st.id, anySt.displayName || anySt.name || "Specialist"];
        })
      );
      const activeSlots = (availRes.data.slots || []).filter((s: unknown) => {
        const anyS = s as { isAvailable?: boolean };
        return anyS.isAvailable !== false;
      });

      const resolvedService = profile.data.services.find((s) => s.id === targetServiceId);
      const serviceDisplayName = availRes.data.serviceName || resolvedService?.name || "appointments";

      return {
        date: dateStr,
        serviceId: targetServiceId,
        serviceName: serviceDisplayName,
        available: activeSlots.length > 0,
        availableSlotsCount: activeSlots.length,
        suggestedSlots: activeSlots.slice(0, 8).map((s) => {
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
      "Create or update an in-progress conversational booking draft and generate the interactive confirmation review card. Call this when the customer provides their requested service, specialist, date, time, or contact details (name and phone). Verifies real availability against the authoritative booking engine before generating the review card.",
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
          description: "Target appointment date in YYYY-MM-DD format (e.g. '2026-10-27').",
        },
        time: {
          type: "string",
          description: "Target appointment time in HH:MM format (24-hour, e.g. '14:00').",
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
        typeof rawArgs.serviceName === "string" ? rawArgs.serviceName.trim().toLowerCase() : undefined;
      if (requestedServiceName) {
        const found = profile.data.services.find(
          (s) =>
            s.id.toLowerCase() === requestedServiceName ||
            s.name.toLowerCase() === requestedServiceName ||
            s.name.toLowerCase().includes(requestedServiceName) ||
            requestedServiceName.includes(s.name.toLowerCase())
        );
        if (found) {
          targetService = found;
        }
      }

      // 3. Resolve Staff
      let staffId = currentDraft.staffId;
      let staffName = currentDraft.staffName;
      let staffPreference: "any" | "specific" = currentDraft.staffPreference || "any";

      const requestedStaffName =
        typeof rawArgs.staffName === "string" ? rawArgs.staffName.trim().toLowerCase() : undefined;
      if (requestedStaffName) {
        if (
          requestedStaffName === "any" ||
          requestedStaffName === "anyone" ||
          requestedStaffName === "no preference"
        ) {
          staffId = undefined;
          staffName = "Any Specialist";
          staffPreference = "any";
        } else {
          const foundStaff = profile.data.staff.find((st) => {
            const anySt = st as unknown as { displayName?: string; name?: string };
            const name = (anySt.displayName || anySt.name || "").toLowerCase();
            return (
              st.id.toLowerCase() === requestedStaffName ||
              name.includes(requestedStaffName) ||
              requestedStaffName.includes(name)
            );
          });
          if (foundStaff) {
            const anySt = foundStaff as unknown as { displayName?: string; name?: string };
            staffId = foundStaff.id;
            staffName = anySt.displayName || anySt.name || "Specialist";
            staffPreference = "specific";
          }
        }
      }

      // 4. Resolve Date and Time
      const dateStr =
        typeof rawArgs.date === "string" && rawArgs.date.trim() !== ""
          ? rawArgs.date.trim()
          : currentDraft.slotDate;
      const timeStr =
        typeof rawArgs.time === "string" && rawArgs.time.trim() !== ""
          ? rawArgs.time.trim().substring(0, 5)
          : currentDraft.slotStartTime;

      // 5. Customer Details (Defect R-003: protect against conversational corruption)
      const nonNameWords =
        /\b(actually|instead|change|reschedule|switch|move|rather|shift|can i|could i|can we|wese|badal|tabdeel|baje|please|pm|am|tomorrow|today|appointment|service|haircut)\b/i;
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
          suggestedSlots = slots.slice(0, 8).map((s) => ({
            time: s.localTime || "Available",
            period: s.period,
            staffName: staffName || "Available Specialist",
          }));

          if (timeStr) {
            const matchingSlot = slots.find((s) => s.localTime === timeStr);
            if (!matchingSlot) {
              isSlotAvailable = false;
            } else {
              // Ensure canonicalStartsAtUtc ends with 'Z'
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

      return {
        success: true,
        readyForConfirmation: isComplete,
        stage: targetStage,
        draft: updatedDraft,
        draftToken: updatedDraftToken,
        card,
        serviceName: targetService?.name,
        staffName: staffName || "Any Specialist",
        date: dateStr,
        time: timeStr,
        priceFormatted,
        durationMinutes: targetService?.durationMinutes,
        customerName,
        customerPhone,
        missingFields,
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

