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

export const staffWorkingHourIntervalSchema = z
  .object({
    id: z.string().uuid().optional(),
    day_of_week: z.number().int().min(0).max(6),
    is_working: z.boolean(),
    open_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)").nullable(),
    close_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)").nullable(),
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
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)"),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)"),
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
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
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
 * Validates that a break falls entirely within at least one working shift on that day.
 */
export function isBreakWithinWorkingHours(
  breakItem: { start_time: string; end_time: string; day_of_week: number },
  workingHours: { open_time: string | null; close_time: string | null; day_of_week: number; is_working: boolean }[]
): boolean {
  const bStart = timeStringToMinutes(breakItem.start_time);
  const bEnd = timeStringToMinutes(breakItem.end_time);

  const activeShiftsOnDay = workingHours.filter(
    (s) => s.day_of_week === breakItem.day_of_week && s.is_working && s.open_time && s.close_time
  );

  return activeShiftsOnDay.some((shift) => {
    const sStart = timeStringToMinutes(shift.open_time!);
    const sEnd = timeStringToMinutes(shift.close_time!);
    return bStart >= sStart && bEnd <= sEnd;
  });
}
