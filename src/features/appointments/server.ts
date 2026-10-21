"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
  customerSchema,
  type CreateAppointmentSchemaInput,
  type RescheduleAppointmentSchemaInput,
  type CancelAppointmentSchemaInput,
  type CustomerInput,
} from "./validation";
import {
  BOOKING_ERROR_CODES,
  USER_FRIENDLY_ERROR_MESSAGES,
  mapDatabaseErrorToBookingError,
  sanitizeUserErrorMessage,
  type BookingErrorCode,
} from "./booking-errors";
import { convertLocalWallClockToUTC } from "./timezone";
import type {
  Appointment,
  AppointmentWithDetails,
  AppointmentOperationResult,
  Customer,
  UpdateAppointmentStatusInput,
  AppointmentKpis,
  CustomerWithMetrics,
  CustomerProfileWithHistory,
} from "./types";

/**
 * Enforces server-side tenant role authorization.
 * Returns true only if caller is an authenticated member of the specified business.
 */
async function verifyBusinessMemberRole(
  businessId: string
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      authorized: false,
      error: USER_FRIENDLY_ERROR_MESSAGES.UNAUTHORIZED,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { authorized: false, error: "Database client is not available." };
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
      error: USER_FRIENDLY_ERROR_MESSAGES.BUSINESS_ACCESS_DENIED,
    };
  }

  return { authorized: true, userId: user.id };
}

/**
 * Atomically creates an appointment with database-level double-booking protection.
 */
export async function createAppointment(
  input: CreateAppointmentSchemaInput,
  businessSlug?: string
): Promise<AppointmentOperationResult<Appointment>> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.VALIDATION_ERROR,
      error: parsed.error.issues[0]?.message || USER_FRIENDLY_ERROR_MESSAGES.VALIDATION_ERROR,
    };
  }

  const authCheck = await verifyBusinessMemberRole(parsed.data.business_id);
  if (!authCheck.authorized) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.BUSINESS_ACCESS_DENIED,
      error: authCheck.error,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.DATABASE_ERROR,
      error: "Database client is unavailable.",
    };
  }

  // 1. Execute atomic RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_appointment_atomic",
    {
      p_business_id: parsed.data.business_id,
      p_service_id: parsed.data.service_id,
      p_staff_id: parsed.data.staff_id,
      p_starts_at: parsed.data.starts_at,
      p_customer_id: parsed.data.customer_id || null,
      p_customer_name: parsed.data.customer_name || null,
      p_customer_email: parsed.data.customer_email || null,
      p_customer_phone: parsed.data.customer_phone || null,
      p_notes: parsed.data.notes || null,
      p_idempotency_key: parsed.data.idempotency_key || null,
    }
  );

  if (rpcError) {
    console.error("[Appointments Server] create_appointment_atomic RPC error:", {
      code: rpcError.code,
      message: rpcError.message,
      businessId: parsed.data.business_id,
    });
    const mapped = mapDatabaseErrorToBookingError(rpcError, "create");
    return {
      success: false,
      code: mapped.code,
      error: mapped.message,
    };
  }

  // RPC returns JSONB object: { success: boolean, code?: string, message?: string, data?: Appointment }
  if (rpcData && typeof rpcData === "object") {
    const res = rpcData as {
      success: boolean;
      code?: string;
      message?: string;
      data?: Appointment;
      is_idempotent_replay?: boolean;
    };

    if (!res.success) {
      const fallbackMsg =
        USER_FRIENDLY_ERROR_MESSAGES[res.code as BookingErrorCode] ||
        USER_FRIENDLY_ERROR_MESSAGES.CONFLICT;
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.CONFLICT,
        error: sanitizeUserErrorMessage(res.message, fallbackMsg),
      };
    }

    if (businessSlug) {
      revalidatePath(`/dashboard/${businessSlug}/appointments`);
    }

    return {
      success: true,
      data: res.data,
      is_idempotent_replay: res.is_idempotent_replay,
    };
  }

  return {
    success: false,
    code: BOOKING_ERROR_CODES.DATABASE_ERROR,
    error: "Unexpected response from booking engine.",
  };
}

