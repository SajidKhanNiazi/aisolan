import { describe, it, expect } from "vitest";
import {
  convertLocalWallClockToUTC,
  formatInstantInTimeZone,
  getTimeZoneOffsetMinutes,
} from "@/features/appointments/timezone";

describe("Phase 1E-A — Timezone & DST Scheduling Suite (Europe/London)", () => {
  const UK_TZ = "Europe/London";

  it("handles standard Winter GMT date (UTC+0)", () => {
    // 2026-01-15 10:00 in London is GMT (UTC+0)
    const result = convertLocalWallClockToUTC({
      date: "2026-01-15",
      time: "10:00",
      timeZone: UK_TZ,
    });

    expect(result.status).toBe("valid");
    expect(result.isoString).toBe("2026-01-15T10:00:00.000Z");
    expect(result.offsetMinutes).toBe(0);
    expect(getTimeZoneOffsetMinutes(result.utcInstant!, UK_TZ)).toBe(0);

    // Round-trip formatting
    const formatted = formatInstantInTimeZone(result.utcInstant!, UK_TZ);
    expect(formatted.dateStr).toBe("2026-01-15");
    expect(formatted.timeStr).toBe("10:00");
    expect(formatted.offsetMinutes).toBe(0);
  });

  it("handles Summer BST date (UTC+1)", () => {
    // 2026-07-15 10:00 in London is BST (UTC+1, so 09:00 UTC)
    const result = convertLocalWallClockToUTC({
      date: "2026-07-15",
      time: "10:00",
      timeZone: UK_TZ,
    });

    expect(result.status).toBe("valid");
    expect(result.isoString).toBe("2026-07-15T09:00:00.000Z");
    expect(result.offsetMinutes).toBe(60);

    // Round-trip formatting
    const formatted = formatInstantInTimeZone(result.utcInstant!, UK_TZ);
    expect(formatted.dateStr).toBe("2026-07-15");
    expect(formatted.timeStr).toBe("10:00");
    expect(formatted.offsetMinutes).toBe(60);
  });

  it("strictly detects and rejects non-existent local times during Spring DST forward transition", () => {
    // In UK, on Sunday 2026-03-29, at 01:00 clocks jump directly to 02:00.
    // Therefore, 01:30 wall-clock does not exist on this date.
    const nonExistentResult = convertLocalWallClockToUTC({
      date: "2026-03-29",
      time: "01:30",
      timeZone: UK_TZ,
    });

    expect(nonExistentResult.status).toBe("nonexistent");
    expect(nonExistentResult.utcInstant).toBeNull();
    expect(nonExistentResult.error).toContain("does not exist");

    // Times before and after the jump must convert successfully
    const beforeJump = convertLocalWallClockToUTC({
      date: "2026-03-29",
      time: "00:30",
      timeZone: UK_TZ,
    });
    expect(beforeJump.status).toBe("valid");
    expect(beforeJump.offsetMinutes).toBe(0); // Still GMT

    const afterJump = convertLocalWallClockToUTC({
      date: "2026-03-29",
      time: "02:30",
      timeZone: UK_TZ,
    });
    expect(afterJump.status).toBe("valid");
    expect(afterJump.offsetMinutes).toBe(60); // Now BST
  });

  it("detects ambiguous local times during Autumn DST backward transition and supports explicit disambiguation", () => {
    // In UK, on Sunday 2026-10-25, at 02:00 BST clocks jump back to 01:00 GMT.
    // Therefore, 01:30 occurs twice.
    const ambiguousResult = convertLocalWallClockToUTC(
      {
        date: "2026-10-25",
        time: "01:30",
        timeZone: UK_TZ,
      },
      "reject"
    );

    expect(ambiguousResult.status).toBe("ambiguous");
    expect(ambiguousResult.utcInstant).toBeNull();
    expect(ambiguousResult.error).toContain("occurs twice");

    // Explicit earlier disambiguation selects the first occurrence (BST UTC+1, 00:30 UTC)
    const earlierResult = convertLocalWallClockToUTC(
      {
        date: "2026-10-25",
        time: "01:30",
        timeZone: UK_TZ,
      },
      "earlier"
    );
    expect(earlierResult.status).toBe("valid");
    expect(earlierResult.isoString).toBe("2026-10-25T00:30:00.000Z");
    expect(earlierResult.offsetMinutes).toBe(60);

    // Explicit later disambiguation selects the second occurrence (GMT UTC+0, 01:30 UTC)
    const laterResult = convertLocalWallClockToUTC(
      {
        date: "2026-10-25",
        time: "01:30",
        timeZone: UK_TZ,
      },
      "later"
    );
    expect(laterResult.status).toBe("valid");
    expect(laterResult.isoString).toBe("2026-10-25T01:30:00.000Z");
    expect(laterResult.offsetMinutes).toBe(0);
  });

  it("correctly handles midnight date-boundary conversions in BST (UTC+1)", () => {
    // 00:30 local in BST is 23:30 UTC on the previous calendar day
    const midnightAfter = convertLocalWallClockToUTC({
      date: "2026-07-16",
      time: "00:30",
      timeZone: UK_TZ,
    });
    expect(midnightAfter.status).toBe("valid");
    expect(midnightAfter.isoString).toBe("2026-07-15T23:30:00.000Z");

    // Formatted back into UK_TZ, it matches 2026-07-16 00:30
    const formatted = formatInstantInTimeZone(midnightAfter.utcInstant!, UK_TZ);
    expect(formatted.dateStr).toBe("2026-07-16");
    expect(formatted.timeStr).toBe("00:30");
  });
});
