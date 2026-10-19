import { z } from "zod";

export const BUSINESS_CATEGORIES = [
  "salon",
  "barbershop",
  "spa",
  "trainer",
  "other",
] as const;

export const IANA_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Australia/Melbourne",
] as const;

/**
 * Validates whether a given string is a valid IANA timezone identifier.
 */
export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts "HH:MM" (or "HH:MM:SS") to integer minutes from midnight.
 */
export function timeStringToMinutes(time: string): number {
  const parts = time.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  return hours * 60 + minutes;
}

/**
 * Checks if any intervals in a day overlap.
 * Assumes valid start < end for each interval.
 */
export function hasOverlappingIntervals(
  intervals: { open_time: string | null; close_time: string | null }[]
): boolean {
  const validIntervals = intervals
    .filter((inv) => inv.open_time && inv.close_time)
    .map((inv) => ({
      start: timeStringToMinutes(inv.open_time!),
      end: timeStringToMinutes(inv.close_time!),
    }))
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < validIntervals.length - 1; i++) {
    const current = validIntervals[i]!;
    const next = validIntervals[i + 1]!;
    // If next interval starts before current ends -> overlap!
    if (next.start < current.end) {
      return true;
    }
  }

  return false;
}

// Regex for international phone numbers (e.g., +44 7911 123456, +1 555 123 4567, +92 300 1234567)
export const internationalPhoneRegex = /^\+?[1-9]\d{1,14}(?:[\s.-]?\d+)*$/;

export const createBusinessSchema = z.object({
  name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters")
    .trim(),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(60, "Slug must not exceed 60 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens (e.g., 'modern-cuts')"
    )
    .trim(),
  business_type: z.enum(BUSINESS_CATEGORIES, {
    message: "Please select a valid business category",
  }),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const businessProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters")
    .trim(),
  business_type: z.enum(BUSINESS_CATEGORIES, {
    message: "Please select a valid business category",
  }),
  description: z.string().max(1000, "Description must not exceed 1000 characters").optional().nullable(),
  logo_url: z.string().url("Logo must be a valid URL").optional().nullable().or(z.literal("")),
  phone: z
    .string()
    .refine(
      (val) => !val || internationalPhoneRegex.test(val.replace(/\s+/g, "")),
      "Please provide a valid international phone number including country code (e.g. +44 7911 123456)"
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string().email("Please provide a valid contact email").optional().nullable().or(z.literal("")),
  website: z
    .string()
    .url("Please provide a valid website URL (e.g. https://example.com)")
    .refine((val) => !val || /^https?:\/\//i.test(val), "Website must begin with http:// or https://")
    .optional()
    .nullable()
    .or(z.literal("")),
  address_line1: z.string().max(150, "Address line 1 must not exceed 150 characters").optional().nullable().or(z.literal("")),
  address_line2: z.string().max(150, "Address line 2 must not exceed 150 characters").optional().nullable().or(z.literal("")),
  city: z.string().max(100, "City must not exceed 100 characters").optional().nullable().or(z.literal("")),
  state_region: z.string().max(100, "State/region must not exceed 100 characters").optional().nullable().or(z.literal("")),
  postal_code: z.string().max(20, "Postal code must not exceed 20 characters").optional().nullable().or(z.literal("")),
  country: z.string().min(2, "Country code required").max(3, "Country code must be 2-3 characters").default("GB"),
  timezone: z.string().refine(isValidIanaTimezone, "Please select a valid IANA timezone identifier (e.g., Europe/London)"),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const openingHourIntervalSchema = z
  .object({
    id: z.string().uuid().optional(),
    day_of_week: z.number().int().min(0).max(6),
    is_closed: z.boolean(),
    open_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid time format (HH:MM)").nullable(),
    close_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid time format (HH:MM)").nullable(),
  })
  .refine(
    (data) => {
      if (data.is_closed) return true;
      if (!data.open_time || !data.close_time) return false;
      return timeStringToMinutes(data.open_time) < timeStringToMinutes(data.close_time);
    },
    {
      message: "Closing time must follow opening time",
      path: ["close_time"],
    }
  );

export const weeklyOpeningHoursSchema = z
  .array(openingHourIntervalSchema)
  .refine(
    (intervals) => {
      // Group by day_of_week and ensure no overlaps for active open intervals
      const byDay = new Map<number, typeof intervals>();
      for (const item of intervals) {
        if (!item.is_closed) {
          const list = byDay.get(item.day_of_week) || [];
          list.push(item);
          byDay.set(item.day_of_week, list);
        }
      }

      for (const dayIntervals of byDay.values()) {
        if (hasOverlappingIntervals(dayIntervals)) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Opening hours contain overlapping intervals on the same day",
    }
  );

export type OpeningHourIntervalInput = z.infer<typeof openingHourIntervalSchema>;

export const scheduleExceptionSchema = z
  .object({
    id: z.string().uuid().optional(),
    exception_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    is_closed: z.boolean(),
    open_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional().nullable(),
    close_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional().nullable(),
    reason: z.string().max(100, "Reason must not exceed 100 characters").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.is_closed) return true;
      if (!data.open_time || !data.close_time) return false;
      return timeStringToMinutes(data.open_time) < timeStringToMinutes(data.close_time);
    },
    {
      message: "Closing time must follow opening time for special opening hours",
      path: ["close_time"],
    }
  );

export type ScheduleExceptionInput = z.infer<typeof scheduleExceptionSchema>;

export const bookingPolicySchema = z.object({
  min_notice_hours: z
    .number()
    .int()
    .min(0, "Minimum notice cannot be negative")
    .max(720, "Minimum notice cannot exceed 720 hours (30 days)"),
  max_advance_days: z
    .number()
    .int()
    .min(1, "Booking window must be at least 1 day")
    .max(365, "Booking window cannot exceed 365 days"),
  cancellation_notice_hours: z
    .number()
    .int()
    .min(0, "Cancellation notice cannot be negative")
    .max(720, "Cancellation notice cannot exceed 720 hours"),
  default_buffer_minutes: z
    .number()
    .int()
    .min(0, "Buffer cannot be negative")
    .max(120, "Buffer cannot exceed 120 minutes"),
  online_booking_enabled: z.boolean().default(false),
  cancellation_policy_text: z
    .string()
    .max(1000, "Cancellation policy text must not exceed 1000 characters")
    .optional()
    .nullable(),
});

export type BookingPolicyInput = z.infer<typeof bookingPolicySchema>;

export const onboardingProgressSchema = z.object({
  current_step: z.number().int().min(1).max(5),
  completed_steps: z.array(z.number().int().min(1).max(5)),
  is_completed: z.boolean(),
});

export type OnboardingProgressInput = z.infer<typeof onboardingProgressSchema>;

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters")
    .trim(),
  avatar_url: z.string().url("Please provide a valid URL").optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