/**
 * Atomically reschedules an appointment to a new timeslot or staff member.
 * If target slot is unavailable, original appointment remains completely untouched.
 */
export async function rescheduleAppointment(
  input: RescheduleAppointmentSchemaInput,
  businessSlug?: string
): Promise<AppointmentOperationResult<Appointment>> {
  const parsed = rescheduleAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.VALIDATION_ERROR,
      error: parsed.error.issues[0]?.message || USER_FRIENDLY_ERROR_MESSAGES.VALIDATION_ERROR,
    };
  }

  const authCheck = await verifyBusinessMemberRole(parsed.data.business_id);
  if (!authCheck.authorized) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.BUSINESS_ACCESS_DENIED,
      error: authCheck.error,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.DATABASE_ERROR,
      error: "Database client is unavailable.",
    };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "reschedule_appointment_atomic",
    {
      p_business_id: parsed.data.business_id,
      p_appointment_id: parsed.data.appointment_id,
      p_new_starts_at: parsed.data.new_starts_at,
      p_new_staff_id: parsed.data.new_staff_id || null,
      p_reason: parsed.data.reason || null,
    }
  );

  if (rpcError) {
    console.error("[Appointments Server] reschedule_appointment_atomic RPC error:", {
      code: rpcError.code,
      message: rpcError.message,
      appointmentId: parsed.data.appointment_id,
    });
    const mapped = mapDatabaseErrorToBookingError(rpcError, "reschedule");
    return {
      success: false,
      code: mapped.code,
      error: mapped.message,
    };
  }

  if (rpcData && typeof rpcData === "object") {
    const res = rpcData as {
      success: boolean;
      code?: string;
      message?: string;
      data?: Appointment;
    };

    if (!res.success) {
      const fallbackMsg =
        USER_FRIENDLY_ERROR_MESSAGES[res.code as BookingErrorCode] ||
        USER_FRIENDLY_ERROR_MESSAGES.SLOT_TAKEN;
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.SLOT_TAKEN,
        error: sanitizeUserErrorMessage(res.message, fallbackMsg),
      };
    }

    if (businessSlug) {
      revalidatePath(`/dashboard/${businessSlug}/appointments`);
    }

    return {
      success: true,
      data: res.data,
    };
  }

  return {
    success: false,
    code: BOOKING_ERROR_CODES.DATABASE_ERROR,
    error: "Unexpected response from rescheduling engine.",
  };
}

/**
 * Atomically cancels an appointment and releases its occupied capacity.
 */
export async function cancelAppointment(
  input: CancelAppointmentSchemaInput,
  businessSlug?: string
): Promise<AppointmentOperationResult<Appointment>> {
  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.VALIDATION_ERROR,
      error: parsed.error.issues[0]?.message || USER_FRIENDLY_ERROR_MESSAGES.VALIDATION_ERROR,
    };
  }

  const authCheck = await verifyBusinessMemberRole(parsed.data.business_id);
  if (!authCheck.authorized) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.BUSINESS_ACCESS_DENIED,
      error: authCheck.error,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.DATABASE_ERROR,
      error: "Database client is unavailable.",
    };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "cancel_appointment_atomic",
    {
      p_business_id: parsed.data.business_id,
      p_appointment_id: parsed.data.appointment_id,
      p_reason: parsed.data.reason || null,
    }
  );

  if (rpcError) {
    console.error("[Appointments Server] cancel_appointment_atomic RPC error:", {
      code: rpcError.code,
      message: rpcError.message,
      appointmentId: parsed.data.appointment_id,
    });
    const mapped = mapDatabaseErrorToBookingError(rpcError, "cancel");
    return {
      success: false,
      code: mapped.code,
      error: mapped.message,
    };
  }

  if (rpcData && typeof rpcData === "object") {
    const res = rpcData as {
      success: boolean;
      code?: string;
      message?: string;
      data?: Appointment;
    };

    if (!res.success) {
      const fallbackMsg =
        USER_FRIENDLY_ERROR_MESSAGES[res.code as BookingErrorCode] ||
        USER_FRIENDLY_ERROR_MESSAGES.DATABASE_ERROR;
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.DATABASE_ERROR,
        error: sanitizeUserErrorMessage(res.message, fallbackMsg),
      };
    }

    if (businessSlug) {
      revalidatePath(`/dashboard/${businessSlug}/appointments`);
    }

    return {
      success: true,
      data: res.data,
    };
  }

  return {
    success: false,
    code: BOOKING_ERROR_CODES.DATABASE_ERROR,
    error: "Unexpected response from cancellation engine.",
  };
}

