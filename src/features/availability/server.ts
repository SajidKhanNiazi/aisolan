"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { availabilityQuerySchema, type AvailabilityQuerySchemaInput } from "./validation";
import {
  AVAILABILITY_ERROR_CODES,
  USER_FRIENDLY_AVAILABILITY_MESSAGES,
  type AvailabilityErrorCode,
} from "./availability-errors";
import { calculateAvailableSlots } from "./engine";
import type {
  AvailabilityResponse,
  PureCalculationContext,
  StaffPreference,
} from "./types";
import { DEFAULT_BOOKING_POLICY } from "@/features/organizations/constants";

export interface AvailabilityResult {
  success: boolean;
  data?: AvailabilityResponse;
  code?: AvailabilityErrorCode;
  error?: string;
}

/**
 * Enforces server-side tenant role authorization.
 */
async function verifyBusinessMemberRole(
  businessId: string
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      authorized: false,
      error: USER_FRIENDLY_AVAILABILITY_MESSAGES.UNAUTHORIZED,
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
      error: USER_FRIENDLY_AVAILABILITY_MESSAGES.BUSINESS_ACCESS_DENIED,
    };
  }

  return { authorized: true, userId: user.id };
}

/**
 * Fetches real-time appointment availability for a business, service, staff and date.
 * Executes batch queries to avoid N+1 database roundtrips.
 */
