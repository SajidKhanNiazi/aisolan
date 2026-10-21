/**
 * BookPilot AI — Availability Error Codes & User Messages (Phase 1E-B)
 */

export const AVAILABILITY_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  BUSINESS_ACCESS_DENIED: "BUSINESS_ACCESS_DENIED",
  BUSINESS_NOT_FOUND: "BUSINESS_NOT_FOUND",
  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  SERVICE_INACTIVE: "SERVICE_INACTIVE",
  STAFF_NOT_FOUND: "STAFF_NOT_FOUND",
  STAFF_INACTIVE: "STAFF_INACTIVE",
  STAFF_NOT_ELIGIBLE: "STAFF_NOT_ELIGIBLE",
  NO_ELIGIBLE_STAFF: "NO_ELIGIBLE_STAFF",
  INVALID_DATE: "INVALID_DATE",
  OUTSIDE_BOOKING_WINDOW: "OUTSIDE_BOOKING_WINDOW",
  BUSINESS_CLOSED: "BUSINESS_CLOSED",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type AvailabilityErrorCode =
  (typeof AVAILABILITY_ERROR_CODES)[keyof typeof AVAILABILITY_ERROR_CODES];

export const USER_FRIENDLY_AVAILABILITY_MESSAGES: Record<
  AvailabilityErrorCode,
  string
> = {
  VALIDATION_ERROR: "The provided availability search parameters are invalid.",
  UNAUTHORIZED: "You must be authenticated to preview salon availability.",
  BUSINESS_ACCESS_DENIED: "You do not have access to this business workspace.",
  BUSINESS_NOT_FOUND: "The requested salon or workspace was not found.",
  SERVICE_NOT_FOUND: "The requested service does not exist or has been archived.",
  SERVICE_INACTIVE: "The selected service is currently inactive.",
  STAFF_NOT_FOUND: "The requested staff member was not found.",
  STAFF_INACTIVE: "The requested staff member is currently inactive.",
  STAFF_NOT_ELIGIBLE: "The selected staff member is not assigned to perform this service.",
  NO_ELIGIBLE_STAFF: "No active staff members are eligible to perform this service.",
  INVALID_DATE: "The requested booking date is invalid. Please use YYYY-MM-DD format.",
  OUTSIDE_BOOKING_WINDOW: "The requested booking date is outside the allowed booking window.",
  BUSINESS_CLOSED: "The business is closed on the selected date.",
  DATABASE_ERROR: "An unexpected error occurred while querying availability. Please try again.",
};
