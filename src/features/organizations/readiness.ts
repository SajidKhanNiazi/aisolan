"use server";

/**
 * Bookzello — Universal Salon Booking Readiness Engine (D24 / Phase B)
 *
 * Audits any business workspace for appointment booking readiness:
 * - Valid timezone (IANA)
 * - Operating hours configured and open
 * - Active services with valid price, duration, and turnaround buffers
 * - Explicit qualified staff assigned to each active service (staff_services)
 * - Assigned staff have active working hours coinciding with open hours
 * - Booking policy online toggle status
 *
 * Deterministic status outcomes:
 * - 'ready': All criteria satisfied, appointments can be booked.
 * - 'partially_ready': Core setup present, but some services have zero qualified staff or staff have missing shifts.
 * - 'setup_required': Salon is closed, has no services, no staff, or cannot accept any appointments.
 *
 * Zero salon-specific or test-fixture hardcoding.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_BOOKING_POLICY } from "@/features/organizations/constants";

export type BookingReadinessStatus = "ready" | "partially_ready" | "setup_required";

export type ReadinessIssueCode =
  | "TIMEZONE_INVALID"
  | "OPENING_HOURS_MISSING"
  | "SALON_PERMANENTLY_CLOSED"
  | "NO_ACTIVE_SERVICES"
  | "INVALID_SERVICE_CONFIG"
  | "NO_ACTIVE_STAFF"
  | "SERVICES_WITHOUT_STAFF"
  | "STAFF_WITHOUT_WORKING_HOURS"
  | "ONLINE_BOOKING_DISABLED";

export interface BookingReadinessIssue {
  code: ReadinessIssueCode;
  severity: "blocker" | "warning";
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  affectedItemIds?: string[];
  affectedItemNames?: string[];
}

export interface UnbookableServiceDetail {
  id: string;
  name: string;
  reason: string;
}

export interface BookingReadinessReport {
  status: BookingReadinessStatus;
  isReady: boolean;
  scorePercent: number; // 0 to 100
  businessId: string;
  businessSlug: string;
  businessName: string;
  summary: string;
  stats: {
    totalServices: number;
    activeServices: number;
    bookableServices: number;
    unbookableServices: number;
    totalStaff: number;
    activeStaff: number;
    staffWithSchedules: number;
    openDaysCount: number;
    onlineBookingEnabled: boolean;
    timezone: string;
  };
  unbookableServices: UnbookableServiceDetail[];
  issues: BookingReadinessIssue[];
  recommendations: string[];
  lastCheckedAt: string;
}

/**
 * Validates an IANA timezone identifier safely.
 */
