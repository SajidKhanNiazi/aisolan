/**
 * BookPilot AI — Interval Mathematics & Temporal Range Utilities (Phase 1E-B)
 *
 * Implements strict half-open interval semantics [start, end) for slot generation,
 * buffer containment, shift boundaries, and collision detection.
 */

/**
 * Converts a "HH:MM" or "HH:MM:SS" time string into integer minutes since 00:00.
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  return hours * 60 + minutes;
}

/**
 * Converts integer minutes since 00:00 into a zero-padded "HH:MM" string.
 */
export function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * Checks whether half-open interval [innerStart, innerEnd) is completely
 * contained within [outerStart, outerEnd).
 */
export function isIntervalContained(
  innerStart: number,
  innerEnd: number,
  outerStart: number,
  outerEnd: number
): boolean {
  return innerStart >= outerStart && innerEnd <= outerEnd;
}

/**
 * Checks whether two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 * Adjacent intervals where aEnd === bStart do NOT overlap.
 */
export function doIntervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Checks whether two UTC date ranges [aStart, aEnd) and [bStart, bEnd) overlap.
 */
export function doUtcDateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/**
 * Checks whether inner UTC date range is completely within outer UTC date range.
 */
export function isUtcDateRangeContained(
  innerStart: Date,
  innerEnd: Date,
  outerStart: Date,
  outerEnd: Date
): boolean {
  return (
    innerStart.getTime() >= outerStart.getTime() &&
    innerEnd.getTime() <= outerEnd.getTime()
  );
}