/**
 * Updates an appointment's status while enforcing lifecycle state machine rules.
 */
export async function updateAppointmentStatus(
  input: UpdateAppointmentStatusInput,
  businessSlug?: string
): Promise<AppointmentOperationResult<Appointment>> {
  const parsed = updateAppointmentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.VALIDATION_ERROR,
      error: parsed.error.issues[0]?.message || USER_FRIENDLY_ERROR_MESSAGES.VALIDATION_ERROR,
    };
  }

  const authCheck = await verifyBusinessMemberRole(parsed.data.business_id);
  if (!authCheck.authorized) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.BUSINESS_ACCESS_DENIED,
      error: authCheck.error,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      code: BOOKING_ERROR_CODES.DATABASE_ERROR,
      error: "Database client is unavailable.",
    };
  }

  // Call atomic status update RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "update_appointment_status_atomic",
    {
      p_business_id: parsed.data.business_id,
      p_appointment_id: parsed.data.appointment_id,
      p_new_status: parsed.data.status,
      p_reason: parsed.data.reason || null,
    }
  );

  if (rpcError) {
    console.error("[Appointments Server] update_appointment_status_atomic RPC error:", {
      code: rpcError.code,
      message: rpcError.message,
      appointmentId: parsed.data.appointment_id,
      newStatus: parsed.data.status,
    });
    const mapped = mapDatabaseErrorToBookingError(rpcError, "status");
    return {
      success: false,
      code: mapped.code,
      error: mapped.message,
    };
  }

  if (rpcData && typeof rpcData === "object") {
    const res = rpcData as {
      success: boolean;
      code?: string;
      message?: string;
      data?: Appointment;
    };

    if (!res.success) {
      const fallbackMsg =
        USER_FRIENDLY_ERROR_MESSAGES[res.code as BookingErrorCode] ||
        USER_FRIENDLY_ERROR_MESSAGES.INVALID_STATUS_TRANSITION;
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.INVALID_STATUS_TRANSITION,
        error: sanitizeUserErrorMessage(res.message, fallbackMsg),
      };
    }

    if (businessSlug) {
      revalidatePath(`/dashboard/${businessSlug}/appointments`);
    }

    return {
      success: true,
      data: res.data,
    };
  }

  return {
    success: false,
    code: BOOKING_ERROR_CODES.DATABASE_ERROR,
    error: "Unexpected response from status update engine.",
  };
}

/**
 * Retrieves a single appointment by ID within an authorized business workspace.
 */
