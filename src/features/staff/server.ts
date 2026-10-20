"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  staffProfileSchema,
  staffWeeklyScheduleSchema,
  staffBreakSchema,
  staffTimeOffSchema,
  type StaffProfileInput,
  type StaffWorkingHourIntervalInput,
  type StaffBreakInput,
  type StaffTimeOffInput,
} from "./validation";
import type {
  StaffWithServices,
  StaffWorkingHourInterval,
  StaffBreak,
  StaffTimeOff,
  StaffProfile,
} from "./types";

/**
 * Enforces server-side tenant owner/manager role authorization.
 */
async function verifyManagerOrOwnerRole(
  businessId: string
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
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

  if (error || !member || (member.role !== "owner" && member.role !== "manager")) {
    return {
      authorized: false,
      userId: user.id,
      error: "Forbidden: Only business owners and managers can modify staff and schedules.",
    };
  }

  return { authorized: true, userId: user.id };
}

/**
 * Fetches all staff members and their assigned services for an authenticated workspace.
 */
export async function getBusinessStaff(slug: string): Promise<{
  staff: StaffWithServices[];
  businessId: string | null;
}> {
  const user = await getAuthenticatedUser();
  if (!user) return { staff: [], businessId: null };

  const supabase = await createClient();
  if (!supabase) return { staff: [], businessId: null };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) return { staff: [], businessId: null };

  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (!member) return { staff: [], businessId: null };

  // Fetch active, non-archived staff
  const { data: staffData } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_archived", false)
    .order("display_order", { ascending: true })
    .order("display_name", { ascending: true });

  // Fetch staff services
  const { data: staffServicesData } = await supabase
    .from("staff_services")
    .select("staff_id, service_id")
    .eq("business_id", business.id);

  const staffServiceMap = new Map<string, string[]>();
  if (staffServicesData) {
    for (const row of staffServicesData) {
      const list = staffServiceMap.get(row.staff_id) || [];
      list.push(row.service_id);
      staffServiceMap.set(row.staff_id, list);
    }
  }

  const staff: StaffWithServices[] = (staffData || []).map((s) => {
    const assigned = staffServiceMap.get(s.id) || [];
    return {
      ...s,
      service_ids: assigned,
      assigned_services_count: assigned.length,
    };
  });

  return { staff, businessId: business.id };
}

/**
 * Fetches full details for a single staff member: profile, assignments, schedule, breaks, and time off.
 */
export async function getStaffDetail(
  slug: string,
  staffId: string
): Promise<{
  staff: StaffWithServices | null;
  workingHours: StaffWorkingHourInterval[];
  breaks: StaffBreak[];
  timeOff: StaffTimeOff[];
  businessOpeningHours: { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }[];
  businessId: string | null;
  timezone: string;
} | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone")
    .eq("slug", slug)
    .single();

  if (!business) return null;

  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (!member) return null;

  // 1. Fetch staff profile
  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("id", staffId)
    .eq("business_id", business.id)
    .single();

  if (!profile) return null;

  // 2. Fetch assigned services
  const { data: assignedServices } = await supabase
    .from("staff_services")
    .select("service_id")
    .eq("staff_id", staffId)
    .eq("business_id", business.id);

  const serviceIds = (assignedServices || []).map((r) => r.service_id);

  // 3. Fetch working hours
  const { data: hoursData } = await supabase
    .from("staff_working_hours")
    .select("*")
    .eq("staff_id", staffId)
    .eq("business_id", business.id)
    .order("day_of_week", { ascending: true })
    .order("open_time", { ascending: true });

  // 4. Fetch breaks
  const { data: breaksData } = await supabase
    .from("staff_breaks")
    .select("*")
    .eq("staff_id", staffId)
    .eq("business_id", business.id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  // 5. Fetch time off
  const { data: timeOffData } = await supabase
    .from("staff_time_off")
    .select("*")
    .eq("staff_id", staffId)
    .eq("business_id", business.id)
    .order("start_date", { ascending: true });

  // 6. Fetch business opening hours for boundary comparison
  const { data: bizHours } = await supabase
    .from("business_opening_hours")
    .select("day_of_week, is_closed, open_time, close_time")
    .eq("business_id", business.id)
    .order("day_of_week", { ascending: true });

  return {
    staff: {
      ...profile,
      service_ids: serviceIds,
      assigned_services_count: serviceIds.length,
    },
    workingHours: hoursData || [],
    breaks: breaksData || [],
    timeOff: timeOffData || [],
    businessOpeningHours: bizHours || [],
    businessId: business.id,
    timezone: business.timezone || "UTC",
  };
}

/**
 * Creates a new staff profile.
 */
