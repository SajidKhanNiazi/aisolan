/**
 * BookPilot AI — Booking Error Codes & Error Mapping (Phase 1E-A)
 */

export const BOOKING_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  BUSINESS_ACCESS_DENIED: "BUSINESS_ACCESS_DENIED",
  INVALID_SERVICE: "INVALID_SERVICE",
  INVALID_STAFF: "INVALID_STAFF",
  STAFF_NOT_ELIGIBLE: "STAFF_NOT_ELIGIBLE",
  INVALID_CUSTOMER: "INVALID_CUSTOMER",
  BUSINESS_CLOSED: "BUSINESS_CLOSED",
  STAFF_UNAVAILABLE: "STAFF_UNAVAILABLE",
  OUTSIDE_BOOKING_WINDOW: "OUTSIDE_BOOKING_WINDOW",
  SLOT_TAKEN: "SLOT_TAKEN",
  APPOINTMENT_NOT_FOUND: "APPOINTMENT_NOT_FOUND",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type BookingErrorCode =
  (typeof BOOKING_ERROR_CODES)[keyof typeof BOOKING_ERROR_CODES];

export const USER_FRIENDLY_ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  UNAUTHORIZED: "You must be logged in to perform this operation.",
  BUSINESS_ACCESS_DENIED: "You do not have permission to manage appointments for this business.",
  INVALID_SERVICE: "The selected service is not available or has been archived.",
  INVALID_STAFF: "The selected staff member is not available or has been archived.",
  STAFF_NOT_ELIGIBLE: "The selected staff member does not offer this service.",
  INVALID_CUSTOMER: "Customer record could not be found or validated.",
  BUSINESS_CLOSED: "The business is closed on the selected date (holiday or closure).",
  STAFF_UNAVAILABLE: "The staff member is unavailable or on leave during this timeslot.",
  OUTSIDE_BOOKING_WINDOW: "The requested time falls outside the allowed booking window.",
  SLOT_TAKEN: "This timeslot is already booked for the selected staff member. Please select another time.",
  APPOINTMENT_NOT_FOUND: "The requested appointment could not be found.",
  INVALID_STATUS_TRANSITION: "This appointment cannot transition to the requested status.",
  VALIDATION_ERROR: "The provided booking details are invalid.",
  CONFLICT: "A scheduling conflict occurred. Please refresh and try again.",
  DATABASE_ERROR: "A database error occurred while processing the appointment.",
};

/**
 * Maps raw PostgreSQL and Supabase errors to stable application-level error codes and safe messages.
 */
export function mapDatabaseErrorToBookingError(error: unknown): {
  code: BookingErrorCode;
  message: string;
} {
  if (!error || typeof error !== "object") {
    return {
      code: BOOKING_ERROR_CODES.DATABASE_ERROR,
      message: USER_FRIENDLY_ERROR_MESSAGES.DATABASE_ERROR,
    };
  }

  const err = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const code = err.code || "";
  const msg = (err.message || "").toLowerCase();

  // 1. PostgreSQL Exclusion Constraint Violation (SQLSTATE 23P01)
  if (code === "23P01" || msg.includes("exclude_staff_double_booking") || msg.includes("exclusion")) {
    return {
      code: BOOKING_ERROR_CODES.SLOT_TAKEN,
      message: USER_FRIENDLY_ERROR_MESSAGES.SLOT_TAKEN,
    };
  }

  // 2. Unique Key Violation (SQLSTATE 23505)
  if (code === "23505") {
    if (msg.includes("idempotency")) {
      return {
        code: BOOKING_ERROR_CODES.CONFLICT,
        message: "This booking request was already submitted.",
      };
    }
    return {
      code: BOOKING_ERROR_CODES.SLOT_TAKEN,
      message: USER_FRIENDLY_ERROR_MESSAGES.SLOT_TAKEN,
    };
  }

  // 3. Authorization / Security (SQLSTATE 42501)
  if (code === "42501" || msg.includes("unauthorized") || msg.includes("denied")) {
    return {
      code: BOOKING_ERROR_CODES.BUSINESS_ACCESS_DENIED,
      message: USER_FRIENDLY_ERROR_MESSAGES.BUSINESS_ACCESS_DENIED,
    };
  }

  // 4. Foreign Key Constraints (SQLSTATE 23503)
  if (code === "23503") {
    if (msg.includes("fk_appointments_service")) {
      return {
        code: BOOKING_ERROR_CODES.INVALID_SERVICE,
        message: USER_FRIENDLY_ERROR_MESSAGES.INVALID_SERVICE,
      };
    }
    if (msg.includes("fk_appointments_staff")) {
      return {
        code: BOOKING_ERROR_CODES.INVALID_STAFF,
        message: USER_FRIENDLY_ERROR_MESSAGES.INVALID_STAFF,
      };
    }
    if (msg.includes("fk_appointments_customer")) {
      return {
        code: BOOKING_ERROR_CODES.INVALID_CUSTOMER,
        message: USER_FRIENDLY_ERROR_MESSAGES.INVALID_CUSTOMER,
      };
    }
    return {
      code: BOOKING_ERROR_CODES.VALIDATION_ERROR,
      message: "Referenced record not found within this business workspace.",
    };
  }

  // 5. Check custom raised error strings
  for (const [key, val] of Object.entries(BOOKING_ERROR_CODES)) {
    if (msg.includes(val.toLowerCase()) || msg.includes(key.toLowerCase())) {
      return {
        code: val,
        message: USER_FRIENDLY_ERROR_MESSAGES[val] || err.message || "An error occurred",
      };
    }
  }

  return {
    code: BOOKING_ERROR_CODES.DATABASE_ERROR,
    message: err.message || USER_FRIENDLY_ERROR_MESSAGES.DATABASE_ERROR,
  };
}
