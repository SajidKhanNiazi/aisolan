/**
 * BookPilot AI — Appointment Availability Types (Phase 1E-B)
 */

export type StaffPreference = "specific" | "any";

export interface AvailabilitySlot {
  /** Local 24h wall-clock time string: "HH:MM" e.g. "09:00" */
  localTime: string;
  /** ISO 8601 UTC string when appointment service starts e.g. "2026-11-03T09:00:00.000Z" */
  startsAt: string;
  /** ISO 8601 UTC string when service ends */
  serviceEndsAt: string;
  /** ISO 8601 UTC string when buffer-before starts */
  occupiedStartsAt: string;
  /** ISO 8601 UTC string when buffer-after ends */
  occupiedEndsAt: string;
  /** List of eligible staff profile IDs who can fulfill this slot */
  availableStaffIds: string[];
  /** Flag indicating slot is bookable */
  available: boolean;
}

export interface AvailabilityMetadata {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  totalOccupiedMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
}

export interface AvailabilityResponse {
  date: string; // "YYYY-MM-DD"
  timezone: string; // IANA e.g. "Europe/London"
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  bufferMinutes: number;
  staffPreference: StaffPreference;
  selectedStaffId: string | null;
  slots: AvailabilitySlot[];
  totalSlotsCount: number;
  metadata: AvailabilityMetadata;
}

export interface AvailabilityQueryInput {
  businessId?: string;
  businessSlug?: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  staffId?: string | null;
  staffPreference?: StaffPreference;
  slotIntervalMinutes?: number;
}

export interface PureCalculationContext {
  date: string; // "YYYY-MM-DD"
  timezone: string; // e.g. "Europe/London"
  now: Date;
  bookingPolicy: {
    min_notice_hours: number;
    max_advance_days: number;
    online_booking_enabled: boolean;
  };
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    buffer_minutes: number;
    is_active: boolean;
    is_archived: boolean;
  };
  staffMembers: Array<{
    id: string;
    display_name: string;
    is_active: boolean;
    is_archived: boolean;
    display_order: number;
  }>;
  businessOpeningHours: Array<{
    day_of_week: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
  }>;
  businessExceptions: Array<{
    exception_date: string;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
    reason?: string | null;
  }>;
  staffWorkingHours: Array<{
    staff_id: string;
    day_of_week: number;
    is_working: boolean;
    open_time: string | null;
    close_time: string | null;
  }>;
  staffBreaks: Array<{
    staff_id: string;
    day_of_week: number;
    break_title: string;
    start_time: string;
    end_time: string;
  }>;
  staffTimeOff: Array<{
    staff_id: string;
    start_date: string;
    end_date: string;
    is_full_day: boolean;
    start_time: string | null;
    end_time: string | null;
  }>;
  existingAppointments: Array<{
    id: string;
    staff_id: string;
    status: string;
    starts_at: string;
    service_ends_at: string;
    occupied_starts_at: string;
    occupied_ends_at: string;
  }>;
  staffPreference: StaffPreference;
  selectedStaffId: string | null;
  slotIntervalMinutes?: number;
}
