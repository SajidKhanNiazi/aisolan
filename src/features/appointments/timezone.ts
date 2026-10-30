/**
 * BookPilot AI — Timezone & Daylight Saving Time (DST) Handling (Phase 1E-A)
 *
 * Implements deterministic conversion between UTC instants and business local wall-clock times
 * with explicit validation for Daylight Saving Time (DST) non-existent and ambiguous times.
 */

export interface LocalWallClock {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  timeZone: string; // e.g. "Europe/London"
}

export interface WallClockConversionResult {
  utcInstant: Date | null;
  isoString: string | null;
  status: "valid" | "nonexistent" | "ambiguous" | "invalid_input";
  offsetMinutes?: number;
  error?: string;
}

/**
 * Returns the exact offset in minutes from UTC for a given instant in a given IANA timezone.
 * Positive = East of UTC (e.g. BST +60).
 */
export function getTimeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(instant);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "";

  // tzName is e.g. "GMT" or "GMT+1" or "GMT-5" or "GMT+01:00"
  if (tzName === "GMT" || tzName === "UTC") return 0;

  const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;

  return sign * (hours * 60 + minutes);
}

/**
 * Formats a UTC instant as local date and time in the specified IANA timezone.
 */
export function formatInstantInTimeZone(
  instant: Date,
  timeZone: string
): {
  dateStr: string; // "YYYY-MM-DD"
  timeStr: string; // "HH:MM"
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  offsetMinutes: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // en-CA formats date as YYYY-MM-DD
  const parts = formatter.formatToParts(instant);
  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  let hour = parts.find((p) => p.type === "hour")?.value || "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;

  // Day of week in target timezone
  const dowFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dowMap[dowFormatter.format(instant)] ?? 0;
  const offsetMinutes = getTimeZoneOffsetMinutes(instant, timeZone);

  return { dateStr, timeStr, dayOfWeek, offsetMinutes };
}

/**
 * Converts a business local wall-clock date ("YYYY-MM-DD") and time ("HH:MM") in an IANA timezone
 * to a verified UTC Date instant.
 *
 * Explicit Policy for DST Edge Cases:
 * 1. Non-existent times (Spring Forward): Strictly rejected with status 'nonexistent'.
 *    Never silently shifted forward or backward.
 * 2. Ambiguous times (Autumn Fall Back):
 *    If disambiguation is 'reject', rejects with status 'ambiguous'.
 *    If disambiguation is 'earlier', selects first occurrence (Daylight Saving, e.g. BST +1).
 *    If disambiguation is 'later', selects second occurrence (Standard Time, e.g. GMT +0).
 *    Default in BookPilot AI: 'reject' unless explicit disambiguation parameter is provided.
 */
