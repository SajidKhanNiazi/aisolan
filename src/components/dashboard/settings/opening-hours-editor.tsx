"use client";

import { useState } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
} from "lucide-react";
import type { OpeningHourInterval } from "@/features/organizations/types";
import {
  timeStringToMinutes,
  hasOverlappingIntervals,
} from "@/features/organizations/validation";

interface OpeningHoursEditorProps {
  initialHours: OpeningHourInterval[];
  onChange: (hours: OpeningHourInterval[]) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  { index: 1, name: "Monday", short: "Mon" },
  { index: 2, name: "Tuesday", short: "Tue" },
  { index: 3, name: "Wednesday", short: "Wed" },
  { index: 4, name: "Thursday", short: "Thu" },
  { index: 5, name: "Friday", short: "Fri" },
  { index: 6, name: "Saturday", short: "Sat" },
  { index: 0, name: "Sunday", short: "Sun" },
];

export function OpeningHoursEditor({
  initialHours,
  onChange,
  disabled,
}: OpeningHoursEditorProps) {
  const [hours, setHours] = useState<OpeningHourInterval[]>(initialHours);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [selectedCopyTargets, setSelectedCopyTargets] = useState<number[]>([2, 3, 4, 5]); // Default Tue-Fri

  const updateHoursAndNotify = (newHours: OpeningHourInterval[]) => {
    setHours(newHours);
    onChange(newHours);
  };

  const handleToggleClosed = (dayIndex: number) => {
    const dayIntervals = hours.filter((h) => h.day_of_week === dayIndex);
    const currentlyClosed = dayIntervals.length === 0 || dayIntervals.every((h) => h.is_closed);

    if (currentlyClosed) {
      // Re-open with default 09:00 - 17:00
      const otherDays = hours.filter((h) => h.day_of_week !== dayIndex);
      const newInterval: OpeningHourInterval = {
        day_of_week: dayIndex,
        is_closed: false,
        open_time: "09:00",
        close_time: "17:00",
      };
      updateHoursAndNotify([...otherDays, newInterval]);
    } else {
      // Set to closed
      const otherDays = hours.filter((h) => h.day_of_week !== dayIndex);
      const closedInterval: OpeningHourInterval = {
        day_of_week: dayIndex,
        is_closed: true,
        open_time: null,
        close_time: null,
      };
      updateHoursAndNotify([...otherDays, closedInterval]);
    }
  };

  const handleAddInterval = (dayIndex: number) => {
    const dayIntervals = hours.filter((h) => h.day_of_week === dayIndex && !h.is_closed);
    // Find next non-overlapping default slot or 14:00-18:00
    let nextOpen = "14:00";
    let nextClose = "18:00";

    if (dayIntervals.length > 0) {
      const lastInterval = dayIntervals[dayIntervals.length - 1];
      if (lastInterval.close_time) {
        const lastMinutes = timeStringToMinutes(lastInterval.close_time);
        const startHour = Math.min(22, Math.floor(lastMinutes / 60) + 1);
        const endHour = Math.min(23, startHour + 3);
        nextOpen = `${String(startHour).padStart(2, "0")}:00`;
        nextClose = `${String(endHour).padStart(2, "0")}:00`;
      }
    }

    const newInterval: OpeningHourInterval = {
      day_of_week: dayIndex,
      is_closed: false,
      open_time: nextOpen,
      close_time: nextClose,
    };

    updateHoursAndNotify([...hours, newInterval]);
  };

  const handleRemoveInterval = (dayIndex: number, intervalIndex: number) => {
    const dayIntervals = hours.filter((h) => h.day_of_week === dayIndex);
    if (dayIntervals.length <= 1) {
      // If removing the only interval, mark as closed
      const otherDays = hours.filter((h) => h.day_of_week !== dayIndex);
      updateHoursAndNotify([
        ...otherDays,
        { day_of_week: dayIndex, is_closed: true, open_time: null, close_time: null },
      ]);
    } else {
      const remainingDayIntervals = dayIntervals.filter((_, idx) => idx !== intervalIndex);
      const otherDays = hours.filter((h) => h.day_of_week !== dayIndex);
      updateHoursAndNotify([...otherDays, ...remainingDayIntervals]);
    }
  };

  const handleTimeChange = (
    dayIndex: number,
    intervalIndex: number,
    field: "open_time" | "close_time",
    val: string
  ) => {
    const dayIntervals = hours.filter((h) => h.day_of_week === dayIndex);
    const updatedDayIntervals = dayIntervals.map((inv, idx) => {
      if (idx === intervalIndex) {
        return { ...inv, [field]: val };
      }
      return inv;
    });

    const otherDays = hours.filter((h) => h.day_of_week !== dayIndex);
    updateHoursAndNotify([...otherDays, ...updatedDayIntervals]);
  };

  // Copy Monday's intervals to selected target days
  const handleExecuteCopy = () => {
    const mondayIntervals = hours.filter((h) => h.day_of_week === 1);
    if (mondayIntervals.length === 0) return;

    const remainingHours = hours.filter((h) => !selectedCopyTargets.includes(h.day_of_week));
    const copiedIntervals: OpeningHourInterval[] = [];

    for (const targetDay of selectedCopyTargets) {
      for (const inv of mondayIntervals) {
        copiedIntervals.push({
          day_of_week: targetDay,
          is_closed: inv.is_closed,
          open_time: inv.open_time,
          close_time: inv.close_time,
        });
      }
    }

    updateHoursAndNotify([...remainingHours, ...copiedIntervals]);
    setCopyModalOpen(false);
  };

  // Get errors for a day
  const getDayErrors = (dayIndex: number) => {
    const dayIntervals = hours.filter((h) => h.day_of_week === dayIndex && !h.is_closed);
    const errors: string[] = [];

    for (const inv of dayIntervals) {
      if (inv.open_time && inv.close_time) {
        if (timeStringToMinutes(inv.open_time) >= timeStringToMinutes(inv.close_time)) {
          errors.push(`Closing time (${inv.close_time}) must be after opening time (${inv.open_time})`);
        }
      }
    }

    if (hasOverlappingIntervals(dayIntervals)) {
      errors.push("Intervals overlap with each other.");
    }

    return errors;
  };

  return (
    <div className="space-y-6">
      {/* Top action bar: Weekly summary & Copy button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Weekly Operating Schedule
            </p>
            <p className="text-xs text-zinc-500">
              Set the opening and closing windows during which appointments can be booked.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCopyModalOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <Copy className="h-3.5 w-3.5" />
          <span>Copy Monday&apos;s Hours</span>
        </button>
      </div>

      {/* Days List */}
      <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {DAYS_OF_WEEK.map((day) => {
          const dayIntervals = hours.filter((h) => h.day_of_week === day.index);
          const isClosed = dayIntervals.length === 0 || dayIntervals.every((h) => h.is_closed);
          const errors = getDayErrors(day.index);

          return (
            <div key={day.index} className="p-4 sm:p-5 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Day title & Closed toggle */}
                <div className="flex items-center justify-between sm:w-44 flex-shrink-0">
                  <div>
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {day.name}
                    </span>
                    <div className="text-xs">
                      {isClosed ? (
                        <span className="text-zinc-400 dark:text-zinc-500">Closed All Day</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Open</span>
                      )}
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!isClosed}
                      onChange={() => handleToggleClosed(day.index)}
                      disabled={disabled}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Intervals */}
                <div className="flex-1 space-y-2.5">
                  {isClosed ? (
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-400 italic dark:bg-zinc-800/40">
                      Business is closed on this day.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayIntervals.map((inv, invIdx) => (
                        <div
                          key={invIdx}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2"
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                            <input
                              type="time"
                              value={inv.open_time || "09:00"}
                              onChange={(e) =>
                                handleTimeChange(day.index, invIdx, "open_time", e.target.value)
                              }
                              disabled={disabled}
                              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                            <span className="text-xs text-zinc-400 font-medium">to</span>
                            <input
                              type="time"
                              value={inv.close_time || "17:00"}
                              onChange={(e) =>
                                handleTimeChange(day.index, invIdx, "close_time", e.target.value)
                              }
                              disabled={disabled}
                              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveInterval(day.index, invIdx)}
                            disabled={disabled}
                            title="Remove interval"
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {/* Add Interval Button */}
                      <button
                        type="button"
                        onClick={() => handleAddInterval(day.index)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium pt-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add another interval (e.g. split shift or lunch break)</span>
                      </button>
                    </div>
                  )}

                  {/* Validation errors */}
                  {errors.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {errors.map((err, errIdx) => (
                        <div
                          key={errIdx}
                          className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"
                        >
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Copy Monday Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Copy Monday&apos;s Hours
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Select which days should be overwritten with Monday&apos;s schedule:
            </p>

            <div className="mt-4 space-y-2">
              {DAYS_OF_WEEK.filter((d) => d.index !== 1).map((d) => (
                <label
                  key={d.index}
                  className="flex items-center gap-2.5 rounded-lg border border-zinc-200 p-2.5 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCopyTargets.includes(d.index)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCopyTargets((prev) => [...prev, d.index]);
                      } else {
                        setSelectedCopyTargets((prev) => prev.filter((id) => id !== d.index));
                      }
                    }}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {d.name}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCopy}
                disabled={selectedCopyTargets.length === 0}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                Apply to {selectedCopyTargets.length} Day(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
