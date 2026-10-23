/**
 * BookPilot AI — Notification Settings & Worker Input Validation
 * Phase 1G-A: Production-Ready Email Notifications
 */

import { z } from "zod";

export const businessNotificationSettingsSchema = z.object({
  business_id: z.string().uuid("Invalid business identifier."),
  notify_on_new_booking: z.boolean().default(true),
  notify_on_reschedule: z.boolean().default(true),
  notify_on_cancellation: z.boolean().default(true),
});

export type BusinessNotificationSettingsInput = z.infer<
  typeof businessNotificationSettingsSchema
>;

export const notificationWorkerQuerySchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(50).default(10),
  leaseSeconds: z.coerce.number().int().min(10).max(1800).default(300),
});

export type NotificationWorkerQueryInput = z.infer<
  typeof notificationWorkerQuerySchema
>;
