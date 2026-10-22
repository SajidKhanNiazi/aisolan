"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getEnv } from "@/lib/env";
import { calculateAvailableSlots } from "@/features/availability/engine";
import type { PureCalculationContext, StaffPreference } from "@/features/availability/types";
import { DEFAULT_BOOKING_POLICY } from "@/features/organizations/constants";
import {
  publicSalonSlugSchema,
  publicAvailabilityQuerySchema,
  publicBookingInputSchema,
  managementTokenSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  type PublicAvailabilityQueryInput,
  type PublicBookingValidatedInput,
} from "./validation";
import {
  generateSecureToken,
  hashToken,
  formatBookingReference,
  buildManagementUrl,
} from "./tokens";
import { headers } from "next/headers";
import { enforcePublicBookingRateLimit } from "./rate-limit";
import type {
  PublicSalonProfile,
  PublicService,
  PublicStaff,
  PublicBusinessHours,
  PublicSlot,
  PublicAvailabilityData,
  PublicBookingOutcome,
  ManagedAppointmentDetails,
  SlotPeriod,
} from "./types";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Resolves the client IP address from Next.js request headers.
 * Safely falls back if executed in an environment without active HTTP headers (e.g., unit tests).
 */
async function resolveClientIp(overrideIp?: string): Promise<string> {
  if (overrideIp && overrideIp.trim().length > 0) {
    return overrideIp.trim();
  }
  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    if (forwarded) {
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
    const realIp = headersList.get("x-real-ip");
    if (realIp && realIp.trim().length > 0) {
      return realIp.trim();
    }
  } catch {
    // Expected when called outside of Next.js server request context
  }
  return "public-client";
}

/**
 * Loads sanitized, intentionally public salon profile for customer view.
 * Zero leak of private owner accounts, customer data, internal staff notes, or tenant IDs.
 */
