/**
 * BookPilot AI — Smart Availability & Slot Generation Pure Engine (Phase 1E-B)
 *
 * Implements interval-based slot generation completely decoupled from database I/O.
 * Enforces business hours, split shifts, recurring breaks, time off, buffer containment,
 * existing appointment GiST parity, booking policies, and DST transitions.
 */

import {
  timeStringToMinutes,
  minutesToTimeString,
  isIntervalContained,
  doIntervalsOverlap,
  doUtcDateRangesOverlap,
} from "./intervals";
import {
  getDayOfWeekForLocalDate,
  resolveWallClockCandidate,
} from "./timezone";
import type {
  AvailabilitySlot,
  PureCalculationContext,
} from "./types";

/**
 * Pure calculation function generating bookable appointment slots.
 */
export function calculateAvailableSlots(
  ctx: PureCalculationContext
): AvailabilitySlot[] {
  const {
    date,
    timezone,
    now,
    bookingPolicy,
    service,
    staffMembers,
    businessOpeningHours,
    businessExceptions,
    staffWorkingHours,
    staffBreaks,
    staffTimeOff,
    existingAppointments,
    staffPreference,
    selectedStaffId,
    slotIntervalMinutes = 15,
  } = ctx;

  // 1. Service Active & Non-Archived Validation
  if (!service.is_active || service.is_archived) {
    return [];
  }

  if (service.duration_minutes < 5) {
    return [];
  }

  // 2. Staff Eligibility Filtering
  const activeEligibleStaff = staffMembers.filter(
    (s) => s.is_active && !s.is_archived
  );

  let targetStaff = activeEligibleStaff;
  if (staffPreference === "specific") {
    if (!selectedStaffId) return [];
    targetStaff = activeEligibleStaff.filter((s) => s.id === selectedStaffId);
    if (targetStaff.length === 0) return [];
  } else {
    if (activeEligibleStaff.length === 0) return [];
  }

  // Sort staff deterministically by display_order then id
  targetStaff.sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.id.localeCompare(b.id);
  });

  // 3. Buffer Invariants (Matching Phase 1E-A RPC: before=0, after=service.buffer_minutes)
  const bufferBeforeMinutes = 0;
  const bufferAfterMinutes = Math.max(0, service.buffer_minutes || 0);

  // 4. Determine Day of Week in Business Timezone
  const dayOfWeek = getDayOfWeekForLocalDate(date, timezone);

  // 5. Establish Business Open Intervals for Date
  const businessOpenIntervals: Array<[number, number]> = [];

  // Check Schedule Exceptions first
  const matchingException = businessExceptions.find(
    (ex) => ex.exception_date === date
  );

  if (matchingException) {
    if (matchingException.is_closed) {
      // Entire day is marked closed by holiday or special exception
      return [];
    }
    if (matchingException.open_time && matchingException.close_time) {
      const openMin = timeStringToMinutes(matchingException.open_time);
      const closeMin = timeStringToMinutes(matchingException.close_time);
      if (openMin < closeMin) {
        businessOpenIntervals.push([openMin, closeMin]);
      }
    }
  } else {
    // Normal weekly opening hours
    const dayHours = businessOpeningHours.filter(
      (h) => h.day_of_week === dayOfWeek && !h.is_closed
    );

    for (const h of dayHours) {
      if (h.open_time && h.close_time) {
        const openMin = timeStringToMinutes(h.open_time);
        const closeMin = timeStringToMinutes(h.close_time);
        if (openMin < closeMin) {
          businessOpenIntervals.push([openMin, closeMin]);
        }
      }
    }
  }

  if (businessOpenIntervals.length === 0) {
    // Salon is closed on this date
    return [];
  }

  // 6. Pre-calculate Candidate Bounds
  const earliestBusinessOpen = Math.min(
    ...businessOpenIntervals.map((inv) => inv[0])
  );
  const latestBusinessClose = Math.max(
    ...businessOpenIntervals.map((inv) => inv[1])
  );

  const stepMinutes = Math.max(5, Math.min(60, slotIntervalMinutes));

  // Policy limits
  const minNoticeMs = (bookingPolicy.min_notice_hours || 0) * 3600000;
  const maxAdvanceMs = (bookingPolicy.max_advance_days || 60) * 86400000;
  const earliestAllowedUtcMs = now.getTime() + minNoticeMs;
  const latestAllowedUtcMs = now.getTime() + maxAdvanceMs;

  // Active appointments collision set (only capacity-holding statuses matching GiST exclusion)
  const blockingAppointments = existingAppointments.filter((a) =>
    ["confirmed", "pending", "completed", "no_show"].includes(a.status)
  );

  const availableSlots: AvailabilitySlot[] = [];

  // 7. Step through Candidate Wall-Clock Starts
  for (
    let candMin = earliestBusinessOpen;
    candMin + service.duration_minutes <= latestBusinessClose;
    candMin += stepMinutes
  ) {
    const candidateLocalTime = minutesToTimeString(candMin);
    const candServiceEndMin = candMin + service.duration_minutes;
    const candOccupiedStartMin = candMin - bufferBeforeMinutes;
    const candOccupiedEndMin = candServiceEndMin + bufferAfterMinutes;

    // A. Business Operating Hours Containment Check
    // The appointment service interval [candMin, candServiceEndMin) must fit inside
    // at least one business open interval.
    const fitsInBusinessHours = businessOpenIntervals.some((bInv) =>
      isIntervalContained(candMin, candServiceEndMin, bInv[0], bInv[1])
    );
    if (!fitsInBusinessHours) {
      continue;
    }

    // B. Resolve UTC Instant with Daylight Saving Time handling
    const resolvedUtc = resolveWallClockCandidate(
      date,
      candidateLocalTime,
      timezone
    );
    if (!resolvedUtc) {
      // Non-existent time during Spring DST forward shift
      continue;
    }

    const candStartsAt = resolvedUtc.utcInstant;
    const candStartsAtMs = candStartsAt.getTime();

    // C. Booking Notice Window & Advance Horizon Checks
    if (
      candStartsAtMs < earliestAllowedUtcMs ||
      candStartsAtMs > latestAllowedUtcMs
    ) {
      continue;
    }

    // Exact UTC intervals
    const serviceEndsAt = new Date(
      candStartsAtMs + service.duration_minutes * 60000
    );
    const occupiedStartsAt = new Date(
      candStartsAtMs - bufferBeforeMinutes * 60000
    );
    const occupiedEndsAt = new Date(
      serviceEndsAt.getTime() + bufferAfterMinutes * 60000
    );

    // D. Evaluate Eligible Staff Availability
    const freeStaffIdsForSlot: string[] = [];

    for (const staff of targetStaff) {
      // 1. Staff Working Shifts (including split shifts)
      const staffShifts = staffWorkingHours
        .filter(
          (wh) =>
            wh.staff_id === staff.id &&
            wh.day_of_week === dayOfWeek &&
            wh.is_working &&
            wh.open_time &&
            wh.close_time
        )
        .map((wh) => [
          timeStringToMinutes(wh.open_time!),
          timeStringToMinutes(wh.close_time!),
        ] as [number, number]);

      if (staffShifts.length === 0) {
        // Staff not scheduled to work on this day
        continue;
      }

      // Candidate occupied interval [occupiedStart, occupiedEnd) must be fully contained
      // within at least one working shift interval
      const fitsInStaffShift = staffShifts.some((shift) =>
        isIntervalContained(
          candOccupiedStartMin,
          candOccupiedEndMin,
          shift[0],
          shift[1]
        )
      );
      if (!fitsInStaffShift) {
        continue;
      }

      // 2. Staff Recurring Breaks Check
      const staffDayBreaks = staffBreaks.filter(
        (b) => b.staff_id === staff.id && b.day_of_week === dayOfWeek
      );

      const hasBreakOverlap = staffDayBreaks.some((b) => {
        const breakStart = timeStringToMinutes(b.start_time);
        const breakEnd = timeStringToMinutes(b.end_time);
        return doIntervalsOverlap(
          candOccupiedStartMin,
          candOccupiedEndMin,
          breakStart,
          breakEnd
        );
      });

      if (hasBreakOverlap) {
        continue;
      }

      // 3. Staff Time Off / Leave Check
      const staffLeaves = staffTimeOff.filter(
        (to) =>
          to.staff_id === staff.id &&
          to.start_date <= date &&
          to.end_date >= date
      );

      let isOnLeave = false;
      for (const leave of staffLeaves) {
        if (leave.is_full_day) {
          isOnLeave = true;
          break;
        }
        if (leave.start_time && leave.end_time) {
          const leaveStart = timeStringToMinutes(leave.start_time);
          const leaveEnd = timeStringToMinutes(leave.end_time);
          if (
            doIntervalsOverlap(
              candOccupiedStartMin,
              candOccupiedEndMin,
              leaveStart,
              leaveEnd
            )
          ) {
            isOnLeave = true;
            break;
          }
        }
      }

      if (isOnLeave) {
        continue;
      }

      // 4. Existing Appointment Conflicts (GiST exclusion parity)
      const staffAppointments = blockingAppointments.filter(
        (a) => a.staff_id === staff.id
      );

      const hasAppointmentConflict = staffAppointments.some((appt) => {
        const apptOccupiedStart = new Date(appt.occupied_starts_at);
        const apptOccupiedEnd = new Date(appt.occupied_ends_at);
        return doUtcDateRangesOverlap(
          occupiedStartsAt,
          occupiedEndsAt,
          apptOccupiedStart,
          apptOccupiedEnd
        );
      });

      if (hasAppointmentConflict) {
        continue;
      }

      // Staff member is available for this slot!
      freeStaffIdsForSlot.push(staff.id);
    }

    // E. Commit Slot if at least one staff member is available
    if (freeStaffIdsForSlot.length > 0) {
      availableSlots.push({
        localTime: candidateLocalTime,
        startsAt: candStartsAt.toISOString(),
        serviceEndsAt: serviceEndsAt.toISOString(),
        occupiedStartsAt: occupiedStartsAt.toISOString(),
        occupiedEndsAt: occupiedEndsAt.toISOString(),
        availableStaffIds: freeStaffIdsForSlot,
        available: true,
      });
    }
  }

  // 8. Chronological Sort & Deduplication
  availableSlots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return availableSlots;
}

/**
 * Deterministic Staff Assignment for "Any Available" slot booking.
 * Picks the primary staff member from the slot's availableStaffIds based on display order.
 */
export function assignStaffForAnyAvailableSlot(
  slotStaffIds: string[],
  allStaff: Array<{ id: string; display_order: number }>
): string | null {
  if (!slotStaffIds || slotStaffIds.length === 0) return null;

  const candidateStaff = allStaff.filter((s) => slotStaffIds.includes(s.id));
  candidateStaff.sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.id.localeCompare(b.id);
  });

  return candidateStaff[0]?.id || slotStaffIds[0] || null;
}
