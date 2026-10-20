import { z } from "zod";
import type { AppointmentStatus } from "./types";

/**
 * Validates customer profile creation or updates.
 */
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(100, "Customer name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(5, "Phone number must be at least 5 digits")
    .max(30, "Phone number cannot exceed 30 digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .nullable(),
}).refine(
  (data) => {
    const hasEmail = Boolean(data.email && data.email.trim().length > 0);
    const hasPhone = Boolean(data.phone && data.phone.trim().length > 0);
    return hasEmail || hasPhone;
  },
  {
    message: "At least one contact method (email or phone) is required for customer bookings.",
    path: ["email"],
  }
);

export type CustomerInput = z.infer<typeof customerSchema>;

/**
 * Validates atomic appointment creation input.
 */
export const createAppointmentSchema = z.object({
  business_id: z.string().uuid("Invalid business workspace ID"),
  service_id: z.string().uuid("Invalid service ID"),
  staff_id: z.string().uuid("Invalid staff ID"),
  starts_at: z
    .string()
    .datetime({ offset: true, message: "Start time must be a valid ISO 8601 timestamp" }),
  customer_id: z.string().uuid("Invalid customer ID").optional(),
  customer_name: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(100)
    .optional(),
  customer_email: z
    .string()
    .trim()
    .email("Invalid customer email")
    .optional()
    .or(z.literal("")),
  customer_phone: z
    .string()
    .trim()
    .min(5, "Customer phone must be at least 5 characters")
    .max(30)
    .optional()
    .or(z.literal("")),
  notes: z.string().max(1000).optional(),
  idempotency_key: z.string().max(100).optional(),
}).refine(
  (data) => {
    // Either customer_id is provided, or customer_name + (email or phone) is provided
    if (data.customer_id) return true;
    const hasName = Boolean(data.customer_name && data.customer_name.trim().length >= 2);
    const hasContact = Boolean(
      (data.customer_email && data.customer_email.trim().length > 0) ||
      (data.customer_phone && data.customer_phone.trim().length > 0)
    );
    return hasName && hasContact;
  },
  {
    message: "Either an existing customer_id or new customer name with email/phone must be provided.",
    path: ["customer_id"],
  }
);

export type CreateAppointmentSchemaInput = z.infer<typeof createAppointmentSchema>;

/**
 * Validates atomic reschedule input.
 */
export const rescheduleAppointmentSchema = z.object({
  business_id: z.string().uuid("Invalid business workspace ID"),
  appointment_id: z.string().uuid("Invalid appointment ID"),
  new_starts_at: z
    .string()
    .datetime({ offset: true, message: "New start time must be a valid ISO 8601 timestamp" }),
  new_staff_id: z.string().uuid("Invalid staff ID").optional(),
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional(),
});

export type RescheduleAppointmentSchemaInput = z.infer<typeof rescheduleAppointmentSchema>;

/**
 * Validates atomic cancellation input.
 */
export const cancelAppointmentSchema = z.object({
  business_id: z.string().uuid("Invalid business workspace ID"),
  appointment_id: z.string().uuid("Invalid appointment ID"),
  reason: z.string().max(500, "Cancellation reason cannot exceed 500 characters").optional(),
});

export type CancelAppointmentSchemaInput = z.infer<typeof cancelAppointmentSchema>;

/**
 * Validates appointment status update.
 */
export const updateAppointmentStatusSchema = z.object({
  business_id: z.string().uuid("Invalid business workspace ID"),
  appointment_id: z.string().uuid("Invalid appointment ID"),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
  reason: z.string().max(500).optional(),
});

/**
 * Explicit state machine for appointment lifecycle transitions.
 * Terminal states (completed, cancelled, no_show) cannot transition back to active.
 */
const VALID_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [], // Terminal
  cancelled: [], // Terminal
  no_show: [], // Terminal
};

export function isValidStatusTransition(
  currentStatus: AppointmentStatus,
  targetStatus: AppointmentStatus
): boolean {
  if (currentStatus === targetStatus) return true; // Idempotent same-state
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}