export async function createStaffProfile(
  businessId: string,
  input: StaffProfileInput,
  slug: string
): Promise<{ success: boolean; staff?: StaffProfile; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = staffProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid staff profile" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("staff_profiles")
    .insert({
      business_id: businessId,
      display_name: parsed.data.display_name,
      professional_title: parsed.data.professional_title || null,
      bio: parsed.data.bio || null,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      is_active: parsed.data.is_active,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff`);
  return { success: true, staff: data };
}

/**
 * Updates an existing staff profile.
 */
export async function updateStaffProfile(
  businessId: string,
  staffId: string,
  input: StaffProfileInput,
  slug: string
): Promise<{ success: boolean; staff?: StaffProfile; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = staffProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid staff profile" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("staff_profiles")
    .update({
      display_name: parsed.data.display_name,
      professional_title: parsed.data.professional_title || null,
      bio: parsed.data.bio || null,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      is_active: parsed.data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff`);
  revalidatePath(`/dashboard/${slug}/staff/${staffId}/schedule`);
  return { success: true, staff: data };
}

/**
 * Safely soft-deletes (archives) a staff profile without deleting historic data.
 */
export async function archiveStaffProfile(
  businessId: string,
  staffId: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase
    .from("staff_profiles")
    .update({
      is_archived: true,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .eq("business_id", businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff`);
  return { success: true };
}

/**
 * Toggles a staff member's active status.
 */
export async function toggleStaffStatus(
  businessId: string,
  staffId: string,
  isActive: boolean,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase
    .from("staff_profiles")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId)
    .eq("business_id", businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff`);
  return { success: true };
}

/**
 * Updates service assignments for a staff member.
 * Database foreign keys strictly enforce that all services and the staff member belong to the SAME business_id.
 */
export async function updateStaffServiceAssignments(
  businessId: string,
  staffId: string,
  serviceIds: string[],
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  // 1. Delete existing assignments for this staff in this business
  const { error: delError } = await supabase
    .from("staff_services")
    .delete()
    .eq("staff_id", staffId)
    .eq("business_id", businessId);

  if (delError) return { success: false, error: delError.message };

  // 2. Insert new assignments
  if (serviceIds.length > 0) {
    const rows = serviceIds.map((serviceId) => ({
      business_id: businessId,
      staff_id: staffId,
      service_id: serviceId,
    }));

    const { error: insError } = await supabase.from("staff_services").insert(rows);
    if (insError) return { success: false, error: insError.message };
  }

  revalidatePath(`/dashboard/${slug}/staff`);
  revalidatePath(`/dashboard/${slug}/services`);
  return { success: true };
}

/**
 * Updates a staff member's weekly recurring shift schedule.
 */
export async function updateStaffWeeklySchedule(
  businessId: string,
  staffId: string,
  intervals: StaffWorkingHourIntervalInput[],
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = staffWeeklyScheduleSchema.safeParse(intervals);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid schedule intervals" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  // 1. Clear existing schedule
  const { error: delError } = await supabase
    .from("staff_working_hours")
    .delete()
    .eq("staff_id", staffId)
    .eq("business_id", businessId);

  if (delError) return { success: false, error: delError.message };

  // 2. Insert active working intervals
  if (parsed.data.length > 0) {
    const rows = parsed.data.map((inv) => ({
      business_id: businessId,
      staff_id: staffId,
      day_of_week: inv.day_of_week,
      is_working: inv.is_working,
      open_time: inv.is_working ? inv.open_time : null,
      close_time: inv.is_working ? inv.close_time : null,
    }));

    const { error: insError } = await supabase.from("staff_working_hours").insert(rows);
    if (insError) return { success: false, error: insError.message };
  }

  revalidatePath(`/dashboard/${slug}/staff/${staffId}/schedule`);
  return { success: true };
}

/**
 * Adds a recurring break for a staff member.
 */
export async function addStaffBreak(
  businessId: string,
  staffId: string,
  input: StaffBreakInput,
  slug: string
): Promise<{ success: boolean; breakItem?: StaffBreak; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = staffBreakSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid break data" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("staff_breaks")
    .insert({
      business_id: businessId,
      staff_id: staffId,
      day_of_week: parsed.data.day_of_week,
      break_title: parsed.data.break_title,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff/${staffId}/schedule`);
  return { success: true, breakItem: data };
}

/**
 * Deletes a staff break.
 */
export async function deleteStaffBreak(
  businessId: string,
  staffId: string,
  breakId: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase
    .from("staff_breaks")
    .delete()
    .eq("id", breakId)
    .eq("staff_id", staffId)
    .eq("business_id", businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff/${staffId}/schedule`);
  return { success: true };
}

/**
 * Adds a staff time-off period (vacation, sick leave, unavailable).
 */
export async function addStaffTimeOff(
  businessId: string,
  staffId: string,
  input: StaffTimeOffInput,
  slug: string
): Promise<{ success: boolean; timeOff?: StaffTimeOff; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = staffTimeOffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid time off data" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("staff_time_off")
    .insert({
      business_id: businessId,
      staff_id: staffId,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      is_full_day: parsed.data.is_full_day,
      start_time: parsed.data.is_full_day ? null : parsed.data.start_time,
      end_time: parsed.data.is_full_day ? null : parsed.data.end_time,
      reason_type: parsed.data.reason_type,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff/${staffId}/time-off`);
  return { success: true, timeOff: data };
}

/**
 * Deletes a staff time-off entry.
 */
export async function deleteStaffTimeOff(
  businessId: string,
  staffId: string,
  timeOffId: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase
    .from("staff_time_off")
    .delete()
    .eq("id", timeOffId)
    .eq("staff_id", staffId)
    .eq("business_id", businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/staff/${staffId}/time-off`);
  return { success: true };
}
