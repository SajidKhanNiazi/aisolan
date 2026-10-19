import type { OpeningHourInterval, BookingPolicy } from "./types";

/**
 * Standard default opening hours for businesses that haven't saved customized hours yet.
 * Mon-Sat 09:00 - 17:00, Sun Closed.
 */
export const DEFAULT_OPENING_HOURS: OpeningHourInterval[] = [
  { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "17:00" }, // Mon
  { day_of_week: 2, is_closed: false, open_time: "09:00", close_time: "17:00" }, // Tue
  { day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "17:00" }, // Wed
  { day_of_week: 4, is_closed: false, open_time: "09:00", close_time: "17:00" }, // Thu
  { day_of_week: 5, is_closed: false, open_time: "09:00", close_time: "17:00" }, // Fri
  { day_of_week: 6, is_closed: false, open_time: "09:00", close_time: "17:00" }, // Sat
  { day_of_week: 0, is_closed: true, open_time: null, close_time: null }, // Sun
];

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  min_notice_hours: 2,
  max_advance_days: 60,
  cancellation_notice_hours: 24,
  default_buffer_minutes: 10,
  online_booking_enabled: false,
  cancellation_policy_text: "Appointments can be cancelled or rescheduled up to 24 hours prior to the start time.",
};
