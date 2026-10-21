import { z } from "zod";

export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const availabilityQuerySchema = z.object({
  businessId: z.string().uuid("Invalid business UUID").optional(),
  businessSlug: z
    .string()
    .min(2, "Business slug must be at least 2 characters")
    .max(64, "Business slug cannot exceed 64 characters")
    .optional(),
  serviceId: z.string().uuid("Invalid service UUID"),
  date: z
    .string()
    .regex(dateRegex, "Date must be in YYYY-MM-DD format")
    .refine((val) => {
      const parts = val.split("-").map(Number);
      if (parts.length !== 3) return false;
      const [y, m, d] = parts;
      if (y < 2000 || y > 2100) return false;
      if (m < 1 || m > 12) return false;
      if (d < 1 || d > 31) return false;
      const parsed = new Date(Date.UTC(y, m - 1, d));
      return (
        parsed.getUTCFullYear() === y &&
        parsed.getUTCMonth() === m - 1 &&
        parsed.getUTCDate() === d
      );
    }, "Date is not a valid calendar day"),
  staffId: z.string().uuid("Invalid staff UUID").nullable().optional(),
  staffPreference: z.enum(["specific", "any"]).default("any"),
  slotIntervalMinutes: z
    .number()
    .int()
    .min(5, "Slot interval must be at least 5 minutes")
    .max(60, "Slot interval cannot exceed 60 minutes")
    .default(15)
    .optional(),
});

export type AvailabilityQuerySchemaInput = z.infer<
  typeof availabilityQuerySchema
>;