export async function getAppointmentById(
  businessId: string,
  appointmentId: string
): Promise<AppointmentWithDetails | null> {
  const authCheck = await verifyBusinessMemberRole(businessId);
  if (!authCheck.authorized) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      customer:customers(id, name, email, phone),
      service:services(id, name, price_amount, duration_minutes),
      staff:staff_profiles(id, display_name, professional_title)
    `)
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .single();

  if (error || !data) return null;
  return data as AppointmentWithDetails;
}

/**
 * Lists appointments for a business within an optional date range and staff filter.
 */
export async function listAppointments(
  businessId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    staffId?: string;
    status?: string;
  }
): Promise<AppointmentWithDetails[]> {
  const authCheck = await verifyBusinessMemberRole(businessId);
  if (!authCheck.authorized) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from("appointments")
    .select(`
      *,
      customer:customers(id, name, email, phone),
      service:services(id, name, price_amount, duration_minutes),
      staff:staff_profiles(id, display_name, professional_title)
    `)
    .eq("business_id", businessId)
    .order("starts_at", { ascending: true });

  if (options?.startDate) {
    const startIso = options.startDate.includes("T")
      ? options.startDate
      : `${options.startDate}T00:00:00.000Z`;
    query = query.gte("starts_at", startIso);
  }
  if (options?.endDate) {
    const endIso = options.endDate.includes("T")
      ? options.endDate
      : `${options.endDate}T23:59:59.999Z`;
    query = query.lte("starts_at", endIso);
  }
  if (options?.staffId && options.staffId !== "all") {
    query = query.eq("staff_id", options.staffId);
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[listAppointments] Query error:", error);
    return [];
  }
  return data as AppointmentWithDetails[];
}

/**
 * Creates or retrieves a customer record within a business workspace.
 */
export async function getOrCreateCustomer(
  businessId: string,
  input: CustomerInput
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid customer data",
    };
  }

  const authCheck = await verifyBusinessMemberRole(businessId);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  // 1. Try finding existing customer by email or phone
  let matchQuery = supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId);

  if (parsed.data.email) {
    matchQuery = matchQuery.eq("email", parsed.data.email.toLowerCase().trim());
  } else if (parsed.data.phone) {
    matchQuery = matchQuery.eq("phone", parsed.data.phone.trim());
  }

  const { data: existing } = await matchQuery.limit(1).maybeSingle();
  if (existing) {
    return { success: true, customer: existing as Customer };
  }

  // 2. Insert new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      name: parsed.data.name.trim(),
      email: parsed.data.email ? parsed.data.email.toLowerCase().trim() : null,
      phone: parsed.data.phone ? parsed.data.phone.trim() : null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (insertError || !newCustomer) {
    return { success: false, error: insertError?.message || "Failed to create customer record" };
  }

  return { success: true, customer: newCustomer as Customer };
}

/**
 * Lists appointments for a business workspace by slug.
 */
export async function listAppointmentsBySlug(
  businessSlug: string,
  options?: {
    startDate?: string;
    endDate?: string;
    staffId?: string;
    status?: string;
    search?: string;
  }
): Promise<{ success: boolean; appointments: AppointmentWithDetails[]; timezone: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, appointments: [], timezone: "Europe/London", error: "Database client unavailable" };

  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone")
    .eq("slug", businessSlug)
    .single();

  if (!business) return { success: false, appointments: [], timezone: "Europe/London", error: "Business workspace not found" };

  const authCheck = await verifyBusinessMemberRole(business.id);
  if (!authCheck.authorized) {
    return { success: false, appointments: [], timezone: business.timezone || "Europe/London", error: authCheck.error };
  }

  const tz = business.timezone || "Europe/London";

  let query = supabase
    .from("appointments")
    .select(`
      *,
      customer:customers(id, name, email, phone),
      service:services(id, name, price_amount, duration_minutes),
      staff:staff_profiles(id, display_name, professional_title)
    `)
    .eq("business_id", business.id)
    .order("starts_at", { ascending: true });

  if (options?.startDate) {
    let startIso = options.startDate;
    if (!startIso.includes("T")) {
      const conv = convertLocalWallClockToUTC(
        { date: options.startDate, time: "00:00", timeZone: tz },
        "earlier"
      );
      startIso = conv.isoString || `${options.startDate}T00:00:00.000Z`;
    }
    query = query.gte("starts_at", startIso);
  }
  if (options?.endDate) {
    let endIso = options.endDate;
    if (!endIso.includes("T")) {
      const conv = convertLocalWallClockToUTC(
        { date: options.endDate, time: "23:59", timeZone: tz },
        "later"
      );
      if (conv.utcInstant) {
        endIso = new Date(conv.utcInstant.getTime() + 59 * 1000 + 999).toISOString();
      } else {
        endIso = `${options.endDate}T23:59:59.999Z`;
      }
    }
    query = query.lte("starts_at", endIso);
  }
  if (options?.staffId && options.staffId !== "all") {
    query = query.eq("staff_id", options.staffId);
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options?.search && options.search.trim().length > 0) {
    const s = options.search.trim().toLowerCase();
    query = query.or(`customer_name_snapshot.ilike.%${s}%,service_name_snapshot.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[listAppointmentsBySlug] Query error:", error);
    return { success: false, appointments: [], timezone: tz, error: error?.message };
  }

  return {
    success: true,
    appointments: data as AppointmentWithDetails[],
    timezone: tz,
  };
}

