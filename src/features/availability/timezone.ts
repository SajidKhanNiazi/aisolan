/**
 * BookPilot AI — Availability Timezone & DST Engine (Phase 1E-B)
 */

import {
  convertLocalWallClockToUTC,
  formatInstantInTimeZone,
  getTimeZoneOffsetMinutes,
  type LocalWallClock,
  type WallClockConversionResult,
} from "@/features/appointments/timezone";

export {
  convertLocalWallClockToUTC,
  formatInstantInTimeZone,
  getTimeZoneOffsetMinutes,
  type LocalWallClock,
  type WallClockConversionResult,
};

/**
 * Computes the day of the week (0=Sunday, 1=Monday ... 6=Saturday)
 * for a calendar date string "YYYY-MM-DD" in a specific IANA timezone.
 */
export function getDayOfWeekForLocalDate(
  dateStr: string,
  timeZone: string
): number {
  // Use 12:00 noon local time to avoid boundary edge cases
  const noonConversion = convertLocalWallClockToUTC({
    date: dateStr,
    time: "12:00",
    timeZone,
  });

  if (noonConversion.utcInstant) {
    const formatted = formatInstantInTimeZone(noonConversion.utcInstant, timeZone);
    return formatted.dayOfWeek;
  }

  // Fallback: parse directly
  const [y, m, d] = dateStr.split("-").map(Number);
  const fallback = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return fallback.getUTCDay();
}

/**
 * Resolves a local wall-clock candidate ("YYYY-MM-DD", "HH:MM") to a UTC instant.
 * Applies 'earlier' disambiguation for Autumn DST fall-back.
 * Non-existent times (Spring DST jump) return null.
 */
export function resolveWallClockCandidate(
  date: string,
  time: string,
  timeZone: string
): { utcInstant: Date; isoString: string } | null {
  const result = convertLocalWallClockToUTC(
    { date, time, timeZone },
    "earlier" // For Autumn fall-back, use earlier instant (Daylight Saving)
  );

  if (result.status !== "valid" || !result.utcInstant || !result.isoString) {
    return null;
  }

  return {
    utcInstant: result.utcInstant,
    isoString: result.isoString,
  };
}
