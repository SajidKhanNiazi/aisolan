"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  businessNotificationSettingsSchema,
  type BusinessNotificationSettingsInput,
} from "./validation";
import type {
  BusinessNotificationSettings,
  NotificationHistoryItem,
} from "./types";

export interface SettingsActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Verifies that the authenticated user is an authorized member (owner, manager, or staff) of the business.
 */
async function verifyBusinessMember(
  businessId: string
): Promise<{ authorized: boolean; userId?: string; role?: string; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { authorized: false, error: "Unauthorized: Please log in." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { authorized: false, error: "Database client unavailable." };
  }

  const { data: member, error } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (error || !member) {
    return {
      authorized: false,
      userId: user.id,
      error: "Forbidden: You are not an authorized member of this business.",
    };
  }

  return { authorized: true, userId: user.id, role: member.role };
}

/**
 * Loads notification preferences for a specific salon business.
 * Tenant-scoped and returns safe defaults if the row does not yet exist.
 */
export async function getBusinessNotificationSettings(
  businessId: string
): Promise<SettingsActionResult<BusinessNotificationSettings>> {
  const authCheck = await verifyBusinessMember(businessId);
  if (!authCheck.authorized) {
    return {
      success: false,
      error: authCheck.error,
      code: "FORBIDDEN",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      error: "Database client unavailable.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  const { data, error } = await supabase
    .from("business_notification_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error("[getBusinessNotificationSettings] DB error:", error);
    return {
      success: false,
      error: "Unable to load notification settings.",
      code: "DB_ERROR",
    };
  }

  // Safe defaults if row not yet inserted
  const settings: BusinessNotificationSettings = data || {
    business_id: businessId,
    notify_on_new_booking: true,
    notify_on_reschedule: true,
    notify_on_cancellation: true,
  };

  return {
    success: true,
    data: settings,
  };
}

/**
 * Updates notification preferences for a salon business.
 * Only owners and managers are authorized to update notification preferences.
 */
export async function updateBusinessNotificationSettings(
  input: BusinessNotificationSettingsInput,
  businessSlug?: string
): Promise<SettingsActionResult<BusinessNotificationSettings>> {
  const parsed = businessNotificationSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid settings input.",
      code: "VALIDATION_ERROR",
    };
  }

  const authCheck = await verifyBusinessMember(parsed.data.business_id);
  if (!authCheck.authorized) {
    return {
      success: false,
      error: authCheck.error,
      code: "FORBIDDEN",
    };
  }

  if (authCheck.role !== "owner" && authCheck.role !== "manager") {
    return {
      success: false,
      error: "Forbidden: Only salon owners or managers may update notification settings.",
      code: "FORBIDDEN",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      error: "Database client unavailable.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  const { data, error } = await supabase
    .from("business_notification_settings")
    .upsert(
      {
        business_id: parsed.data.business_id,
        notify_on_new_booking: parsed.data.notify_on_new_booking,
        notify_on_reschedule: parsed.data.notify_on_reschedule,
        notify_on_cancellation: parsed.data.notify_on_cancellation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[updateBusinessNotificationSettings] DB error:", error);
    return {
      success: false,
      error: "Failed to save notification settings.",
      code: "DB_ERROR",
    };
  }

  if (businessSlug) {
    revalidatePath(`/dashboard/${businessSlug}/settings`);
  }

  return {
    success: true,
    data,
  };
}

/**
 * Fetches recent notification delivery history for the salon dashboard view.
 * Strictly scoped to the authenticated tenant business.
 */
export async function getBusinessNotificationHistory(
  businessId: string,
  limit = 20
): Promise<SettingsActionResult<NotificationHistoryItem[]>> {
  const authCheck = await verifyBusinessMember(businessId);
  if (!authCheck.authorized) {
    return {
      success: false,
      error: authCheck.error,
      code: "FORBIDDEN",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      error: "Database client unavailable.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));

  const { data, error } = await supabase
    .from("notification_outbox")
    .select(
      "id, business_id, appointment_id, customer_id, event_type, recipient_type, recipient_email, recipient_name, template_key, status, attempt_count, max_attempts, next_attempt_at, provider_message_id, last_error_code, last_error_message, dedupe_key, sent_at, created_at, updated_at"
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("[getBusinessNotificationHistory] DB error:", error);
    return {
      success: false,
      error: "Unable to load notification delivery history.",
      code: "DB_ERROR",
    };
  }

  return {
    success: true,
    data: (data || []) as NotificationHistoryItem[],
  };
}
