/**
 * BookPilot AI — Calendar & Agenda Layout Utilities
 * Deterministic concurrent slot clustering, collision-free partition, and booking source detection.
 */

import type { AppointmentWithDetails } from "./types";
import { formatInstantInTimeZone } from "./timezone";

export interface PositionedAppointment {
  appointment: AppointmentWithDetails;
  topPx: number;
  heightPx: number;
  startStr: string;
  endStr: string;
  durationMinutes: number;
  colIndex: number;
  totalCols: number;
  widthPercent: number;
  leftPercent: number;
}

export type BookingSourceType = "public_wizard" | "ai_receptionist" | "whatsapp" | "walk_in";

export interface BookingSourceInfo {
  source: BookingSourceType;
  label: string;
  badgeText: string;
}

/**
 * Accurately detects the booking channel / origin of an appointment without database migrations.
 */
export function getBookingSource(appointment: AppointmentWithDetails): BookingSourceInfo {
  const notes = (appointment.notes || "").toLowerCase();

  if (notes.includes("ai receptionist") || notes.includes("ai chatbot") || notes.includes("[ai]")) {
    return {
      source: "ai_receptionist",
      label: "AI Receptionist",
      badgeText: "AI Receptionist",
    };
  }

  if (notes.includes("whatsapp") || notes.includes("[whatsapp]")) {
    return {
      source: "whatsapp",
      label: "WhatsApp",
      badgeText: "WhatsApp",
    };
  }

  if (appointment.created_by) {
    return {
      source: "walk_in",
      label: "Dashboard Walk-In / Phone",
      badgeText: "Walk-In / Phone",
    };
  }

  return {
    source: "public_wizard",
    label: "Public Booking Wizard",
    badgeText: "Public Booking",
  };
}

/**
 * Calculates start/end wall-clock time strings and duration in minutes in the salon timezone.
 */
export function getAppointmentTimeDetails(
  app: AppointmentWithDetails,
  businessTimezone: string
): {
  startStr: string;
  endStr: string;
  durationMinutes: number;
  startMinutesFromMidnight: number;
  endMinutesFromMidnight: number;
} {
  const start = new Date(app.starts_at);
  const end = new Date(app.service_ends_at);

  const startFormatted = formatInstantInTimeZone(start, businessTimezone);
  const endFormatted = formatInstantInTimeZone(end, businessTimezone);

  const startStr = startFormatted.timeStr;
  const endStr = endFormatted.timeStr;

  const [sH, sM] = startStr.split(":").map(Number);

  const startMinutesFromMidnight = (sH || 0) * 60 + (sM || 0);

  // Use actual UTC epoch delta to avoid cross-midnight calculation bugs
  const epochDuration = Math.round((end.getTime() - start.getTime()) / 60000);
  const durationMinutes = Math.max(
    15,
    Number.isFinite(epochDuration) && epochDuration > 0
      ? epochDuration
      : app.duration_minutes_snapshot || 30
  );

  const endMinutesFromMidnight = startMinutesFromMidnight + durationMinutes;

  return {
    startStr,
    endStr,
    durationMinutes,
    startMinutesFromMidnight,
    endMinutesFromMidnight,
  };
}

/**
 * Computes side-by-side columns for overlapping appointments in day view timeline.
 * Ensures simultaneous bookings (e.g. Daniel QA and Emma QA both at 10:00)
 * render in distinct lanes side-by-side with zero collision and full legibility.
 */
export function computeConcurrentAppointmentColumns(
  appointments: AppointmentWithDetails[],
  businessTimezone: string,
  startHourGrid = 8,
  hourHeightPx = 64
): PositionedAppointment[] {
  if (!appointments || appointments.length === 0) {
    return [];
  }

  const pxPerMinute = hourHeightPx / 60;

  // 1. Calculate time bounds and offsets for each appointment
  const items = appointments.map((app) => {
    const details = getAppointmentTimeDetails(app, businessTimezone);
    const startMinutesFromGrid = details.startMinutesFromMidnight - startHourGrid * 60;
    const topPx = Math.max(0, startMinutesFromGrid * pxPerMinute);
    const heightPx = Math.max(28, details.durationMinutes * pxPerMinute);

    return {
      appointment: app,
      startMinutes: details.startMinutesFromMidnight,
      endMinutes: details.endMinutesFromMidnight,
      topPx,
      heightPx,
      startStr: details.startStr,
      endStr: details.endStr,
      durationMinutes: details.durationMinutes,
    };
  });

  // Sort chronologically by startMinutes ascending, then by endMinutes, then by staff ID
  items.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    if (a.endMinutes !== b.endMinutes) return a.endMinutes - b.endMinutes;
    return (a.appointment.staff_id || "").localeCompare(b.appointment.staff_id || "");
  });

  // 2. Group into overlapping clusters (connected components)
  // An appointment belongs to the current cluster if its start is strictly before the cluster's max end time
  const clusters: Array<typeof items> = [];
  let currentCluster: typeof items = [];
  let clusterMaxEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterMaxEnd = item.endMinutes;
    } else if (item.startMinutes < clusterMaxEnd) {
      // Overlaps with current cluster
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.endMinutes);
    } else {
      // Starts at or after clusterMaxEnd -> new cluster
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = item.endMinutes;
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. For each cluster, allocate columns using greedy lane assignment
  const positioned: PositionedAppointment[] = [];

  for (const cluster of clusters) {
    // Array of column end times in minutes
    const colEndTimes: number[] = [];
    const itemAssignments: Array<{ item: (typeof cluster)[0]; colIndex: number }> = [];

    for (const item of cluster) {
      // Find the first column where the previous appointment has finished (colEndTime <= item.startMinutes)
      let assignedCol = -1;
      for (let c = 0; c < colEndTimes.length; c++) {
        if (colEndTimes[c] <= item.startMinutes) {
          assignedCol = c;
          colEndTimes[c] = item.endMinutes;
          break;
        }
      }

      if (assignedCol === -1) {
        // Need a new column
        assignedCol = colEndTimes.length;
        colEndTimes.push(item.endMinutes);
      }

      itemAssignments.push({ item, colIndex: assignedCol });
    }

    const totalCols = Math.max(1, colEndTimes.length);
    const widthPercent = 100 / totalCols;

    for (const { item, colIndex } of itemAssignments) {
      positioned.push({
        appointment: item.appointment,
        topPx: item.topPx,
        heightPx: item.heightPx,
        startStr: item.startStr,
        endStr: item.endStr,
        durationMinutes: item.durationMinutes,
        colIndex,
        totalCols,
        widthPercent,
        leftPercent: colIndex * widthPercent,
      });
    }
  }

  return positioned;
}
