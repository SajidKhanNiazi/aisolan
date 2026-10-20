"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  staffProfileSchema,
  staffWeeklyScheduleSchema,
  staffBreakSchema,
  staffTimeOffSchema,
  normalizeTimeHHMM,
  hasOverlappingBreaks,
  isBreakWithinWorkingHours,
  hasTimeOffOverlap,
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
export async function getBusinessStaff(
  slug: string,
  includeArchived: boolean = true
): Promise<{
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

  let query = supabase
    .from("staff_profiles")
    .select("*")
    .eq("business_id", business.id);

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data: staffData } = await query
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
    workingHours: (hoursData || []).map((h) => ({
      ...h,
      open_time: normalizeTimeHHMM(h.open_time),
      close_time: normalizeTimeHHMM(h.close_time),
    })),
    breaks: (breaksData || []).map((b) => ({
      ...b,
      start_time: normalizeTimeHHMM(b.start_time) || b.start_time,
      end_time: normalizeTimeHHMM(b.end_time) || b.end_time,
    })),
    timeOff: (timeOffData || []).map((t) => ({
      ...t,
      start_time: normalizeTimeHHMM(t.start_time),
      end_time: normalizeTimeHHMM(t.end_time),
    })),
    businessOpeningHours: (bizHours || []).map((bh) => ({
      ...bh,
      open_time: normalizeTimeHHMM(bh.open_time),
      close_time: normalizeTimeHHMM(bh.close_time),
    })),
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
 * Restores an archived staff profile back to active status.
 */
export async function restoreStaffProfile(
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
      is_archived: false,
      is_active: true,
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
 * Server guards enforce that inactive staff cannot receive service assignments,
 * and new assignments cannot be made to inactive services.
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

  // 1. Check staff profile status: inactive staff cannot have services assigned
  const { data: staff, error: staffError } = await supabase
    .from("staff_profiles")
    .select("is_active, is_archived, display_name")
    .eq("id", staffId)
    .eq("business_id", businessId)
    .single();

  if (staffError || !staff) {
    return { success: false, error: "Staff member not found." };
  }

  if (staff.is_archived) {
    return { success: false, error: "Cannot assign services to an archived staff member." };
  }

  if (!staff.is_active && serviceIds.length > 0) {
    return {
      success: false,
      error: `Cannot assign services to inactive staff member "${staff.display_name}". Please activate them first.`,
    };
  }

  // 2. Fetch existing assignments for this staff
  const { data: currentAssignments } = await supabase
    .from("staff_services")
    .select("service_id")
    .eq("staff_id", staffId)
    .eq("business_id", businessId);

  const existingServiceIds = new Set((currentAssignments || []).map((r) => r.service_id));
  const newlyAddedIds = serviceIds.filter((id) => !existingServiceIds.has(id));

  // 3. Prevent NEW assignments to inactive or archived services
  if (newlyAddedIds.length > 0) {
    const { data: servicesToCheck, error: sError } = await supabase
      .from("services")
      .select("id, name, is_active, is_archived")
      .in("id", newlyAddedIds)
      .eq("business_id", businessId);

    if (sError) return { success: false, error: sError.message };

    const invalidService = (servicesToCheck || []).find((s) => !s.is_active || s.is_archived);
    if (invalidService) {
      return {
        success: false,
        error: `Cannot assign service "${invalidService.name}" because it is inactive or archived.`,
      };
    }
  }

  // 4. Delete existing assignments for this staff in this business
  const { error: delError } = await supabase
    .from("staff_services")
    .delete()
    .eq("staff_id", staffId)
    .eq("business_id", businessId);

  if (delError) return { success: false, error: delError.message };

  // 5. Insert new assignments
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
 * Enforces server-side that:
 * 1. The break falls entirely within active working hours on that day.
 * 2. The break does not overlap with an existing scheduled break on that day.
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

  // 1. Fetch staff working hours for this weekday to ensure break falls within active shift
  const { data: workingHours } = await supabase
    .from("staff_working_hours")
    .select("day_of_week, is_working, open_time, close_time")
    .eq("staff_id", staffId)
    .eq("business_id", businessId)
    .eq("day_of_week", parsed.data.day_of_week);

  if (!isBreakWithinWorkingHours(parsed.data, workingHours || [])) {
    return {
      success: false,
      error: "Break must fall entirely within working hours on this day.",
    };
  }

  // 2. Fetch existing breaks on this weekday to prevent overlap
  const { data: existingBreaks } = await supabase
    .from("staff_breaks")
    .select("start_time, end_time, day_of_week")
    .eq("staff_id", staffId)
    .eq("business_id", businessId)
    .eq("day_of_week", parsed.data.day_of_week);

  if (hasOverlappingBreaks([...(existingBreaks || []), parsed.data])) {
    return {
      success: false,
      error: "Break overlaps with an existing scheduled break on this day.",
    };
  }

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
 * Enforces server-side that the candidate time off does not overlap with existing leave.
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

  // Fetch existing time-off periods that could intersect candidate date range
  const { data: existingTimeOff, error: fetchError } = await supabase
    .from("staff_time_off")
    .select("id, start_date, end_date, is_full_day, start_time, end_time")
    .eq("staff_id", staffId)
    .eq("business_id", businessId)
    .lte("start_date", parsed.data.end_date)
    .gte("end_date", parsed.data.start_date);

  if (fetchError) return { success: false, error: fetchError.message };

  if (hasTimeOffOverlap(parsed.data, existingTimeOff || [])) {
    return {
      success: false,
      error: "This time off period conflicts with an existing scheduled leave.",
    };
  }

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

  const { data, error } = await supabase
    .from("staff_time_off")
    .delete()
    .eq("id", timeOffId)
    .eq("staff_id", staffId)
    .eq("business_id", businessId)
    .select();

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "Time-off entry not found or unauthorized." };
  }

  revalidatePath(`/dashboard/${slug}/staff/${staffId}/time-off`);
  return { success: true };
}
