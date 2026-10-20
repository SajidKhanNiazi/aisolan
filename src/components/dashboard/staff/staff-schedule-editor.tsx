"use client";

import { useState } from "react";
import type { StaffWorkingHourInterval, StaffBreak, StaffWithServices } from "@/features/staff/types";
import { updateStaffWeeklySchedule, addStaffBreak, deleteStaffBreak } from "@/features/staff/server";
import { hasOverlappingIntervals, timeStringToMinutes } from "@/features/organizations/validation";
import {
  normalizeTimeHHMM,
  isBreakWithinWorkingHours,
  hasOverlappingBreaks,
} from "@/features/staff/validation";
import {
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  Coffee,
  AlertTriangle,
  ArrowLeft,
  X,
} from "lucide-react";
import Link from "next/link";

const DAYS_OF_WEEK = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 0, name: "Sunday" },
];

interface StaffScheduleEditorProps {
  staff: StaffWithServices;
  initialWorkingHours: StaffWorkingHourInterval[];
  initialBreaks: StaffBreak[];
  businessOpeningHours: { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null }[];
  businessId: string;
  businessSlug: string;
  timezone: string;
}

export function StaffScheduleEditor({
  staff,
  initialWorkingHours,
  initialBreaks,
  businessOpeningHours,
  businessId,
  businessSlug,
  timezone,
}: StaffScheduleEditorProps) {
  // Ensure default 7-day structure if initialWorkingHours is empty, and normalize times from PostgreSQL
  const buildInitialSchedule = (): StaffWorkingHourInterval[] => {
    if (initialWorkingHours.length > 0) {
      return initialWorkingHours.map((inv) => ({
        ...inv,
        open_time: normalizeTimeHHMM(inv.open_time),
        close_time: normalizeTimeHHMM(inv.close_time),
      }));
    }
    return DAYS_OF_WEEK.map((d) => ({
      day_of_week: d.id,
      is_working: d.id !== 0, // default Mon-Sat working, Sun off
      open_time: d.id !== 0 ? "09:00" : null,
      close_time: d.id !== 0 ? "17:00" : null,
    }));
  };

  const [intervals, setIntervals] = useState<StaffWorkingHourInterval[]>(buildInitialSchedule());
  const [breaks, setBreaks] = useState<StaffBreak[]>(
    initialBreaks.map((b) => ({
      ...b,
      start_time: normalizeTimeHHMM(b.start_time) || b.start_time,
      end_time: normalizeTimeHHMM(b.end_time) || b.end_time,
    }))
  );

  // Copy Tool State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [sourceDay, setSourceDay] = useState<number>(1); // Monday
  const [targetDays, setTargetDays] = useState<number[]>([2, 3, 4, 5]);

  // Break Form State
  const [isAddBreakOpen, setIsAddBreakOpen] = useState(false);
  const [breakDay, setBreakDay] = useState<number>(1);
  const [breakTitle, setBreakTitle] = useState("Lunch Break");
  const [breakStart, setBreakStart] = useState("13:00");
  const [breakEnd, setBreakEnd] = useState("14:00");

  // Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Day toggle
  const toggleDayWorking = (dayId: number) => {
    const dayIntervals = intervals.filter((i) => i.day_of_week === dayId);
    const currentlyWorking = dayIntervals.some((i) => i.is_working);

    if (currentlyWorking) {
      // Set to off
      setIntervals((prev) => [
        ...prev.filter((i) => i.day_of_week !== dayId),
        { day_of_week: dayId, is_working: false, open_time: null, close_time: null },
      ]);
    } else {
      // Set to working default
      setIntervals((prev) => [
        ...prev.filter((i) => i.day_of_week !== dayId),
        { day_of_week: dayId, is_working: true, open_time: "09:00", close_time: "17:00" },
      ]);
    }
  };

  // Add split interval
  const addSplitInterval = (dayId: number) => {
    setIntervals((prev) => [
      ...prev,
      { day_of_week: dayId, is_working: true, open_time: "14:00", close_time: "18:00" },
    ]);
  };

  // Remove interval
  const removeInterval = (indexToRemove: number, dayId: number) => {
    const dayIntervals = intervals.filter((i) => i.day_of_week === dayId);
    if (dayIntervals.length <= 1) {
      // Toggle off instead of empty
      toggleDayWorking(dayId);
      return;
    }
    setIntervals((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Update interval times
  const updateIntervalTime = (
    intervalIndex: number,
    field: "open_time" | "close_time",
    value: string
  ) => {
    setIntervals((prev) =>
      prev.map((item, idx) => (idx === intervalIndex ? { ...item, [field]: value } : item))
    );
  };

  // Copy hours
  const handleCopyHours = () => {
    const sourceIntervals = intervals.filter((i) => i.day_of_week === sourceDay);
    if (sourceIntervals.length === 0) return;

    const updated = intervals.filter((i) => !targetDays.includes(i.day_of_week));
    for (const targetDay of targetDays) {
      for (const src of sourceIntervals) {
        updated.push({
          ...src,
          day_of_week: targetDay,
          id: undefined,
        });
      }
    }
    setIntervals(updated);
    setIsCopyModalOpen(false);
    setSuccessMessage(`Copied ${DAYS_OF_WEEK.find((d) => d.id === sourceDay)?.name}'s hours.`);
  };

  // Save Schedule
  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate intervals
    for (const day of DAYS_OF_WEEK) {
      const active = intervals.filter((i) => i.day_of_week === day.id && i.is_working);
      if (active.length > 1) {
        const hasOverlap = hasOverlappingIntervals(
          active.map((a) => ({
            open_time: normalizeTimeHHMM(a.open_time),
            close_time: normalizeTimeHHMM(a.close_time),
          }))
        );
        if (hasOverlap) {
          setErrorMessage(`Overlapping working intervals detected on ${day.name}.`);
          setIsSaving(false);
          return;
        }
      }
      for (const inv of active) {
        const normOpen = normalizeTimeHHMM(inv.open_time);
        const normClose = normalizeTimeHHMM(inv.close_time);
        if (!normOpen || !normClose || timeStringToMinutes(normOpen) >= timeStringToMinutes(normClose)) {
          setErrorMessage(`End time must follow start time on ${day.name}.`);
          setIsSaving(false);
          return;
        }
      }
    }

    const payload = intervals.map((inv) => ({
      day_of_week: inv.day_of_week,
      is_working: inv.is_working,
      open_time: inv.is_working ? normalizeTimeHHMM(inv.open_time) : null,
      close_time: inv.is_working ? normalizeTimeHHMM(inv.close_time) : null,
    }));

    const res = await updateStaffWeeklySchedule(businessId, staff.id, payload, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to save staff schedule.");
      setIsSaving(false);
      return;
    }

    // Keep state in normalized format
    setIntervals((prev) =>
      prev.map((i) => ({
        ...i,
        open_time: normalizeTimeHHMM(i.open_time),
        close_time: normalizeTimeHHMM(i.close_time),
      }))
    );

    setSuccessMessage(`Weekly working schedule saved for ${staff.display_name}.`);
    setIsSaving(false);
  };

  // Add Break
  const handleAddBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    const normStart = normalizeTimeHHMM(breakStart);
    const normEnd = normalizeTimeHHMM(breakEnd);
    if (!normStart || !normEnd || timeStringToMinutes(normStart) >= timeStringToMinutes(normEnd)) {
      setErrorMessage("Break end time must be after start time.");
      return;
    }

    const candidateBreak = {
      day_of_week: breakDay,
      break_title: breakTitle.trim(),
      start_time: normStart,
      end_time: normEnd,
    };

    // Client-side containment check against staff's working hours
    if (!isBreakWithinWorkingHours(candidateBreak, intervals)) {
      setErrorMessage("Break must fall entirely within working hours on this day.");
      return;
    }

    // Client-side overlap check against existing breaks on this weekday
    const dayBreaks = breaks.filter((b) => b.day_of_week === breakDay);
    if (hasOverlappingBreaks([...dayBreaks, candidateBreak])) {
      setErrorMessage("Break overlaps with an existing scheduled break on this day.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const res = await addStaffBreak(businessId, staff.id, candidateBreak, businessSlug);
    if (!res.success || !res.breakItem) {
      setErrorMessage(res.error || "Failed to add break.");
      setIsSaving(false);
      return;
    }

    setBreaks((prev) => [
      ...prev,
      {
        ...res.breakItem!,
        start_time: normalizeTimeHHMM(res.breakItem!.start_time) || res.breakItem!.start_time,
        end_time: normalizeTimeHHMM(res.breakItem!.end_time) || res.breakItem!.end_time,
      },
    ]);
    setIsAddBreakOpen(false);
    setIsSaving(false);
    setSuccessMessage(`Added "${res.breakItem.break_title}" on ${DAYS_OF_WEEK.find((d) => d.id === breakDay)?.name}.`);
  };

  // Delete Break
  const handleDeleteBreak = async (breakId: string, title: string) => {
    const res = await deleteStaffBreak(businessId, staff.id, breakId, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to delete break.");
      return;
    }
    setBreaks((prev) => prev.filter((b) => b.id !== breakId));
    setSuccessMessage(`Break "${title}" removed.`);
  };

  // Business Hours Warning Check Helper
  const checkOutsideBusinessHours = (inv: StaffWorkingHourInterval) => {
    if (!inv.is_working || !inv.open_time || !inv.close_time) return false;
    const bizDay = businessOpeningHours.find((b) => b.day_of_week === inv.day_of_week);
    if (!bizDay || bizDay.is_closed || !bizDay.open_time || !bizDay.close_time) return true; // Biz closed!

    const sOpen = timeStringToMinutes(inv.open_time);
    const sClose = timeStringToMinutes(inv.close_time);
    const bOpen = timeStringToMinutes(bizDay.open_time);
    const bClose = timeStringToMinutes(bizDay.close_time);

    return sOpen < bOpen || sClose > bClose;
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/${businessSlug}/staff`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Team Directory
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {staff.display_name} — Shifts & Breaks
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Configure weekly working hours and scheduled breaks in salon local time ({timezone}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCopyModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Copy className="h-4 w-4 text-zinc-500" />
            Copy Hours
          </button>

          <button
            type="button"
            onClick={() => setIsAddBreakOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Coffee className="h-4 w-4 text-amber-600" />
            Add Break
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveSchedule}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs sm:text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4 text-emerald-600 hover:opacity-75" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs sm:text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)}>
            <X className="h-4 w-4 text-rose-600 hover:opacity-75" />
          </button>
        </div>
      )}

      {/* Weekly Schedule Days */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
          Weekly Working Intervals
        </h2>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {DAYS_OF_WEEK.map((day) => {
            const dayIntervals = intervals
              .map((item, idx) => ({ ...item, originalIndex: idx }))
              .filter((i) => i.day_of_week === day.id);

            const isWorking = dayIntervals.some((i) => i.is_working);
            const dayBreaks = breaks.filter((b) => b.day_of_week === day.id);

            return (
              <div key={day.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDayWorking(day.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isWorking ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          isWorking ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 min-w-28">
                      {day.name}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        isWorking
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {isWorking ? "Working" : "Off Duty"}
                    </span>
                  </div>

                  {isWorking && (
                    <button
                      type="button"
                      onClick={() => addSplitInterval(day.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Shift Split
                    </button>
                  )}
                </div>

                {isWorking && (
                  <div className="pl-0 sm:pl-14 space-y-2">
                    {dayIntervals.map((inv) => {
                      const isOutsideBiz = checkOutsideBusinessHours(inv);
                      return (
                        <div
                          key={inv.originalIndex}
                          className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={inv.open_time || "09:00"}
                              onChange={(e) =>
                                updateIntervalTime(inv.originalIndex, "open_time", e.target.value)
                              }
                              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                            <span className="text-xs text-zinc-400">to</span>
                            <input
                              type="time"
                              value={inv.close_time || "17:00"}
                              onChange={(e) =>
                                updateIntervalTime(inv.originalIndex, "close_time", e.target.value)
                              }
                              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </div>

                          {isOutsideBiz && (
                            <span
                              title="This shift extends outside general salon business hours or occurs on a closed day."
                              className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Outside salon hours
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => removeInterval(inv.originalIndex, day.id)}
                            className="ml-auto text-zinc-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove interval"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Day Breaks List */}
                    {dayBreaks.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {dayBreaks.map((b) => (
                          <div
                            key={b.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                          >
                            <Coffee className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold">{b.break_title}:</span>
                            <span>
                              {b.start_time}–{b.end_time}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteBreak(b.id, b.break_title)}
                              className="text-amber-600 hover:text-rose-600 ml-1"
                              title="Delete break"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Copy Hours Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Copy Working Hours</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Apply working intervals from one day to multiple other weekdays.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Copy From
                </label>
                <select
                  value={sourceDay}
                  onChange={(e) => setSourceDay(parseInt(e.target.value, 10))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Copy To
                </label>
                <div className="space-y-1.5">
                  {DAYS_OF_WEEK.filter((d) => d.id !== sourceDay).map((d) => {
                    const isChecked = targetDays.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setTargetDays((prev) =>
                              prev.includes(d.id)
                                ? prev.filter((id) => id !== d.id)
                                : [...prev, d.id]
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{d.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyHours}
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Apply Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Break Modal */}
      {isAddBreakOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Add Staff Break</h2>
              <button
                type="button"
                onClick={() => setIsAddBreakOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddBreak} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Day of Week
                </label>
                <select
                  value={breakDay}
                  onChange={(e) => setBreakDay(parseInt(e.target.value, 10))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Break Title / Label
                </label>
                <input
                  type="text"
                  required
                  value={breakTitle}
                  onChange={(e) => setBreakTitle(e.target.value)}
                  placeholder="e.g. Lunch, Afternoon Break"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddBreakOpen(false)}
                  className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Add Break"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