export async function getPublicSalonProfile(
  slug: string
): Promise<ActionResult<PublicSalonProfile>> {
  const parsedSlug = publicSalonSlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return {
      success: false,
      error: "Invalid salon web address.",
      code: "INVALID_SLUG",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      error: "Service temporarily unavailable. Please try again.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  // 1. Fetch Business securely via RPC (least-privilege) or direct select fallback
  let business: {
    id: string;
    name: string;
    slug: string;
    business_type: string;
    description: string | null;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    postal_code: string | null;
    country: string;
    timezone: string;
    currency: string;
  } | null = null;

  const { data: rpcBiz } = await supabase.rpc(
    "get_public_salon_profile_by_slug",
    { p_slug: parsedSlug.data }
  );

  if (rpcBiz && rpcBiz.success && rpcBiz.data) {
    business = rpcBiz.data;
  } else {
    const { data: directBiz } = await supabase
      .from("businesses")
      .select(
        "id, name, slug, business_type, description, logo_url, phone, email, website, address_line1, address_line2, city, postal_code, country, timezone, currency"
      )
      .eq("slug", parsedSlug.data)
      .maybeSingle();
    business = directBiz;
  }

  if (!business) {
    return {
      success: false,
      error: "Salon not found. Please check the web address.",
      code: "SALON_NOT_FOUND",
    };
  }

  // 2. Fetch Policies, Opening Hours, Services, and Staff in parallel
  const [policiesRes, hoursRes, servicesRes, staffRes, staffServicesRes] =
    await Promise.all([
      supabase
        .from("business_booking_policies")
        .select(
          "online_booking_enabled, cancellation_policy_text, cancellation_notice_hours, min_notice_hours, max_advance_days"
        )
        .eq("business_id", business.id)
        .maybeSingle(),

      supabase
        .from("business_opening_hours")
        .select("day_of_week, is_closed, open_time, close_time")
        .eq("business_id", business.id)
        .order("day_of_week", { ascending: true }),

      supabase
        .from("services")
        .select(
          "id, name, description, price_amount, currency, duration_minutes, buffer_minutes, display_order"
        )
        .eq("business_id", business.id)
        .eq("is_active", true)
        .eq("is_archived", false)
        .order("display_order", { ascending: true }),

      supabase
        .from("staff_profiles")
        .select("id, display_name, display_order")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .eq("is_archived", false)
        .order("display_order", { ascending: true }),

      supabase
        .from("staff_services")
        .select("service_id, staff_id")
        .eq("business_id", business.id),
    ]);

  const policy = policiesRes.data;
  const onlineBookingEnabled = Boolean(policy?.online_booking_enabled);

  // Group staff assignments per service
  const serviceStaffMap = new Map<string, string[]>();
  (staffServicesRes.data || []).forEach((row) => {
    const list = serviceStaffMap.get(row.service_id) || [];
    list.push(row.staff_id);
    serviceStaffMap.set(row.service_id, list);
  });

  const publicServices: PublicService[] = (servicesRes.data || []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || null,
    priceAmount: Number(s.price_amount),
    currency: s.currency || business.currency || "GBP",
    durationMinutes: s.duration_minutes,
    bufferMinutes: s.buffer_minutes || 0,
    assignedStaffIds: serviceStaffMap.get(s.id) || [],
  }));

  const publicStaff: PublicStaff[] = (staffRes.data || []).map((st) => ({
    id: st.id,
    displayName: st.display_name,
    displayOrder: st.display_order ?? 0,
  }));

  const publicHours: PublicBusinessHours[] = (hoursRes.data || []).map((h) => ({
    dayOfWeek: h.day_of_week,
    isClosed: h.is_closed,
    openTime: h.open_time,
    closeTime: h.close_time,
  }));

  return {
    success: true,
    data: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      businessType: business.business_type || "salon",
      description: business.description || null,
      logoUrl: business.logo_url || null,
      phone: business.phone || null,
      email: business.email || null,
      website: business.website || null,
      addressLine1: business.address_line1 || null,
      addressLine2: business.address_line2 || null,
      city: business.city || null,
      postalCode: business.postal_code || null,
      country: business.country || "GB",
      timezone: business.timezone || "Europe/London",
      currency: business.currency || "GBP",
      onlineBookingEnabled,
      cancellationPolicyText: policy?.cancellation_policy_text || null,
      cancellationNoticeHours:
        policy?.cancellation_notice_hours ??
        DEFAULT_BOOKING_POLICY.cancellation_notice_hours,
      minNoticeHours:
        policy?.min_notice_hours ?? DEFAULT_BOOKING_POLICY.min_notice_hours,
      maxAdvanceDays:
        policy?.max_advance_days ?? DEFAULT_BOOKING_POLICY.max_advance_days,
      openingHours: publicHours,
      services: publicServices,
      staff: publicStaff,
    },
  };
}

/**
 * Computes live appointment availability for public customer booking.
 * Fully integrates Phase 1E-B capacity engine (shifts, breaks, closures, time off, existing appointments).
 * Sanitizes outcome: zero leakage of customer identities or appointment records.
 */
