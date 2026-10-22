import { z } from "zod";

export const publicSalonSlugSchema = z
  .string()
  .min(3, "Salon slug must be at least 3 characters.")
  .max(60, "Salon slug cannot exceed 60 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid salon slug format.");

export const publicAvailabilityQuerySchema = z.object({
  businessSlug: publicSalonSlugSchema,
  serviceId: z.string().uuid("Invalid service ID format."),
  staffId: z.string().uuid("Invalid staff ID format.").optional().nullable(),
  staffPreference: z.enum(["any", "specific"]).default("any"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be formatted as YYYY-MM-DD."),
});

export type PublicAvailabilityQueryInput = z.infer<
  typeof publicAvailabilityQuerySchema
>;

export const publicBookingInputSchema = z
  .object({
    businessSlug: publicSalonSlugSchema,
    serviceId: z.string().uuid("Invalid service ID format."),
    staffId: z.string().uuid("Invalid staff ID format.").optional().nullable(),
    startsAt: z
      .string()
      .datetime({ message: "Appointment time must be a valid ISO 8601 UTC timestamp." }),
    customerName: z
      .string()
      .trim()
      .min(2, "Customer name must be at least 2 characters.")
      .max(100, "Customer name cannot exceed 100 characters."),
    customerEmail: z
      .string()
      .trim()
      .email("Please provide a valid email address.")
      .optional()
      .or(z.literal("")),
    customerPhone: z
      .string()
      .trim()
      .min(7, "Phone number must be at least 7 digits.")
      .max(20, "Phone number cannot exceed 20 characters.")
      .regex(/^[+0-9\s\-().]+$/, "Invalid phone number format.")
      .optional()
      .or(z.literal("")),
    customerNotes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters.")
      .optional()
      .or(z.literal("")),
    idempotencyKey: z
      .string()
      .trim()
      .max(128, "Idempotency key too long.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => Boolean(data.customerEmail) || Boolean(data.customerPhone),
    {
      message: "Please provide either an email address or a phone number for your confirmation.",
      path: ["customerEmail"],
    }
  );

export type PublicBookingValidatedInput = z.infer<
  typeof publicBookingInputSchema
>;

export const managementTokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/, "Invalid management link token format.");

export const cancelBookingSchema = z.object({
  token: managementTokenSchema,
  cancellationReason: z
    .string()
    .trim()
    .max(300, "Cancellation reason cannot exceed 300 characters.")
    .optional(),
});

export const rescheduleBookingSchema = z.object({
  token: managementTokenSchema,
  newStartsAt: z
    .string()
    .datetime({ message: "New appointment time must be a valid ISO 8601 UTC timestamp." }),
  newStaffId: z.string().uuid("Invalid staff ID format.").optional().nullable(),
});
