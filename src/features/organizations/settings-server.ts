"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import {
  businessProfileSchema,
  weeklyOpeningHoursSchema,
  bookingPolicySchema,
  scheduleExceptionSchema,
  type BusinessProfileInput,
  type OpeningHourIntervalInput,
  type BookingPolicyInput,
  type ScheduleExceptionInput,
} from "./validation";
import type {
  BusinessWithRole,
  OpeningHourInterval,
  ScheduleException,
  BookingPolicy,
  OnboardingProgress,
  FullBusinessConfig,
} from "./types";
import { revalidatePath } from "next/cache";
import { DEFAULT_OPENING_HOURS, DEFAULT_BOOKING_POLICY } from "./constants";

/**
 * Enforces server-side tenant role authorization.
 * Returns true only if caller is an authenticated owner of the specified business.
 */
async function verifyOwnerRole(businessId: string): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { authorized: false, error: "Unauthorized: Please log in." };

  const supabase = await createClient();
  if (!supabase) return { authorized: false, error: "Database client is not available." };

  const { data: member, error } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (error || !member || member.role !== "owner") {
    return {
      authorized: false,
      userId: user.id,
      error: "Forbidden: Only business owners are authorized to modify business settings and onboarding.",
    };
  }

  return { authorized: true, userId: user.id };
}

/**
 * Loads the full business configuration (Profile, Opening Hours, Exceptions, Policy, Onboarding).
 */
export async function getFullBusinessConfig(slug: string): Promise<FullBusinessConfig | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  // 1. Fetch business and check membership
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (bizError || !business) return null;

  const { data: member, error: memError } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (memError || !member) return null;

  const businessWithRole: BusinessWithRole = {
    ...business,
    role: member.role,
    country: business.country || "GB",
    timezone: business.timezone || "UTC",
  };

  // 2. Fetch opening hours
  const { data: hoursData } = await supabase
    .from("business_opening_hours")
    .select("*")
    .eq("business_id", business.id)
    .order("day_of_week", { ascending: true })
    .order("open_time", { ascending: true });

  const openingHours: OpeningHourInterval[] =
    hoursData && hoursData.length > 0
      ? hoursData.map((h) => ({
          id: h.id,
          business_id: h.business_id,
          day_of_week: h.day_of_week,
          is_closed: h.is_closed,
          open_time: h.open_time,
          close_time: h.close_time,
        }))
      : DEFAULT_OPENING_HOURS.map((h) => ({ ...h, business_id: business.id }));

  // 3. Fetch schedule exceptions
  const { data: exceptionsData } = await supabase
    .from("business_schedule_exceptions")
    .select("*")
    .eq("business_id", business.id)
    .order("exception_date", { ascending: true });

  const exceptions: ScheduleException[] = exceptionsData
    ? exceptionsData.map((e) => ({
        id: e.id,
        business_id: e.business_id,
        exception_date: e.exception_date,
        is_closed: e.is_closed,
        open_time: e.open_time,
        close_time: e.close_time,
        reason: e.reason,
      }))
    : [];

  // 4. Fetch booking policy
  const { data: policyData } = await supabase
    .from("business_booking_policies")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  const policy: BookingPolicy = policyData
    ? {
        id: policyData.id,
        business_id: policyData.business_id,
        min_notice_hours: policyData.min_notice_hours,
        max_advance_days: policyData.max_advance_days,
        cancellation_notice_hours: policyData.cancellation_notice_hours,
        default_buffer_minutes: policyData.default_buffer_minutes,
        online_booking_enabled: policyData.online_booking_enabled,
        cancellation_policy_text: policyData.cancellation_policy_text,
      }
    : { ...DEFAULT_BOOKING_POLICY, business_id: business.id };

  // 5. Fetch onboarding progress
  const { data: progressData } = await supabase
    .from("business_onboarding_progress")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  const onboarding: OnboardingProgress = progressData
    ? {
        id: progressData.id,
        business_id: progressData.business_id,
        current_step: progressData.current_step,
        completed_steps: progressData.completed_steps || [],
        is_completed: progressData.is_completed,
        completed_at: progressData.completed_at,
        updated_at: progressData.updated_at,
      }
    : {
        business_id: business.id,
        current_step: 1,
        completed_steps: [],
        is_completed: false,
      };

  return {
    business: businessWithRole,
    openingHours,
    exceptions,
    policy,
    onboarding,
  };
}

/**
 * Updates the business profile settings (Name, Category, Description, Address, Phone, Email, Timezone).
 * Preserves the immutable ID, Slug, and created_by.
 */