export async function getPublicAppointmentAvailability(
  input: PublicAvailabilityQueryInput,
  clientIp?: string
): Promise<ActionResult<PublicAvailabilityData>> {
  const parsed = publicAvailabilityQuerySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid availability parameters.",
      code: "VALIDATION_ERROR",
    };
  }

  const { businessSlug, serviceId, staffId, staffPreference, date } = parsed.data;

  // Rate limit check
  const resolvedIp = await resolveClientIp(clientIp);
  const rateCheck = await enforcePublicBookingRateLimit({
    identifier: resolvedIp,
    businessSlug,
    action: "availability",
  });
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.reason,
      code: "RATE_LIMITED",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      error: "Service unavailable.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  // 1. Resolve Business via RPC or direct fallback
  let business: { id: string; name: string; slug: string; timezone: string; currency: string } | null = null;
  const { data: rpcBiz } = await supabase.rpc(
    "get_public_salon_profile_by_slug",
    { p_slug: businessSlug }
  );

  if (rpcBiz && rpcBiz.success && rpcBiz.data) {
    business = rpcBiz.data;
  } else {
    const { data: directBiz } = await supabase
      .from("businesses")
      .select("id, name, slug, timezone, currency")
      .eq("slug", businessSlug)
      .maybeSingle();
    business = directBiz;
  }

  if (!business) {
    return {
      success: false,
      error: "Salon not found.",
      code: "BUSINESS_NOT_FOUND",
    };
  }

  const timezone = business.timezone || "Europe/London";

  // 2. Load Booking Policy
  const { data: policy } = await supabase
    .from("business_booking_policies")
    .select("min_notice_hours, max_advance_days, online_booking_enabled")
    .eq("business_id", business.id)
    .maybeSingle();

  const onlineBookingEnabled = Boolean(policy?.online_booking_enabled);
  if (!onlineBookingEnabled) {
    return {
      success: true,
      data: {
        date,
        timezone,
        serviceId,
        serviceName: "",
        durationMinutes: 0,
        bufferMinutes: 0,
        staffPreference,
        selectedStaffId: staffId || null,
        slots: [],
        totalSlotsCount: 0,
        onlineBookingEnabled: false,
      },
    };
  }

  const bookingPolicy = {
    min_notice_hours: policy?.min_notice_hours ?? DEFAULT_BOOKING_POLICY.min_notice_hours,
    max_advance_days: policy?.max_advance_days ?? DEFAULT_BOOKING_POLICY.max_advance_days,
    online_booking_enabled: true,
  };

  // 3. Load Service
  const { data: service, error: srvError } = await supabase
    .from("services")
    .select("id, name, duration_minutes, buffer_minutes, is_active, is_archived")
    .eq("id", serviceId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (srvError || !service || service.is_archived || !service.is_active) {
    return {
      success: false,
      error: "Service is currently not available for booking.",
      code: "SERVICE_UNAVAILABLE",
    };
  }

  // 4. Load Eligible Staff assigned to service
  const { data: staffServices } = await supabase
    .from("staff_services")
    .select("staff_id, staff_profiles(id, display_name, is_active, is_archived, display_order)")
    .eq("business_id", business.id)
    .eq("service_id", service.id);

  interface StaffProfileRow {
    id: string;
    display_name: string;
    is_active: boolean;
    is_archived: boolean;
    display_order: number;
  }

  const eligibleStaff = (staffServices || [])
    .map((row) => (row as unknown as { staff_profiles: StaffProfileRow | null }).staff_profiles)
    .filter(
      (s): s is StaffProfileRow => Boolean(s && s.is_active && !s.is_archived)
    );

  if (eligibleStaff.length === 0) {
    return {
      success: true,
      data: {
        date,
        timezone,
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.duration_minutes,
        bufferMinutes: service.buffer_minutes || 0,
        staffPreference,
        selectedStaffId: staffId || null,
        slots: [],
        totalSlotsCount: 0,
        onlineBookingEnabled: true,
      },
    };
  }

  if (staffPreference === "specific" && staffId) {
    const isEligible = eligibleStaff.some((st) => st.id === staffId);
    if (!isEligible) {
      return {
        success: false,
        error: "Selected staff member is not eligible for this service.",
        code: "STAFF_NOT_ELIGIBLE",
      };
    }
  }

  const eligibleStaffIds = eligibleStaff.map((s) => s.id);

  // 5. Query batch schedules, exceptions, working hours, breaks, time off, and existing appointments
  const [
    openingHoursRes,
    exceptionsRes,
    workingHoursRes,
    breaksRes,
    timeOffRes,
    appointmentsRes,
  ] = await Promise.all([
    supabase
      .from("business_opening_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", business.id),

    supabase
      .from("business_schedule_exceptions")
      .select("exception_date, is_closed, open_time, close_time, reason")
      .eq("business_id", business.id)
      .eq("exception_date", date),

    supabase
      .from("staff_working_hours")
      .select("staff_id, day_of_week, is_working, open_time, close_time")
      .eq("business_id", business.id)
      .in("staff_id", eligibleStaffIds),

    supabase
      .from("staff_breaks")
      .select("staff_id, day_of_week, break_title, start_time, end_time")
      .eq("business_id", business.id)
      .in("staff_id", eligibleStaffIds),

    supabase
      .from("staff_time_off")
      .select("staff_id, start_date, end_date, is_full_day, start_time, end_time")
      .eq("business_id", business.id)
      .in("staff_id", eligibleStaffIds)
      .lte("start_date", date)
      .gte("end_date", date),

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

  // 6. Execute pure calculation engine
  const pureContext: PureCalculationContext = {
    date,
    timezone,
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
    businessOpeningHours: openingHoursRes.data || [],
    businessExceptions: exceptionsRes.data || [],
    staffWorkingHours: workingHoursRes.data || [],
    staffBreaks: breaksRes.data || [],
    staffTimeOff: timeOffRes.data || [],
    existingAppointments: appointmentsRes.data || [],
    staffPreference: staffPreference as StaffPreference,
    selectedStaffId: staffId || null,
    slotIntervalMinutes: 15,
  };

  const calculatedSlots = calculateAvailableSlots(pureContext);

  // Group into sanitized PublicSlot
  const publicSlots: PublicSlot[] = calculatedSlots.map((s) => {
    // Parse hour in business timezone to categorize period
    const startObj = new Date(s.startsAt);
    const localTimeStr = startObj.toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const hour = Number.parseInt(localTimeStr.split(":")[0], 10);

    let period: SlotPeriod = "morning";
    if (hour >= 12 && hour < 17) {
      period = "afternoon";
    } else if (hour >= 17) {
      period = "evening";
    }

    return {
      startsAt: s.startsAt,
      serviceEndsAt: s.serviceEndsAt,
      availableStaffIds: s.availableStaffIds,
      localTime: localTimeStr,
      period,
    };
  });

  return {
    success: true,
    data: {
      date,
      timezone,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.duration_minutes,
      bufferMinutes: service.buffer_minutes || 0,
      staffPreference,
      selectedStaffId: staffId || null,
      slots: publicSlots,
      totalSlotsCount: publicSlots.length,
      onlineBookingEnabled: true,
    },
  };
}

/**
 * Commits a public customer appointment atomically via create_public_appointment_atomic.
 * Protects against race conditions, duplicate clicks, and double-booking.
 */
export async function createPublicBooking(
  input: PublicBookingValidatedInput,
  clientIp?: string
): Promise<ActionResult<PublicBookingOutcome>> {
  const parsed = publicBookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid booking details.",
      code: "VALIDATION_ERROR",
    };
  }

  const {
    businessSlug,
    serviceId,
    staffId,
    startsAt,
    customerName,
    customerEmail,
    customerPhone,
    customerNotes,
    idempotencyKey,
  } = parsed.data;

  // Rate limit guard
  const resolvedIp = await resolveClientIp(clientIp);
  const rateCheck = await enforcePublicBookingRateLimit({
    identifier: resolvedIp,
    businessSlug,
    action: "booking",
  });
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.reason,
      code: "RATE_LIMITED",
    };
  }

  const serviceClient = createServiceClient();
  const supabase = serviceClient || (await createClient());
  if (!supabase) {
    return {
      success: false,
      error: "Booking service is temporarily unavailable. Please try again shortly.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  if (process.env.NODE_ENV === "production" && !serviceClient) {
    return {
      success: false,
      error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for public booking.",
      code: "SERVER_CONFIGURATION_REQUIRED",
    };
  }

  // Generate cryptographically secure management token
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);

  const env = getEnv();
  const baseUrl = env.appUrl || "http://localhost:3000";

  // Invoke atomic public RPC
  const { data: rpcRes, error: rpcError } = await supabase.rpc(
    "create_public_appointment_atomic",
    {
      p_business_slug: businessSlug,
      p_service_id: serviceId,
      p_staff_id: staffId || null,
      p_starts_at: startsAt,
      p_customer_name: customerName,
      p_customer_email: customerEmail || null,
      p_customer_phone: customerPhone || null,
      p_customer_notes: customerNotes || null,
      p_idempotency_key: idempotencyKey || null,
      p_token_hash: tokenHash,
    }
  );

  if (rpcError) {
    console.error("[createPublicBooking] RPC invocation error:", rpcError);
    return {
      success: false,
      error: "Unable to confirm booking due to a server error. Please try again.",
      code: "RPC_ERROR",
    };
  }

  if (!rpcRes || !rpcRes.success) {
    return {
      success: false,
      error: rpcRes?.message || "Appointment could not be booked.",
      code: rpcRes?.code || "BOOKING_FAILED",
    };
  }

  const aptData = rpcRes.data;
  const bookingReference =
    aptData.booking_reference || formatBookingReference(aptData.appointment_id);
  const managementUrl = buildManagementUrl(baseUrl, rawToken);

  return {
    success: true,
    data: {
      appointmentId: aptData.appointment_id,
      bookingReference,
      businessId: aptData.business_id,
      businessName: aptData.business_name,
      businessSlug: aptData.business_slug,
      serviceId: aptData.service_id,
      serviceName: aptData.service_name,
      staffId: aptData.staff_id,
      staffName: aptData.staff_name,
      startsAt: aptData.starts_at,
      serviceEndsAt: aptData.service_ends_at,
      priceAmount: Number(aptData.price_amount),
      currency: aptData.currency,
      status: aptData.status,
      managementToken: rawToken,
      managementUrl,
      isIdempotentReplay: Boolean(rpcRes.is_idempotent_replay),
    },
  };
}