export function convertLocalWallClockToUTC(
  local: LocalWallClock,
  disambiguation: "reject" | "earlier" | "later" = "reject"
): WallClockConversionResult {
  const { date, time, timeZone } = local;

  const dateParts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);

  if (
    dateParts.length !== 3 ||
    timeParts.length < 2 ||
    isNaN(dateParts[0]) ||
    isNaN(dateParts[1]) ||
    isNaN(dateParts[2]) ||
    isNaN(timeParts[0]) ||
    isNaN(timeParts[1])
  ) {
    return {
      utcInstant: null,
      isoString: null,
      status: "invalid_input",
      error: "Invalid date or time format. Expected YYYY-MM-DD and HH:MM.",
    };
  }

  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return {
      utcInstant: null,
      isoString: null,
      status: "invalid_input",
      error: "Date or time value out of valid bounds.",
    };
  }

  // Probe possible UTC candidate instants around the requested wall-clock time
  // Target UTC is approximately Date.UTC(year, month-1, day, hour, minute) minus possible offsets (-14h to +14h)
  const baseEpoch = Date.UTC(year, month - 1, day, hour, minute);

  // Probe with a candidate offset estimate
  const probeDate = new Date(baseEpoch);
  const initialOffset = getTimeZoneOffsetMinutes(probeDate, timeZone);

  // Candidate 1: adjusted by offset
  const candidateEpoch = baseEpoch - initialOffset * 60000;
  const candidateInstant = new Date(candidateEpoch);

  // Check what wall-clock time this candidate formats to in the target timezone
  const formatted = formatInstantInTimeZone(candidateInstant, timeZone);

  // Check if candidate matches exact requested wall-clock date and time
  if (formatted.dateStr === date && formatted.timeStr === time) {
    // Check if this time is ambiguous (occurs twice due to Autumn fall-back)
    // Probe 1 hour before and 1 hour after
    const candidateOffset = formatted.offsetMinutes;
    const probeAfterEpoch = candidateEpoch + 3600000;
    const probeBeforeEpoch = candidateEpoch - 3600000;
    const offsetAfter = getTimeZoneOffsetMinutes(new Date(probeAfterEpoch), timeZone);
    const offsetBefore = getTimeZoneOffsetMinutes(new Date(probeBeforeEpoch), timeZone);

    if (offsetAfter !== candidateOffset || offsetBefore !== candidateOffset) {
      // Possible transition boundary. Check alternate offset candidate.
      const altOffset = offsetAfter !== candidateOffset ? offsetAfter : offsetBefore;
      const altCandidateEpoch = baseEpoch - altOffset * 60000;
      const altInstant = new Date(altCandidateEpoch);
      const altFormatted = formatInstantInTimeZone(altInstant, timeZone);

      if (altFormatted.dateStr === date && altFormatted.timeStr === time && altCandidateEpoch !== candidateEpoch) {
        // AMBIGUOUS TIME: Occurs twice on this date!
        if (disambiguation === "reject") {
          return {
            utcInstant: null,
            isoString: null,
            status: "ambiguous",
            error: `Local time ${date} ${time} occurs twice due to daylight saving clock shift in ${timeZone}. Explicit disambiguation required.`,
          };
        }

        const earlier = candidateEpoch < altCandidateEpoch ? candidateInstant : altInstant;
        const later = candidateEpoch > altCandidateEpoch ? candidateInstant : altInstant;
        const selected = disambiguation === "earlier" ? earlier : later;

        return {
          utcInstant: selected,
          isoString: selected.toISOString(),
          status: "valid",
          offsetMinutes: getTimeZoneOffsetMinutes(selected, timeZone),
        };
      }
    }

    return {
      utcInstant: candidateInstant,
      isoString: candidateInstant.toISOString(),
      status: "valid",
      offsetMinutes: candidateOffset,
    };
  }

  // If candidate did NOT match, check if this is a spring-forward transition (non-existent time)
  // Check alternative candidate with offset ± 60 minutes
  const altCandidateEpoch1 = candidateEpoch - 3600000;
  const altCandidateEpoch2 = candidateEpoch + 3600000;
  const f1 = formatInstantInTimeZone(new Date(altCandidateEpoch1), timeZone);
  const f2 = formatInstantInTimeZone(new Date(altCandidateEpoch2), timeZone);

  if (f1.dateStr === date && f1.timeStr === time) {
    return {
      utcInstant: new Date(altCandidateEpoch1),
      isoString: new Date(altCandidateEpoch1).toISOString(),
      status: "valid",
      offsetMinutes: f1.offsetMinutes,
    };
  }
  if (f2.dateStr === date && f2.timeStr === time) {
    return {
      utcInstant: new Date(altCandidateEpoch2),
      isoString: new Date(altCandidateEpoch2).toISOString(),
      status: "valid",
      offsetMinutes: f2.offsetMinutes,
    };
  }

  // Neither candidate produces this local time -> Non-existent time skipped during DST spring forward
  return {
    utcInstant: null,
    isoString: null,
    status: "nonexistent",
    error: `Local time ${date} ${time} does not exist in ${timeZone} because clocks skip forward on this date.`,
  };
}

/**
 * Formats an ISO UTC timestamp in the salon's authoritative IANA timezone.
 * Guarantees appointment dates and times display accurately in the salon's local wall-clock time
 * regardless of the visitor's device/browser timezone.
 */
export function formatSalonAppointmentDateTime(
  isoString: string,
  timeZone: string
): {
  formattedDate: string;
  formattedTime: string;
  fullDisplay: string;
} {
  const d = new Date(isoString);
  const tz = timeZone || "Europe/London";

  const formattedDate = d.toLocaleDateString("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    formattedDate,
    formattedTime,
    fullDisplay: `${formattedDate} at ${formattedTime}`,
  };
}
