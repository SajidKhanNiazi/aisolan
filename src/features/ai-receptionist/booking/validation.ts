import { z } from "zod";
import { publicSalonSlugSchema } from "@/features/public-booking/validation";

export const conversationalChannelSchema = z.enum([
  "hosted_web",
  "embedded_web",
  "whatsapp",
]);

export const bookingDraftStageSchema = z.enum([
  "idle",
  "collecting_service",
  "collecting_staff_preference",
  "collecting_datetime",
  "checking_availability",
  "collecting_customer_details",
  "awaiting_confirmation",
  "confirming",
  "confirmed",
  "slot_unavailable",
  "cancelled_draft",
  "failed",
]);

export const customerDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),
  phone: z
    .string()
    .trim()
    .min(7, "Please provide a valid phone number (at least 7 digits).")
    .max(25, "Phone number cannot exceed 25 characters.")
    .regex(/^[+\d\s().-]+$/, "Phone contains invalid characters."),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(255)
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters.")
    .optional()
    .or(z.literal("")),
});

export const bookingConfirmationRequestSchema = z.object({
  businessSlug: publicSalonSlugSchema,
  draftId: z.string().uuid("Invalid draft identifier."),
  draftToken: z.string().min(10, "Invalid draft authorization token."),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Idempotency key required.")
    .max(128, "Idempotency key too long."),
  customerNotes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters.")
    .optional(),
});

export type BookingConfirmationRequestInput = z.infer<
  typeof bookingConfirmationRequestSchema
>;