/**
 * Loads appointment details for customer self-service via cryptographically verified token.
 */
export async function getAppointmentByToken(
  token: string,
  clientIp?: string
): Promise<ActionResult<ManagedAppointmentDetails>> {
  const parsed = managementTokenSchema.safeParse(token);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid or malformed booking management link.",
      code: "INVALID_TOKEN",
    };
  }

  // Rate limit guard on token lookup
  const resolvedIp = await resolveClientIp(clientIp);
  const rateCheck = await enforcePublicBookingRateLimit({
    identifier: `${resolvedIp}:${parsed.data.substring(0, 16)}`,
    businessSlug: "",
    action: "management",
  });
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.reason,
      code: "RATE_LIMITED",
    };
  }

  const tokenHash = hashToken(parsed.data);

  const serviceClient = createServiceClient();
  const supabase = serviceClient || (await createClient());
  if (!supabase) {
    return {
      success: false,
      error: "Database service unavailable.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  const { data: rpcRes, error: rpcError } = await supabase.rpc(
    "get_appointment_by_management_token",
    {
      p_token_hash: tokenHash,
    }
  );

  if (rpcError) {
    console.error("[getAppointmentByToken] RPC error:", rpcError);
    return {
      success: false,
      error: "Unable to retrieve appointment details.",
      code: "RPC_ERROR",
    };
  }

  if (!rpcRes || !rpcRes.success) {
    return {
      success: false,
      error: rpcRes?.message || "Appointment not found or management link expired.",
      code: rpcRes?.code || "NOT_FOUND",
    };
  }

  const item = rpcRes.data;
  return {
    success: true,
    data: {
      appointmentId: item.appointment_id,
      bookingReference: item.booking_reference,
      status: item.status,
      startsAt: item.starts_at,
      serviceEndsAt: item.service_ends_at,
      priceAmount: Number(item.price_amount),
      currency: item.currency,
      serviceName: item.service_name,
      serviceId: item.service_id,
      staffName: item.staff_name,
      staffId: item.staff_id,
      customerNotes: item.customer_notes || null,
      business: item.business,
      policy: item.policy,
      permissions: item.permissions,
    },
  };
}

