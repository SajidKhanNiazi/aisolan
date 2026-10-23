/**
 * BookPilot AI — Google Calendar Server Actions & Queries
 * Phase 1G-B: Server-Side Connection Management, Settings Updates, and Manual Sync
 */

"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "./encryption";
import { refreshAccessToken } from "./oauth";
import { listUserCalendars } from "./client";
import { processCalendarSyncBatch } from "./worker";
import {
  updateCalendarSettingsSchema,
  initialSyncSchema,
} from "./validation";
import type {
  GoogleCalendarConnection,
  GoogleCalendarListItem,
} from "./types";

interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Helper to authenticate user and verify business manager/owner authorization.
 */
async function authorizeBusinessAdmin(businessSlug: string) {
  const supabase = await createClient();
  if (!supabase) return { authorized: false, error: "Database client unavailable." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "Unauthenticated. Please log in." };
  }

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, name, slug, timezone")
    .eq("slug", businessSlug)
    .single();

  if (bizError || !business) {
    return { authorized: false, error: "Salon workspace not found." };
  }

  // Verify membership & role
  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (!member || (member.role !== "owner" && member.role !== "manager")) {
    return {
      authorized: false,
      error: "Unauthorized: Only salon owners and managers can configure Google Calendar integration.",
    };
  }

  return {
    authorized: true,
    user,
    business,
    role: member.role,
  };
}

/**
 * Retrieves the Google Calendar connection metadata for a salon.
 * Never retrieves or returns the encrypted refresh token.
 */
export async function getGoogleCalendarConnection(
  businessSlug: string
): Promise<ServerActionResponse<GoogleCalendarConnection | null>> {
  const auth = await authorizeBusinessAdmin(businessSlug);
  if (!auth.authorized || !auth.business) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Database client unavailable." };
  }

  const { data, error } = await supabase
    .from("business_calendar_connections")
    .select(
      "id, business_id, user_id, google_account_email, google_calendar_id, google_calendar_name, status, sync_enabled, last_successful_sync_at, last_error_code, last_error_message, created_at, updated_at"
    )
    .eq("business_id", auth.business.id)
    .maybeSingle();

  if (error) {
    console.error("[getGoogleCalendarConnection] Query error:", error.message);
    return { success: false, error: "Failed to retrieve calendar connection status." };
  }

  return { success: true, data: (data as GoogleCalendarConnection) || null };
}

/**
 * Fetches the user's accessible Google calendars to populate the destination selector dropdown.
 */
export async function listAvailableGoogleCalendars(
  businessSlug: string
): Promise<ServerActionResponse<GoogleCalendarListItem[]>> {
  const auth = await authorizeBusinessAdmin(businessSlug);
  if (!auth.authorized || !auth.business) {
    return { success: false, error: auth.error };
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return { success: false, error: "Service client unavailable." };
  }

  const { data: connection } = await serviceClient
    .from("business_calendar_connections")
    .select("id, encrypted_refresh_token, status")
    .eq("business_id", auth.business.id)
    .maybeSingle();

  if (!connection) {
    return { success: false, error: "Google Calendar is not connected." };
  }

  if (connection.status === "needs_reconnect") {
    return {
      success: false,
      code: "NEEDS_RECONNECT",
      error: "Google authorization has expired. Please reconnect your Google account.",
    };
  }

  try {
    const refreshToken = decryptToken(connection.encrypted_refresh_token);
    const refreshRes = await refreshAccessToken(refreshToken);

    if (!refreshRes.success || !refreshRes.accessToken) {
      if (refreshRes.isRevoked) {
        await serviceClient
          .from("business_calendar_connections")
          .update({ status: "needs_reconnect", last_error_code: "AUTH_REVOKED" })
          .eq("id", connection.id);

        return {
          success: false,
          code: "NEEDS_RECONNECT",
          error: "Google account authorization was revoked. Please reconnect.",
        };
      }
      return { success: false, error: refreshRes.error || "Failed to obtain Google access token." };
    }

    const calendarsRes = await listUserCalendars(refreshRes.accessToken);
    if (!calendarsRes.success || !calendarsRes.data) {
      return { success: false, error: calendarsRes.error || "Failed to list Google Calendars." };
    }

    return { success: true, data: calendarsRes.data };
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, error: e.message || "Failed to communicate with Google Calendar." };
  }
}

/**
 * Updates the destination Google Calendar ID and sync toggle.
 */
