/**
 * BookPilot AI — Google Calendar Validation Schemas
 * Phase 1G-B: Zod schemas for OAuth callback, calendar selection, and sync controls
 */

import { z } from "zod";

export const googleOAuthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const updateCalendarSettingsSchema = z.object({
  calendarId: z.string().min(1, "Please select a destination Google Calendar."),
  calendarName: z.string().min(1).optional(),
  syncEnabled: z.boolean().default(true),
});

export const disconnectCalendarSchema = z.object({
  keepExistingEvents: z.boolean().default(true),
});

export const calendarSyncWorkerQuerySchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(50).default(10),
  leaseSeconds: z.coerce.number().int().min(30).max(600).default(300),
});

export const initialSyncSchema = z.object({
  daysAhead: z.coerce.number().int().min(1).max(90).default(30),
});
