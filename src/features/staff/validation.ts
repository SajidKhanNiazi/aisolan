import { z } from "zod";
import { internationalPhoneRegex, timeStringToMinutes } from "../organizations/validation";

export const staffProfileSchema = z.object({
  display_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  professional_title: z
    .string()
    .max(100, "Title cannot exceed 100 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  bio: z
    .string()
    .max(500, "Bio cannot exceed 500 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  contact_email: z
    .string()
    .email("Please provide a valid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  contact_phone: z
    .string()
    .refine(
      (val) => !val || internationalPhoneRegex.test(val.replace(/\s+/g, "")),
      "Please provide a valid international phone number"
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  is_active: z.boolean().default(true),
});

export type StaffProfileInput = z.infer<typeof staffProfileSchema>;

/**
 * Normalizes time strings from Postgres "HH:MM:SS" or standard "HH:MM" to "HH:MM".
 * Returns null if input is empty or invalid.
 */
export function normalizeTimeHHMM(time: string | null | undefined): string | null {
  if (!time || typeof time !== "string") return null;
  const trimmed = time.trim();
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const staffWorkingHourIntervalSchema = z
  .object({
    id: z.string().uuid().optional(),
    day_of_week: z.number().int().min(0).max(6),
    is_working: z.boolean(),
    open_time: z
      .string()
      .regex(timeRegex, "Invalid time format (HH:MM or HH:MM:SS)")
      .transform((val) => normalizeTimeHHMM(val))
      .nullable(),
    close_time: z
      .string()
      .regex(timeRegex, "Invalid time format (HH:MM or HH:MM:SS)")
      .transform((val) => normalizeTimeHHMM(val))
      .nullable(),
  })
  .refine(
    (data) => {
      if (!data.is_working) return true;
      if (!data.open_time || !data.close_time) return false;
      return timeStringToMinutes(data.open_time) < timeStringToMinutes(data.close_time);
    },
    {
      message: "Shift end time must be after start time",
      path: ["close_time"],
    }
  );

export type StaffWorkingHourIntervalInput = z.infer<typeof staffWorkingHourIntervalSchema>;

export const staffWeeklyScheduleSchema = z.array(staffWorkingHourIntervalSchema);

export const staffBreakSchema = z
  .object({
    id: z.string().uuid().optional(),
    day_of_week: z.number().int().min(0).max(6),
    break_title: z
      .string()
      .min(2, "Break label must be at least 2 characters")
      .max(60, "Break label cannot exceed 60 characters")
      .trim(),
    start_time: z
      .string()
      .regex(timeRegex, "Invalid time format (HH:MM or HH:MM:SS)")
      .transform((val) => normalizeTimeHHMM(val) as string),
    end_time: z
      .string()
      .regex(timeRegex, "Invalid time format (HH:MM or HH:MM:SS)")
      .transform((val) => normalizeTimeHHMM(val) as string),
  })
  .refine(
    (data) => timeStringToMinutes(data.start_time) < timeStringToMinutes(data.end_time),
    {
      message: "Break end time must be after start time",
      path: ["end_time"],
    }
  );

export type StaffBreakInput = z.infer<typeof staffBreakSchema>;

export const staffTimeOffSchema = z
  .object({
    id: z.string().uuid().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    is_full_day: z.boolean().default(true),
    start_time: z
      .string()
      .regex(timeRegex, "Invalid time format")
      .transform((val) => normalizeTimeHHMM(val))
      .optional()
      .nullable(),
    end_time: z
      .string()
      .regex(timeRegex, "Invalid time format")
      .transform((val) => normalizeTimeHHMM(val))
      .optional()
      .nullable(),
    reason_type: z.enum(["vacation", "sick", "personal", "training", "other"]),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
  })
  .refine(
    (data) => data.start_date <= data.end_date,
    {
      message: "End date must be on or after start date",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      if (data.is_full_day) return true;
      if (!data.start_time || !data.end_time) return false;
      return timeStringToMinutes(data.start_time) < timeStringToMinutes(data.end_time);
    },
    {
      message: "End time must follow start time for partial-day time off",
      path: ["end_time"],
    }
  );

export type StaffTimeOffInput = z.infer<typeof staffTimeOffSchema>;

/**
 * Validates that a break falls entirely within at least one active working shift on that day.
 * Rejects breaks on non-working days or spanning across split-shift gaps.
 */
export function isBreakWithinWorkingHours(
  breakItem: { start_time: string; end_time: string; day_of_week: number },
  workingHours: { open_time: string | null; close_time: string | null; day_of_week: number; is_working: boolean }[]
): boolean {
  const normBreakStart = normalizeTimeHHMM(breakItem.start_time);
  const normBreakEnd = normalizeTimeHHMM(breakItem.end_time);
  if (!normBreakStart || !normBreakEnd) return false;

  const bStart = timeStringToMinutes(normBreakStart);
  const bEnd = timeStringToMinutes(normBreakEnd);
  if (bStart >= bEnd) return false;

  const activeShiftsOnDay = workingHours.filter(
    (s) => s.day_of_week === breakItem.day_of_week && s.is_working && s.open_time && s.close_time
  );

  if (activeShiftsOnDay.length === 0) return false;

  return activeShiftsOnDay.some((shift) => {
    const normShiftOpen = normalizeTimeHHMM(shift.open_time);
    const normShiftClose = normalizeTimeHHMM(shift.close_time);
    if (!normShiftOpen || !normShiftClose) return false;

    const sStart = timeStringToMinutes(normShiftOpen);
    const sEnd = timeStringToMinutes(normShiftClose);
    return bStart >= sStart && bEnd <= sEnd;
  });
}

/**
 * Validates whether any two breaks for the same staff member and weekday overlap.
 */
export function hasOverlappingBreaks(
  breaks: { start_time: string; end_time: string; day_of_week?: number }[]
): boolean {
  if (breaks.length <= 1) return false;

  // Group by day_of_week if present, otherwise treat all as same day
  const grouped = new Map<number, { start: number; end: number }[]>();
  for (const b of breaks) {
    const day = b.day_of_week ?? 0;
    const normStart = normalizeTimeHHMM(b.start_time);
    const normEnd = normalizeTimeHHMM(b.end_time);
    if (!normStart || !normEnd) continue;

    const start = timeStringToMinutes(normStart);
    const end = timeStringToMinutes(normEnd);
    const list = grouped.get(day) || [];
    list.push({ start, end });
    grouped.set(day, list);
  }

  for (const [, list] of grouped) {
    if (list.length <= 1) continue;
    const sorted = [...list].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end > sorted[i + 1].start) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detects whether a candidate time-off period conflicts with existing leave for the same staff member.
 * Compares full-day, multi-day, and partial-day absences.
 */
export function hasTimeOffOverlap(
  candidate: {
    id?: string;
    start_date: string;
    end_date: string;
    is_full_day: boolean;
    start_time?: string | null;
    end_time?: string | null;
  },
  existingList: {
    id?: string;
    start_date: string;
    end_date: string;
    is_full_day: boolean;
    start_time?: string | null;
    end_time?: string | null;
  }[]
): boolean {
  for (const existing of existingList) {
    // Skip if comparing against the same record during edit
    if (candidate.id && existing.id && candidate.id === existing.id) {
      continue;
    }

    // Check date interval intersection: candidate starts before existing ends, and ends after existing starts
    const datesIntersect = candidate.start_date <= existing.end_date && candidate.end_date >= existing.start_date;
    if (!datesIntersect) {
      continue;
    }

    // If either candidate or existing is a full-day absence, any date overlap is a conflict
    if (candidate.is_full_day || existing.is_full_day) {
      return true;
    }

    // Both are partial-day absences
    // If they span across multiple days, treat as conflict
    if (candidate.start_date !== candidate.end_date || existing.start_date !== existing.end_date) {
      return true;
    }

    // If they fall on different dates in single-day mode, no conflict
    if (candidate.start_date !== existing.start_date) {
      continue;
    }

    // Same date, both partial-day: check time window overlap
    const candStart = normalizeTimeHHMM(candidate.start_time);
    const candEnd = normalizeTimeHHMM(candidate.end_time);
    const existStart = normalizeTimeHHMM(existing.start_time);
    const existEnd = normalizeTimeHHMM(existing.end_time);

    if (!candStart || !candEnd || !existStart || !existEnd) {
      // Incomplete partial-day times on same date is considered conflict
      return true;
    }

    const cStartMin = timeStringToMinutes(candStart);
    const cEndMin = timeStringToMinutes(candEnd);
    const eStartMin = timeStringToMinutes(existStart);
    const eEndMin = timeStringToMinutes(existEnd);

    // Overlap condition: startA < endB && startB < endA
    if (cStartMin < eEndMin && eStartMin < cEndMin) {
      return true;
    }
  }

  return false;
}

/**
 * Defines effective booking eligibility based on staff active/archived state,
 * service active/archived state, and relational assignment.
 */
export function isStaffEligibleForService(
  staff: { is_active: boolean; is_archived: boolean },
  service: { is_active: boolean; is_archived: boolean },
  isAssigned: boolean
): boolean {
  return (
    staff.is_active &&
    !staff.is_archived &&
    service.is_active &&
    !service.is_archived &&
    isAssigned
  );
}