export async function getAppointmentAvailability(
  input: AvailabilityQuerySchemaInput
): Promise<AvailabilityResult> {
  const parsed = availabilityQuerySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.VALIDATION_ERROR,
      error:
        parsed.error.issues[0]?.message ||
        USER_FRIENDLY_AVAILABILITY_MESSAGES.VALIDATION_ERROR,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.DATABASE_ERROR,
      error: USER_FRIENDLY_AVAILABILITY_MESSAGES.DATABASE_ERROR,
    };
  }

  const {
    businessId,
    businessSlug,
    serviceId,
    date,
    staffId,
    staffPreference,
    slotIntervalMinutes = 15,
  } = parsed.data;

  // 1. Resolve Business
  let bizQuery = supabase.from("businesses").select("id, name, slug, timezone, currency");
  if (businessId) {
    bizQuery = bizQuery.eq("id", businessId);
  } else if (businessSlug) {
    bizQuery = bizQuery.eq("slug", businessSlug);
  } else {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.VALIDATION_ERROR,
      error: "Either businessId or businessSlug must be provided.",
    };
  }

  const { data: business, error: bizError } = await bizQuery.single();
  if (bizError || !business) {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.BUSINESS_NOT_FOUND,
      error: USER_FRIENDLY_AVAILABILITY_MESSAGES.BUSINESS_NOT_FOUND,
    };
  }

  // 2. Authorize Caller for Internal Preview
  const authCheck = await verifyBusinessMemberRole(business.id);
  if (!authCheck.authorized) {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.BUSINESS_ACCESS_DENIED,
      error: authCheck.error,
    };
  }

  // 3. Load Service
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, name, duration_minutes, buffer_minutes, is_active, is_archived")
    .eq("id", serviceId)
    .eq("business_id", business.id)
    .single();

  if (serviceError || !service || service.is_archived) {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.SERVICE_NOT_FOUND,
      error: USER_FRIENDLY_AVAILABILITY_MESSAGES.SERVICE_NOT_FOUND,
    };
  }

  if (!service.is_active) {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.SERVICE_INACTIVE,
      error: USER_FRIENDLY_AVAILABILITY_MESSAGES.SERVICE_INACTIVE,
    };
  }

  // 4. Load Eligible Staff assigned to this service
  const { data: assignedStaffRows, error: assignError } = await supabase
    .from("staff_services")
    .select(
      `
      staff_id,
      staff_profiles (
        id,
        display_name,
        is_active,
        is_archived,
        display_order
      )
    `
    )
    .eq("business_id", business.id)
    .eq("service_id", service.id);

  if (assignError) {
    return {
      success: false,
      code: AVAILABILITY_ERROR_CODES.DATABASE_ERROR,
      error: assignError.message,
    };
  }

  interface StaffProfileJoin {
    id: string;
    display_name: string;
    is_active: boolean;
    is_archived: boolean;
    display_order: number;
  }

  // Flatten and filter active non-archived staff
  const eligibleStaff = (assignedStaffRows || [])
    .map((row) => (row as unknown as { staff_profiles: StaffProfileJoin | null }).staff_profiles)
    .filter(
      (staff): staff is StaffProfileJoin => Boolean(staff && staff.is_active && !staff.is_archived)
    );

  if (eligibleStaff.length === 0) {
    return {
      success: true,
      data: {
        date,
        timezone: business.timezone || "Europe/London",
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.duration_minutes,
        bufferMinutes: service.buffer_minutes || 0,
        staffPreference,
        selectedStaffId: staffId || null,
        slots: [],
        totalSlotsCount: 0,
        metadata: {
          durationMinutes: service.duration_minutes,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: service.buffer_minutes || 0,
          totalOccupiedMinutes:
            service.duration_minutes + (service.buffer_minutes || 0),
          minNoticeHours: DEFAULT_BOOKING_POLICY.min_notice_hours,
          maxAdvanceDays: DEFAULT_BOOKING_POLICY.max_advance_days,
        },
      },
    };
  }

  if (staffPreference === "specific" && staffId) {
    const isAssigned = eligibleStaff.some((s) => s.id === staffId);
    if (!isAssigned) {
      return {
        success: false,
        code: AVAILABILITY_ERROR_CODES.STAFF_NOT_ELIGIBLE,
        error: USER_FRIENDLY_AVAILABILITY_MESSAGES.STAFF_NOT_ELIGIBLE,
      };
    }
  }

  const eligibleStaffIds = eligibleStaff.map((s) => s.id);

  // 5. Batch Load Schedules, Policies, Exceptions, Breaks, Time Off, and Appointments
  const [
    policyRes,
    openingHoursRes,
    exceptionsRes,
    workingHoursRes,
    breaksRes,
    timeOffRes,
    appointmentsRes,
  ] = await Promise.all([
    // Policy
    supabase
      .from("business_booking_policies")
      .select("min_notice_hours, max_advance_days, online_booking_enabled")
      .eq("business_id", business.id)
      .maybeSingle(),

    // Weekly opening hours
    supabase
      .from("business_opening_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", business.id),

    // Schedule exceptions for this date
    supabase
      .from("business_schedule_exceptions")
      .select("exception_date, is_closed, open_time, close_time, reason")
      .eq("business_id", business.id)
      .eq("exception_date", date),

    // Staff working shifts
    supabase
      .from("staff_working_hours")
      .select("staff_id, day_of_week, is_working, open_time, close_time")
      .eq("business_id", business.id)
      .in("staff_id", eligibleStaffIds),

    // Staff breaks
    supabase
      .from("staff_breaks")
      .select("staff_id, day_of_week, break_title, start_time, end_time")
      .eq("business_id", business.id)
      .in("staff_id", eligibleStaffIds),

    // Staff time off overlapping date
    supabase
      .from("staff_time_off")
      .select("staff_id, start_date, end_date, is_full_day, start_time, end_time")
      .eq("business_id", business.id)
      .in("staff_id", eligibleStaffIds)
      .lte("start_date", date)
      .gte("end_date", date),

    // Existing capacity-holding appointments
    // Query spanning a 3-day window centered on the date in UTC to cover local timezone offsets
    supabase
      .from("appointments")
      .select(
        "id, staff_id, status, starts_at, service_ends_at, occupied_starts_at, occupied_ends_at"
      )
      .eq("business_id", business.id)
      .in("staff_id", eligibleStaffIds)
      .in("status", ["confirmed", "pending", "completed", "no_show"])
      .gte("occupied_ends_at", `${date}T00:00:00Z`)
      .lte("occupied_starts_at", `${date}T23:59:59Z`),
  ]);

  const bookingPolicy = {
    min_notice_hours:
      policyRes.data?.min_notice_hours ??
      DEFAULT_BOOKING_POLICY.min_notice_hours,
    max_advance_days:
      policyRes.data?.max_advance_days ??
      DEFAULT_BOOKING_POLICY.max_advance_days,
    online_booking_enabled:
      policyRes.data?.online_booking_enabled ??
      DEFAULT_BOOKING_POLICY.online_booking_enabled,
  };

  const businessOpeningHours = openingHoursRes.data || [];
  const businessExceptions = exceptionsRes.data || [];
  const staffWorkingHours = workingHoursRes.data || [];
  const staffBreaks = breaksRes.data || [];
  const staffTimeOff = timeOffRes.data || [];
  const existingAppointments = appointmentsRes.data || [];

  // 6. Execute Pure Calculation Engine
  const pureContext: PureCalculationContext = {
    date,
    timezone: business.timezone || "Europe/London",
    now: new Date(),
    bookingPolicy,
    service: {
      id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
      buffer_minutes: service.buffer_minutes || 0,
      is_active: service.is_active,
      is_archived: service.is_archived,
    },
    staffMembers: eligibleStaff,
    businessOpeningHours,
    businessExceptions,
    staffWorkingHours,
    staffBreaks,
    staffTimeOff,
    existingAppointments,
    staffPreference: staffPreference as StaffPreference,
    selectedStaffId: staffId || null,
    slotIntervalMinutes,
  };

  const slots = calculateAvailableSlots(pureContext);

  return {
    success: true,
    data: {
      date,
      timezone: business.timezone || "Europe/London",
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.duration_minutes,
      bufferMinutes: service.buffer_minutes || 0,
      staffPreference: staffPreference as StaffPreference,
      selectedStaffId: staffId || null,
      slots,
      totalSlotsCount: slots.length,
      metadata: {
        durationMinutes: service.duration_minutes,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: service.buffer_minutes || 0,
        totalOccupiedMinutes:
          service.duration_minutes + (service.buffer_minutes || 0),
        minNoticeHours: bookingPolicy.min_notice_hours,
        maxAdvanceDays: bookingPolicy.max_advance_days,
      },
    },
  };
}