/**
 * Cancels customer appointment self-service via token, atomically releasing capacity.
 */
export async function cancelAppointmentByToken(
  token: string,
  cancellationReason?: string,
  clientIp?: string
): Promise<ActionResult<{ appointmentId: string; status: string }>> {
  const parsed = cancelBookingSchema.safeParse({
    token,
    cancellationReason,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid cancellation request.",
      code: "VALIDATION_ERROR",
    };
  }

  // Rate limit guard on cancellation
  const resolvedIp = await resolveClientIp(clientIp);
  const rateCheck = await enforcePublicBookingRateLimit({
    identifier: `${resolvedIp}:${parsed.data.token.substring(0, 16)}`,
    businessSlug: "",
    action: "management",
  });
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.reason,
      code: "RATE_LIMITED",
    };
  }

  const tokenHash = hashToken(parsed.data.token);

  const serviceClient = createServiceClient();
  const supabase = serviceClient || (await createClient());
  if (!supabase) {
    return {
      success: false,
      error: "Database service unavailable.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  const { data: rpcRes, error: rpcError } = await supabase.rpc(
    "cancel_appointment_by_management_token",
    {
      p_token_hash: tokenHash,
      p_cancellation_reason: parsed.data.cancellationReason || null,
    }
  );

  if (rpcError) {
    console.error("[cancelAppointmentByToken] RPC error:", rpcError);
    return {
      success: false,
      error: "Unable to cancel appointment. Please contact the salon directly.",
      code: "RPC_ERROR",
    };
  }

  if (!rpcRes || !rpcRes.success) {
    return {
      success: false,
      error: rpcRes?.message || "Cancellation could not be completed.",
      code: rpcRes?.code || "CANCEL_FAILED",
    };
  }

  return {
    success: true,
    data: rpcRes.data,
  };
}