export async function updateBusinessProfile(
  businessId: string,
  input: BusinessProfileInput
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyOwnerRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const parsed = businessProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid business profile data" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  const { error } = await supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      business_type: parsed.data.business_type,
      description: parsed.data.description || null,
      logo_url: parsed.data.logo_url || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      website: parsed.data.website || null,
      address_line1: parsed.data.address_line1 || null,
      address_line2: parsed.data.address_line2 || null,
      city: parsed.data.city || null,
      state_region: parsed.data.state_region || null,
      postal_code: parsed.data.postal_code || null,
      country: parsed.data.country,
      timezone: parsed.data.timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Updates the weekly opening hours for a business.
 */
export async function updateOpeningHours(
  businessId: string,
  intervals: OpeningHourIntervalInput[]
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyOwnerRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const parsed = weeklyOpeningHoursSchema.safeParse(intervals);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid opening hours schedule." };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  // Delete existing and insert new in a transaction / sequence
  const { error: deleteError } = await supabase
    .from("business_opening_hours")
    .delete()
    .eq("business_id", businessId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const rowsToInsert = parsed.data.map((item) => ({
    business_id: businessId,
    day_of_week: item.day_of_week,
    is_closed: item.is_closed,
    open_time: item.is_closed ? null : item.open_time,
    close_time: item.is_closed ? null : item.close_time,
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("business_opening_hours")
    .insert(rowsToInsert);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Saves a date-specific schedule exception or holiday.
 */
export async function saveScheduleException(
  businessId: string,
  input: ScheduleExceptionInput
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyOwnerRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const parsed = scheduleExceptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid schedule exception." };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  // Check if an exception already exists for this date
  const { data: existing } = await supabase
    .from("business_schedule_exceptions")
    .select("id")
    .eq("business_id", businessId)
    .eq("exception_date", parsed.data.exception_date)
    .maybeSingle();

  if (existing && existing.id !== parsed.data.id) {
    return {
      success: false,
      error: `A schedule exception is already configured for ${parsed.data.exception_date}. Please edit or remove the existing entry.`,
    };
  }

  const row = {
    business_id: businessId,
    exception_date: parsed.data.exception_date,
    is_closed: parsed.data.is_closed,
    open_time: parsed.data.is_closed ? null : parsed.data.open_time || null,
    close_time: parsed.data.is_closed ? null : parsed.data.close_time || null,
    reason: parsed.data.reason || null,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("business_schedule_exceptions")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("business_id", businessId);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("business_schedule_exceptions").insert(row);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Deletes a date-specific schedule exception.
 */
export async function deleteScheduleException(
  businessId: string,
  exceptionId: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyOwnerRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  const { error } = await supabase
    .from("business_schedule_exceptions")
    .delete()
    .eq("id", exceptionId)
    .eq("business_id", businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Updates the booking policies.
 */
export async function updateBookingPolicies(
  businessId: string,
  input: BookingPolicyInput
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyOwnerRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const parsed = bookingPolicySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid booking policy values." };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  const { error } = await supabase
    .from("business_booking_policies")
    .upsert({
      business_id: businessId,
      min_notice_hours: parsed.data.min_notice_hours,
      max_advance_days: parsed.data.max_advance_days,
      cancellation_notice_hours: parsed.data.cancellation_notice_hours,
      default_buffer_minutes: parsed.data.default_buffer_minutes,
      online_booking_enabled: parsed.data.online_booking_enabled,
      cancellation_policy_text: parsed.data.cancellation_policy_text || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Updates onboarding wizard progress.
 */
export async function saveOnboardingStep(
  businessId: string,
  stepToSet: number,
  justCompletedStep?: number,
  markFinished?: boolean
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyOwnerRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  // Fetch current progress
  const { data: current } = await supabase
    .from("business_onboarding_progress")
    .select("completed_steps, is_completed")
    .eq("business_id", businessId)
    .maybeSingle();

  const currentSteps: number[] = current?.completed_steps || [];
  const updatedSteps = new Set<number>(currentSteps);
  if (justCompletedStep) {
    updatedSteps.add(justCompletedStep);
  }

  const isCompleted = markFinished ? true : current?.is_completed || false;

  const { error } = await supabase
    .from("business_onboarding_progress")
    .upsert({
      business_id: businessId,
      current_step: stepToSet,
      completed_steps: Array.from(updatedSteps).sort((a: number, b: number) => a - b),
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Uploads a business logo to Supabase Storage and updates the businesses table.
 */
export async function uploadBusinessLogo(
  businessId: string,
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const authCheck = await verifyOwnerRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const file = formData.get("logo") as File | null;
  if (!file) {
    return { success: false, error: "No logo file provided." };
  }

  // Validate MIME type
  const allowedMimes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedMimes.includes(file.type)) {
    return { success: false, error: "Only PNG, JPEG, or WebP image formats are supported." };
  }

  // Validate size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "Logo file size must not exceed 2MB." };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${businessId}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("business-logos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from("business-logos")
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  // Persist to business record
  await supabase
    .from("businesses")
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", businessId);

  revalidatePath("/dashboard", "layout");
  return { success: true, url: publicUrl };
}