/**
 * Calculates operational KPIs for a business on a local date.
 */
export async function getAppointmentKpis(
  businessSlug: string,
  localDate: string
): Promise<{ success: boolean; kpis?: AppointmentKpis; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone, currency")
    .eq("slug", businessSlug)
    .single();

  if (!business) return { success: false, error: "Business workspace not found" };

  const authCheck = await verifyBusinessMemberRole(business.id);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const tz = business.timezone || "Europe/London";

  // Calculate UTC interval for localDate
  const startUtcRes = convertLocalWallClockToUTC(
    { date: localDate, time: "00:00", timeZone: tz },
    "earlier"
  );
  const endUtcRes = convertLocalWallClockToUTC(
    { date: localDate, time: "23:59", timeZone: tz },
    "later"
  );

  const startUtc = startUtcRes.isoString || `${localDate}T00:00:00.000Z`;
  const endUtc = endUtcRes.isoString || `${localDate}T23:59:59.000Z`;
  const nowIso = new Date().toISOString();

  // Query today's appointments
  const { data: todayAppts, error: apptError } = await supabase
    .from("appointments")
    .select("id, status, price_minor_snapshot, starts_at")
    .eq("business_id", business.id)
    .gte("starts_at", startUtc)
    .lte("starts_at", endUtc);

  if (apptError) {
    return { success: false, error: apptError.message };
  }

  // Query upcoming count
  const { count: upcomingCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gt("starts_at", nowIso)
    .in("status", ["confirmed", "pending"]);

  const list = todayAppts || [];
  const confirmed = list.filter((a) => a.status === "confirmed").length;
  const pending = list.filter((a) => a.status === "pending").length;
  const completed = list.filter((a) => a.status === "completed").length;
  const cancelled = list.filter((a) => a.status === "cancelled").length;
  const noShow = list.filter((a) => a.status === "no_show").length;
  const revenue = list
    .filter((a) => a.status !== "cancelled")
    .reduce((sum, a) => sum + (a.price_minor_snapshot || 0), 0);

  return {
    success: true,
    kpis: {
      todayCount: list.length,
      confirmedCount: confirmed,
      pendingCount: pending,
      completedCount: completed,
      cancelledCount: cancelled,
      noShowCount: noShow,
      upcomingCount: upcomingCount || 0,
      todayRevenueMinor: revenue,
      currency: business.currency || "GBP",
    },
  };
}

/**
 * Searches customer directory within a business workspace.
 */
export async function searchCustomers(
  businessSlug: string,
  query: string,
  limit: number = 10
): Promise<{ success: boolean; customers: Customer[]; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, customers: [], error: "Database client unavailable" };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", businessSlug)
    .single();

  if (!business) return { success: false, customers: [], error: "Business not found" };

  const authCheck = await verifyBusinessMemberRole(business.id);
  if (!authCheck.authorized) return { success: false, customers: [], error: authCheck.error };

  const trimmed = query.trim();
  let dbQuery = supabase
    .from("customers")
    .select("*")
    .eq("business_id", business.id)
    .order("name", { ascending: true })
    .limit(limit);

  if (trimmed.length > 0) {
    dbQuery = dbQuery.or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
  }

  const { data, error } = await dbQuery;
  if (error || !data) {
    return { success: false, customers: [], error: error?.message };
  }

  return { success: true, customers: data as Customer[] };
}

/**
 * Lists customers with aggregated appointment counts and last/upcoming visits.
 */