export async function updateGoogleCalendarSettings(
  businessSlug: string,
  input: { calendarId: string; calendarName?: string; syncEnabled: boolean }
): Promise<ServerActionResponse> {
  const auth = await authorizeBusinessAdmin(businessSlug);
  if (!auth.authorized || !auth.business) {
    return { success: false, error: auth.error };
  }

  const parsed = updateCalendarSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid calendar settings." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Database client unavailable." };
  }

  const { error } = await supabase
    .from("business_calendar_connections")
    .update({
      google_calendar_id: parsed.data.calendarId,
      google_calendar_name: parsed.data.calendarName || "Selected Calendar",
      sync_enabled: parsed.data.syncEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", auth.business.id);

  if (error) {
    return { success: false, error: "Failed to update calendar settings." };
  }

  return { success: true };
}

/**
 * Disconnects the Google Calendar integration for the salon.
 */
export async function disconnectGoogleCalendar(
  businessSlug: string
): Promise<ServerActionResponse> {
  const auth = await authorizeBusinessAdmin(businessSlug);
  if (!auth.authorized || !auth.business) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Database client unavailable." };
  }

  const { error } = await supabase
    .from("business_calendar_connections")
    .delete()
    .eq("business_id", auth.business.id);

  if (error) {
    return { success: false, error: "Failed to disconnect Google Calendar." };
  }

  return { success: true };
}

/**
 * Triggers an initial or historical synchronization of upcoming confirmed appointments.
 */
export async function initialSyncFutureAppointments(
  businessSlug: string,
  daysAhead = 30
): Promise<ServerActionResponse<{ enqueuedCount: number }>> {
  const auth = await authorizeBusinessAdmin(businessSlug);
  if (!auth.authorized || !auth.business) {
    return { success: false, error: auth.error };
  }

  const parsed = initialSyncSchema.safeParse({ daysAhead });
  const validDays = parsed.success ? parsed.data.daysAhead : 30;

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return { success: false, error: "Service client unavailable." };
  }

  // Verify connection is active
  const { data: connection } = await serviceClient
    .from("business_calendar_connections")
    .select("id, status, sync_enabled")
    .eq("business_id", auth.business.id)
    .maybeSingle();

  if (!connection || connection.status !== "active" || !connection.sync_enabled) {
    return { success: false, error: "Google Calendar connection is not active or sync is disabled." };
  }

  const nowIso = new Date().toISOString();
  const futureIso = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();

  // Find upcoming confirmed appointments
  const { data: appts, error: apptError } = await serviceClient
    .from("appointments")
    .select(`
      id,
      business_id,
      customer_id,
      staff_id,
      status,
      starts_at,
      service_ends_at,
      service_name_snapshot,
      customer_name_snapshot,
      timezone_snapshot,
      updated_at
    `)
    .eq("business_id", auth.business.id)
    .eq("status", "confirmed")
    .gte("starts_at", nowIso)
    .lte("starts_at", futureIso)
    .order("starts_at", { ascending: true });

  if (apptError || !appts) {
    return { success: false, error: "Failed to retrieve future appointments." };
  }

  let enqueued = 0;

  for (const appt of appts) {
    const dedupeKey = `${appt.id}:create`;
    const syncVersion = new Date(appt.updated_at || Date.now()).toISOString();

    const payload = {
      business_name: auth.business.name,
      business_slug: auth.business.slug,
      business_timezone: appt.timezone_snapshot || auth.business.timezone || "Europe/London",
      customer_name: appt.customer_name_snapshot || "Customer",
      customer_email: null,
      customer_phone: null,
      service_name: appt.service_name_snapshot || "Appointment",
      staff_name: "Assigned Specialist",
      starts_at: appt.starts_at,
      service_ends_at: appt.service_ends_at,
      status: appt.status,
      booking_reference: appt.id.substring(0, 8).toUpperCase(),
    };

    const { error: insertErr } = await serviceClient
      .from("calendar_sync_outbox")
      .insert({
        business_id: auth.business.id,
        appointment_id: appt.id,
        action: "create",
        connection_id: connection.id,
        source_version: syncVersion,
        payload,
        dedupe_key: dedupeKey,
      });

    if (!insertErr) enqueued++;
  }

  // Non-blocking background worker dispatch
  try {
    after(async () => {
      await processCalendarSyncBatch({ batchSize: 25 });
    });
  } catch {
    // Non-blocking
  }

  return { success: true, data: { enqueuedCount: enqueued } };
}

/**
 * Triggers an immediate manual queue flush (Sync Now).
 */
export async function triggerImmediateCalendarSync(
  businessSlug: string
): Promise<ServerActionResponse<{ processed: number; succeeded: number }>> {
  const auth = await authorizeBusinessAdmin(businessSlug);
  if (!auth.authorized || !auth.business) {
    return { success: false, error: auth.error };
  }

  try {
    const outcome = await processCalendarSyncBatch({ batchSize: 20 });
    return {
      success: true,
      data: {
        processed: outcome.processed,
        succeeded: outcome.succeeded,
      },
    };
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, error: e.message || "Manual sync failed." };
  }
}
