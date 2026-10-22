/**
 * BookPilot AI — Booking Error Codes & Error Mapping (Phase 1E-A / 1E-C Hotfix)
 */

export const BOOKING_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  BUSINESS_ACCESS_DENIED: "BUSINESS_ACCESS_DENIED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
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
  BUSINESS_ACCESS_DENIED: "You don't have permission to update this appointment.",
  PERMISSION_DENIED: "You don't have permission to update this appointment.",
  INVALID_SERVICE: "The selected service is not available or has been archived.",
  INVALID_STAFF: "The selected staff member is not available or has been archived.",
  STAFF_NOT_ELIGIBLE: "The selected staff member does not offer this service.",
  INVALID_CUSTOMER: "Customer record could not be found or validated.",
  BUSINESS_CLOSED: "The business is closed on the selected date (holiday or closure).",
  STAFF_UNAVAILABLE: "This time slot is no longer available. Please choose another time.",
  OUTSIDE_BOOKING_WINDOW: "The requested time falls outside the allowed booking window.",
  SLOT_TAKEN: "This time slot is already booked and no longer available. Please choose another time.",
  APPOINTMENT_NOT_FOUND: "The requested appointment could not be found.",
  INVALID_STATUS_TRANSITION: "This appointment cannot transition to the requested status.",
  VALIDATION_ERROR: "The provided booking details are invalid.",
  CONFLICT: "A scheduling conflict occurred. Please refresh and try again.",
  DATABASE_ERROR: "Unable to process this appointment operation. Please try again.",
};

/**
 * Detects whether an error message contains raw database internals or SQL syntax.
 */
export function isSensitiveDatabaseMessage(msg: string): boolean {
  return /pg_catalog|coalesce|syntax error|does not exist|violates|sqlstate|relation|plpgsql|column|table|select|insert|update|delete|where|from|function pg_/i.test(
    msg
  );
}

/**
 * Sanitizes any raw or internal error message to prevent database details from being exposed to end users.
 */
export function sanitizeUserErrorMessage(
  rawMessage: string | undefined | null,
  fallback: string
): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    return fallback;
  }
  if (isSensitiveDatabaseMessage(rawMessage)) {
    return fallback;
  }
  return rawMessage;
}

export type BookingErrorContext = "reschedule" | "cancel" | "create" | "status" | "general";

/**
 * Maps raw PostgreSQL and Supabase errors to stable application-level error codes and safe messages.
 */
export function mapDatabaseErrorToBookingError(
  error: unknown,
  context: BookingErrorContext = "general"
): {
  code: BookingErrorCode;
  message: string;
} {
  const defaultFallback =
    context === "reschedule"
      ? "Unable to reschedule this appointment. Please try again."
      : context === "cancel"
      ? "Unable to cancel this appointment. Please try again."
      : context === "status"
      ? "Unable to update appointment status. Please try again."
      : context === "create"
      ? "Unable to complete this booking. Please try again."
      : USER_FRIENDLY_ERROR_MESSAGES.DATABASE_ERROR;

  if (!error || typeof error !== "object") {
    return {
      code: BOOKING_ERROR_CODES.DATABASE_ERROR,
      message: defaultFallback,
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
  if (code === "42501" || msg.includes("unauthorized") || msg.includes("denied") || msg.includes("permission")) {
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

  // 5. Check custom raised error strings against known codes
  for (const [key, val] of Object.entries(BOOKING_ERROR_CODES)) {
    if (msg.includes(val.toLowerCase()) || msg.includes(key.toLowerCase())) {
      return {
        code: val,
        message: USER_FRIENDLY_ERROR_MESSAGES[val] || defaultFallback,
      };
    }
  }

  // 6. Generic or raw PostgreSQL internal error fallback (sanitized)
  return {
    code: BOOKING_ERROR_CODES.DATABASE_ERROR,
    message: sanitizeUserErrorMessage(err.message, defaultFallback),
  };
}