export async function isValidTimezone(tz?: string | null): Promise<boolean> {
  if (!tz || typeof tz !== "string" || tz.trim().length === 0) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Performs a comprehensive, tenant-isolated booking readiness audit for a business.
 */
export async function getBusinessBookingReadiness(
  businessSlugOrId: string,
  options?: { useServiceClient?: boolean }
): Promise<BookingReadinessReport | null> {
  const supabase = options?.useServiceClient
    ? createServiceClient()
    : await createClient();

  if (!supabase) return null;

  // 1. Resolve business
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    businessSlugOrId
  );
  let bizQuery = supabase
    .from("businesses")
    .select("id, name, slug, timezone, currency, country");

  if (isUuid) {
    bizQuery = bizQuery.eq("id", businessSlugOrId);
  } else {
    bizQuery = bizQuery.eq("slug", businessSlugOrId);
  }

  const { data: business, error: bizError } = await bizQuery.maybeSingle();
  if (bizError || !business) {
    return null;
  }

  const businessId = business.id;
  const businessSlug = business.slug;
  const businessName = business.name;

  // 2. Fetch parallel configuration data
  const [
    hoursRes,
    policyRes,
    servicesRes,
    staffRes,
    staffServicesRes,
    workingHoursRes,
  ] = await Promise.all([
    supabase
      .from("business_opening_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", businessId)
      .order("day_of_week", { ascending: true }),

    supabase
      .from("business_booking_policies")
      .select("online_booking_enabled, min_notice_hours, max_advance_days")
      .eq("business_id", businessId)
      .maybeSingle(),

    supabase
      .from("services")
      .select("id, name, duration_minutes, buffer_minutes, price_amount, is_active, is_archived")
      .eq("business_id", businessId)
      .eq("is_archived", false)
      .order("display_order", { ascending: true }),

    supabase
      .from("staff_profiles")
      .select("id, display_name, is_active, is_archived")
      .eq("business_id", businessId)
      .eq("is_archived", false)
      .order("display_order", { ascending: true }),

    supabase
      .from("staff_services")
      .select("staff_id, service_id")
      .eq("business_id", businessId),

    supabase
      .from("staff_working_hours")
      .select("staff_id, day_of_week, is_working, open_time, close_time")
      .eq("business_id", businessId),
  ]);

  const openingHours = hoursRes.data || [];
  const policy = policyRes.data;
  const services = servicesRes.data || [];
  const staff = staffRes.data || [];
  const staffServices = staffServicesRes.data || [];
  const staffWorkingHours = workingHoursRes.data || [];

  const issues: BookingReadinessIssue[] = [];
  const recommendations: string[] = [];

  // --- Audit Check 1: Timezone ---
  const timezone = business.timezone || "Europe/London";
  const timezoneValid = await isValidTimezone(timezone);
  if (!timezoneValid) {
    issues.push({
      code: "TIMEZONE_INVALID",
      severity: "blocker",
      title: "Invalid Business Timezone",
      message: `The configured timezone "${timezone}" is not a valid IANA identifier.`,
      actionUrl: `/dashboard/${businessSlug}/settings`,
      actionLabel: "Configure Timezone",
    });
    recommendations.push("Update your business timezone to a valid IANA region (e.g. 'Europe/London').");
  }

  // --- Audit Check 2: Opening Hours ---
  const openDays = openingHours.filter(
    (h) => !h.is_closed && h.open_time && h.close_time && h.open_time < h.close_time
  );
  const openDaysCount = openDays.length;

  if (openingHours.length === 0) {
    issues.push({
      code: "OPENING_HOURS_MISSING",
      severity: "blocker",
      title: "Opening Hours Not Configured",
      message: "Weekly business opening hours have not been configured.",
      actionUrl: `/dashboard/${businessSlug}/settings`,
      actionLabel: "Set Opening Hours",
    });
    recommendations.push("Define weekly business hours so the booking engine knows when appointments can take place.");
  } else if (openDaysCount === 0) {
    issues.push({
      code: "SALON_PERMANENTLY_CLOSED",
      severity: "blocker",
      title: "All Days Marked Closed",
      message: "All 7 days of the week are marked as closed.",
      actionUrl: `/dashboard/${businessSlug}/settings`,
      actionLabel: "Open Business Schedule",
    });
    recommendations.push("Mark at least one day open in your weekly schedule.");
  }

  // --- Audit Check 3: Services & Invariants ---
  const activeServices = services.filter((s) => s.is_active);
  const invalidServices = activeServices.filter(
    (s) => Number(s.duration_minutes) < 5 || Number(s.price_amount) < 0 || Number(s.buffer_minutes || 0) < 0
  );

  if (activeServices.length === 0) {
    issues.push({
      code: "NO_ACTIVE_SERVICES",
      severity: "blocker",
      title: "No Active Services",
      message: "You do not have any active bookable services published.",
      actionUrl: `/dashboard/${businessSlug}/services`,
      actionLabel: "Add Services",
    });
    recommendations.push("Create at least one service (e.g., haircut, styling, treatment) with a valid duration and price.");
  } else if (invalidServices.length > 0) {
    issues.push({
      code: "INVALID_SERVICE_CONFIG",
      severity: "blocker",
      title: "Invalid Service Parameters",
      message: `${invalidServices.length} active service(s) have a duration under 5 minutes or negative prices.`,
      actionUrl: `/dashboard/${businessSlug}/services`,
      actionLabel: "Fix Services",
      affectedItemIds: invalidServices.map((s) => s.id),
      affectedItemNames: invalidServices.map((s) => s.name),
    });
    recommendations.push("Ensure all active services have a duration of at least 5 minutes.");
  }

  // --- Audit Check 4: Staff Profiles ---
  const activeStaff = staff.filter((st) => st.is_active);
  const activeStaffIds = new Set(activeStaff.map((st) => st.id));

  if (activeStaff.length === 0) {
    issues.push({
      code: "NO_ACTIVE_STAFF",
      severity: "blocker",
      title: "No Active Professionals",
      message: "No active staff or specialists exist in your salon.",
      actionUrl: `/dashboard/${businessSlug}/staff`,
      actionLabel: "Add Professionals",
    });
    recommendations.push("Add at least one active staff member or use the Solo Operator setup.");
  }

  // --- Audit Check 5: Service Eligibility (staff_services) ---
  // Group active assigned staff per service
  const serviceAssignedStaffMap = new Map<string, string[]>();
  for (const row of staffServices) {
    if (activeStaffIds.has(row.staff_id)) {
      const list = serviceAssignedStaffMap.get(row.service_id) || [];
      list.push(row.staff_id);
      serviceAssignedStaffMap.set(row.service_id, list);
    }
  }

  // Map staff schedules: which staff have working shifts coinciding with salon open days
  const openDayIndices = new Set(openDays.map((h) => h.day_of_week));
  const staffWorkingDayMap = new Map<string, number[]>();
  for (const swh of staffWorkingHours) {
    if (
      swh.is_working &&
      swh.open_time &&
      swh.close_time &&
      swh.open_time < swh.close_time &&
      openDayIndices.has(swh.day_of_week)
    ) {
      const days = staffWorkingDayMap.get(swh.staff_id) || [];
      days.push(swh.day_of_week);
      staffWorkingDayMap.set(swh.staff_id, days);
    }
  }

  const staffWithSchedulesCount = activeStaff.filter(
    (st) => (staffWorkingDayMap.get(st.id) || []).length > 0
  ).length;

  if (activeStaff.length > 0 && staffWithSchedulesCount === 0) {
    issues.push({
      code: "STAFF_WITHOUT_WORKING_HOURS",
      severity: "blocker",
      title: "No Scheduled Staff Shifts",
      message: "None of your active professionals have scheduled working hours during open salon days.",
      actionUrl: `/dashboard/${businessSlug}/staff`,
      actionLabel: "Set Working Hours",
      affectedItemIds: activeStaff.map((st) => st.id),
      affectedItemNames: activeStaff.map((st) => st.display_name),
    });
    recommendations.push("Assign weekly working shifts to your staff members so the engine can generate appointment slots.");
  }

  // Analyze bookability per active service
  const unbookableServices: UnbookableServiceDetail[] = [];
  let bookableServicesCount = 0;

  for (const srv of activeServices) {
    const assignedStaff = serviceAssignedStaffMap.get(srv.id) || [];
    if (assignedStaff.length === 0) {
      unbookableServices.push({
        id: srv.id,
        name: srv.name,
        reason: "No qualified professional is assigned to perform this service.",
      });
    } else {
      // Check if at least one assigned staff member actually has working hours on an open day
      const hasWorkingStaff = assignedStaff.some(
        (staffId) => (staffWorkingDayMap.get(staffId) || []).length > 0
      );
      if (!hasWorkingStaff) {
        unbookableServices.push({
          id: srv.id,
          name: srv.name,
          reason: "Assigned professionals have no working shifts scheduled during salon open hours.",
        });
      } else {
        bookableServicesCount++;
      }
    }
  }

  if (unbookableServices.length > 0) {
    const isAllUnbookable = bookableServicesCount === 0 && activeServices.length > 0;
    issues.push({
      code: "SERVICES_WITHOUT_STAFF",
      severity: isAllUnbookable ? "blocker" : "warning",
      title: `${unbookableServices.length} Service(s) Missing Qualified Professionals`,
      message: `${unbookableServices.length} active service(s) cannot accept bookings because no qualified professional with scheduled shifts is assigned.`,
      actionUrl: `/dashboard/${businessSlug}/services`,
      actionLabel: "Assign Professionals",
      affectedItemIds: unbookableServices.map((u) => u.id),
      affectedItemNames: unbookableServices.map((u) => u.name),
    });
    recommendations.push(
      `Assign qualified professionals to ${unbookableServices.map((s) => `"${s.name}"`).join(", ")}.`
    );
  }

  // --- Audit Check 6: Online Booking Toggle ---
  const onlineBookingEnabled = Boolean(
    policy?.online_booking_enabled ?? DEFAULT_BOOKING_POLICY.online_booking_enabled
  );

  if (!onlineBookingEnabled) {
    issues.push({
      code: "ONLINE_BOOKING_DISABLED",
      severity: "warning",
      title: "Online Booking Paused",
      message: "Online self-service booking is currently toggled off in settings.",
      actionUrl: `/dashboard/${businessSlug}/settings`,
      actionLabel: "Enable Online Booking",
    });
    recommendations.push("Enable online booking in Policies once you are ready to publish.");
  }

  // --- Status Determination ---
  const blockers = issues.filter((i) => i.severity === "blocker");
  let status: BookingReadinessStatus = "ready";
  let summary = "Your salon is fully configured and ready to accept customer appointments.";

  if (blockers.length > 0 || bookableServicesCount === 0) {
    status = "setup_required";
    if (activeServices.length === 0) {
      summary = "Setup required: Add at least one active service to begin accepting appointments.";
    } else if (activeStaff.length === 0) {
      summary = "Setup required: Add a professional or enable Solo Operator mode.";
    } else if (openDaysCount === 0) {
      summary = "Setup required: Configure opening hours for your business.";
    } else if (bookableServicesCount === 0) {
      summary = "Setup required: Assign qualified professionals to your services.";
    } else {
      summary = "Setup required: Resolve configuration blockers before appointments can be scheduled.";
    }
  } else if (unbookableServices.length > 0 || !onlineBookingEnabled) {
    status = "partially_ready";
    if (unbookableServices.length > 0 && !onlineBookingEnabled) {
      summary = `${bookableServicesCount} service(s) ready, but ${unbookableServices.length} service(s) need staff, and online booking is paused.`;
    } else if (unbookableServices.length > 0) {
      summary = `${unbookableServices.length} service(s) cannot be booked because no qualified professional is assigned.`;
    } else {
      summary = "All services are configured, but online booking is currently paused.";
    }
  }

  // Calculate readiness score percentage (out of 100)
  let score = 100;
  if (!timezoneValid) score -= 20;
  if (openDaysCount === 0) score -= 25;
  if (activeServices.length === 0) score -= 25;
  if (activeStaff.length === 0) score -= 20;
  if (activeStaff.length > 0 && staffWithSchedulesCount === 0) score -= 15;
  if (activeServices.length > 0 && unbookableServices.length > 0) {
    const unbookableRatio = unbookableServices.length / activeServices.length;
    score -= Math.round(unbookableRatio * 20);
  }
  if (!onlineBookingEnabled) score -= 5;
  const scorePercent = Math.max(0, Math.min(100, score));

  return {
    status,
    isReady: status === "ready",
    scorePercent,
    businessId,
    businessSlug,
    businessName,
    summary,
    stats: {
      totalServices: services.length,
      activeServices: activeServices.length,
      bookableServices: bookableServicesCount,
      unbookableServices: unbookableServices.length,
      totalStaff: staff.length,
      activeStaff: activeStaff.length,
      staffWithSchedules: staffWithSchedulesCount,
      openDaysCount,
      onlineBookingEnabled,
      timezone,
    },
    unbookableServices,
    issues,
    recommendations,
    lastCheckedAt: new Date().toISOString(),
  };
}
