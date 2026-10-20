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
} from "./booking-errors";
import type {
  Appointment,
  AppointmentWithDetails,
  AppointmentOperationResult,
  Customer,
  UpdateAppointmentStatusInput,
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
    const mapped = mapDatabaseErrorToBookingError(rpcError);
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
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.CONFLICT,
        error: res.message || USER_FRIENDLY_ERROR_MESSAGES.CONFLICT,
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
    const mapped = mapDatabaseErrorToBookingError(rpcError);
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
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.SLOT_TAKEN,
        error: res.message || USER_FRIENDLY_ERROR_MESSAGES.SLOT_TAKEN,
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
    const mapped = mapDatabaseErrorToBookingError(rpcError);
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
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.DATABASE_ERROR,
        error: res.message || USER_FRIENDLY_ERROR_MESSAGES.DATABASE_ERROR,
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
    const mapped = mapDatabaseErrorToBookingError(rpcError);
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
      return {
        success: false,
        code: res.code || BOOKING_ERROR_CODES.INVALID_STATUS_TRANSITION,
        error: res.message || USER_FRIENDLY_ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
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
    query = query.gte("starts_at", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("starts_at", options.endDate);
  }
  if (options?.staffId) {
    query = query.eq("staff_id", options.staffId);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];
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