/**
 * Reschedules customer appointment self-service via token, atomically releasing old slot and reserving new slot.
 */
export async function rescheduleAppointmentByToken(
  token: string,
  newStartsAt: string,
  newStaffId?: string | null,
  clientIp?: string
): Promise<ActionResult<{ appointmentId: string; startsAt: string; staffName: string }>> {
  const parsed = rescheduleBookingSchema.safeParse({
    token,
    newStartsAt,
    newStaffId,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid reschedule parameters.",
      code: "VALIDATION_ERROR",
    };
  }

  // Rate limit guard on reschedule
  const resolvedIp = await resolveClientIp(clientIp);
  const rateCheck = await enforcePublicBookingRateLimit({
    identifier: `${resolvedIp}:${parsed.data.token.substring(0, 16)}`,
    businessSlug: "",
    action: "management",
  });
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.reason,
      code: "RATE_LIMITED",
    };
  }

  const tokenHash = hashToken(parsed.data.token);

  const serviceClient = createServiceClient();
  const supabase = serviceClient || (await createClient());
  if (!supabase) {
    return {
      success: false,
      error: "Database service unavailable.",
      code: "DATABASE_UNAVAILABLE",
    };
  }

  const { data: rpcRes, error: rpcError } = await supabase.rpc(
    "reschedule_appointment_by_management_token",
    {
      p_token_hash: tokenHash,
      p_new_starts_at: parsed.data.newStartsAt,
      p_new_staff_id: parsed.data.newStaffId || null,
    }
  );

  if (rpcError) {
    console.error("[rescheduleAppointmentByToken] RPC error:", rpcError);
    return {
      success: false,
      error: "Unable to reschedule appointment. Please try again.",
      code: "RPC_ERROR",
    };
  }

  if (!rpcRes || !rpcRes.success) {
    return {
      success: false,
      error: rpcRes?.message || "Rescheduling could not be completed.",
      code: rpcRes?.code || "RESCHEDULE_FAILED",
    };
  }

  return {
    success: true,
    data: rpcRes.data,
  };
}