export async function listCustomersWithMetrics(
  businessSlug: string,
  options?: { search?: string; page?: number; limit?: number }
): Promise<{ success: boolean; customers: CustomerWithMetrics[]; totalCount: number; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, customers: [], totalCount: 0, error: "Database client unavailable" };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", businessSlug)
    .single();

  if (!business) return { success: false, customers: [], totalCount: 0, error: "Business not found" };

  const authCheck = await verifyBusinessMemberRole(business.id);
  if (!authCheck.authorized) return { success: false, customers: [], totalCount: 0, error: authCheck.error };

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.search && options.search.trim().length > 0) {
    const s = options.search.trim();
    query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
  }

  const { data: customerRows, count, error } = await query;
  if (error || !customerRows) {
    return { success: false, customers: [], totalCount: 0, error: error?.message };
  }

  const customerIds = customerRows.map((c) => c.id);
  if (customerIds.length === 0) {
    return { success: true, customers: [], totalCount: count || 0 };
  }

  // Batch load appointment summaries for these customers
  const { data: apptRows } = await supabase
    .from("appointments")
    .select("customer_id, status, starts_at")
    .eq("business_id", business.id)
    .in("customer_id", customerIds)
    .order("starts_at", { ascending: false });

  const now = new Date().toISOString();
  const customerMetricsMap: Record<
    string,
    { total: number; cancelled: number; lastDate: string | null; upcomingDate: string | null }
  > = {};

  for (const c of customerRows) {
    customerMetricsMap[c.id] = { total: 0, cancelled: 0, lastDate: null, upcomingDate: null };
  }

  for (const a of apptRows || []) {
    const entry = customerMetricsMap[a.customer_id];
    if (!entry) continue;

    if (a.status === "completed") {
      entry.total += 1;
      if (!entry.lastDate || a.starts_at > entry.lastDate) {
        entry.lastDate = a.starts_at;
      }
    } else if (a.status === "cancelled" || a.status === "no_show") {
      entry.cancelled += 1;
    }

    if ((a.status === "confirmed" || a.status === "pending") && a.starts_at > now) {
      if (!entry.upcomingDate || a.starts_at < entry.upcomingDate) {
        entry.upcomingDate = a.starts_at;
      }
    }
  }

  const enriched: CustomerWithMetrics[] = customerRows.map((c) => ({
    ...c,
    totalVisits: customerMetricsMap[c.id]?.total || 0,
    cancelledVisits: customerMetricsMap[c.id]?.cancelled || 0,
    lastVisitDate: customerMetricsMap[c.id]?.lastDate || null,
    upcomingVisitDate: customerMetricsMap[c.id]?.upcomingDate || null,
  }));

  return { success: true, customers: enriched, totalCount: count || 0 };
}

/**
 * Loads a customer's detailed profile with their complete chronological appointment history.
 */
export async function getCustomerProfileWithAppointments(
  businessSlug: string,
  customerId: string
): Promise<{ success: boolean; data?: CustomerProfileWithHistory; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", businessSlug)
    .single();

  if (!business) return { success: false, error: "Business not found" };

  const authCheck = await verifyBusinessMemberRole(business.id);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  // 1. Fetch customer
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("business_id", business.id)
    .single();

  if (custErr || !customer) {
    return { success: false, error: "Customer not found in this business" };
  }

  // 2. Fetch all appointments for customer
  const { data: appts, error: apptErr } = await supabase
    .from("appointments")
    .select(`
      *,
      service:services(id, name, price_amount, duration_minutes),
      staff:staff_profiles(id, display_name, professional_title)
    `)
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .order("starts_at", { ascending: false });

  if (apptErr) {
    return { success: false, error: apptErr.message };
  }

  const list = (appts || []) as AppointmentWithDetails[];
  const completed = list.filter((a) => a.status === "completed").length;
  const cancelled = list.filter((a) => a.status === "cancelled").length;
  const noShow = list.filter((a) => a.status === "no_show").length;
  const spend = list
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.price_minor_snapshot || 0), 0);

  return {
    success: true,
    data: {
      customer: customer as Customer,
      appointments: list,
      metrics: {
        totalVisits: list.length,
        completedVisits: completed,
        cancelledVisits: cancelled,
        noShowVisits: noShow,
        totalSpendMinor: spend,
      },
    },
  };
}

/**
 * Direct customer creation action for manual customer management.
 */
export async function createCustomerDirect(
  businessSlug: string,
  input: CustomerInput
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", businessSlug)
    .single();

  if (!business) return { success: false, error: "Business not found" };

  const res = await getOrCreateCustomer(business.id, input);
  if (res.success) {
    revalidatePath(`/dashboard/${businessSlug}/customers`);
  }
  return res;
}
