import { getPublicSalonProfile, getPublicAppointmentAvailability } from "@/features/public-booking/server";
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
      const currencySymbol =
        profile.data.currency === "GBP"
          ? "£"
          : profile.data.currency === "USD"
          ? "$"
          : `${profile.data.currency} `;

      return {
        currency: profile.data.currency,
        services: profile.data.services.map((svc) => ({
          id: svc.id,
          name: svc.name,
          durationMinutes: svc.durationMinutes,
          bufferMinutes: svc.bufferMinutes,
          priceFormatted: `${currencySymbol}${svc.priceAmount.toFixed(2)}`,
          priceAmount: svc.priceAmount,
          description: svc.description,
        })),
      };
    },
  },

  listStaff: {
    name: "listStaff",
    description: "List active specialists/staff members and their assigned services.",
    parameters: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "Optional service UUID to filter only staff who perform this service.",
        },
      },
    },
    execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
      const profile = await getPublicSalonProfile(ctx.businessSlug);
      if (!profile.success || !profile.data) {
        return { staff: [] };
      }
      const filterServiceId = typeof args.serviceId === "string" ? args.serviceId : undefined;
      const targetService = filterServiceId
        ? profile.data.services.find((s) => s.id === filterServiceId)
        : undefined;

      const filtered = profile.data.staff.filter((st) => {
        if (!targetService) return true;
        return targetService.assignedStaffIds.includes(st.id);
      });

      return {
        staff: filtered.map((st) => {
          const anySt = st as unknown as { displayName?: string; name?: string; role?: string };
          const name = anySt.displayName || anySt.name || "Specialist";
          const role = anySt.role || "Specialist";
          return {
            id: st.id,
            name,
            displayName: name,
            role,
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
      const targetServiceName = typeof rawArgs.serviceName === "string" ? rawArgs.serviceName.toLowerCase() : undefined;

      if (!targetServiceId && targetServiceName) {
        const found = profile.data.services.find(
          (s) => s.name.toLowerCase().includes(targetServiceName) || targetServiceName.includes(s.name.toLowerCase())
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
      const staffId = typeof rawArgs.staffId === "string" ? rawArgs.staffId : undefined;

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
      const activeSlots = availRes.data.slots;
      return {
        date: dateStr,
        serviceId: targetServiceId,
        serviceName: availRes.data.serviceName,
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
          const staffId = anySlot.availableStaffIds && anySlot.availableStaffIds[0];
          const staffName =
            anySlot.staffName || (staffId ? staffMap.get(staffId) : undefined) || "Any Specialist";
          const time = anySlot.localTime || anySlot.startTimeLocal || "Available";
          return {
            time,
            period: anySlot.period,
            staffName,
          };
        }),
      };
    },
  },
};
