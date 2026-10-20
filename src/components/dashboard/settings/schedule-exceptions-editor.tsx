"use client";

import { useState } from "react";
import {
  CalendarOff,
  Plus,
  Trash2,
  AlertCircle,
  Tag,
} from "lucide-react";
import type { ScheduleException } from "@/features/organizations/types";
import {
  saveScheduleException,
  deleteScheduleException,
} from "@/features/organizations/settings-server";

interface ScheduleExceptionsEditorProps {
  businessId: string;
  initialExceptions: ScheduleException[];
  onExceptionsChange?: (exceptions: ScheduleException[]) => void;
  disabled?: boolean;
}

export function ScheduleExceptionsEditor({
  businessId,
  initialExceptions,
  onExceptionsChange,
  disabled,
}: ScheduleExceptionsEditorProps) {
  const [exceptions, setExceptions] = useState<ScheduleException[]>(initialExceptions);
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [isClosed, setIsClosed] = useState(true);
  const [openTime, setOpenTime] = useState("10:00");
  const [closeTime, setCloseTime] = useState("14:00");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddException = async () => {
    if (!newDate) {
      setErrorMessage("Please choose a date.");
      return;
    }

    if (exceptions.some((e) => e.exception_date === newDate)) {
      setErrorMessage(`An exception is already configured for ${newDate}.`);
      return;
    }

    if (!isClosed && openTime >= closeTime) {
      setErrorMessage("Closing time must follow opening time for special opening hours.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        exception_date: newDate,
        is_closed: isClosed,
        open_time: isClosed ? null : openTime,
        close_time: isClosed ? null : closeTime,
        reason: reason.trim() || null,
      };

      const res = await saveScheduleException(businessId, payload);
      if (res.success) {
        const updated = [...exceptions, payload].sort((a, b) =>
          a.exception_date.localeCompare(b.exception_date)
        );
        setExceptions(updated);
        onExceptionsChange?.(updated);
        setIsAdding(false);
        setNewDate("");
        setReason("");
      } else {
        setErrorMessage(res.error || "Failed to save exception.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving schedule exception.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (exceptionDate: string, exceptionId?: string) => {
    if (disabled) return;

    if (exceptionId) {
      setIsSubmitting(true);
      await deleteScheduleException(businessId, exceptionId);
      setIsSubmitting(false);
    }

    const updated = exceptions.filter((e) => e.exception_date !== exceptionDate);
    setExceptions(updated);
    onExceptionsChange?.(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <CalendarOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Holidays & Special Closures
            </p>
            <p className="text-xs text-zinc-500">
              Configure bank holidays, planned vacations, or date-specific special operating hours.
            </p>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={disabled || isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Holiday / Exception</span>
          </button>
        )}
      </div>

      {/* Add New Exception Form Box */}
      {isAdding && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              New Special Exception
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setErrorMessage(null);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Calendar Date (Local Business Date)
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Reason / Holiday Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Christmas Day, Bank Holiday, Staff Training"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                maxLength={100}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Exception Type */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exceptionType"
                checked={isClosed}
                onChange={() => {
                  setIsClosed(true);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Full-Day Closed</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exceptionType"
                checked={!isClosed}
                onChange={() => {
                  setIsClosed(false);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Special Operating Hours (Partial Open)</span>
            </label>
          </div>

          {/* Special Hours Inputs */}
          {!isClosed && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Open from:</span>
              <input
                type="time"
                value={openTime}
                onChange={(e) => {
                  setOpenTime(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">to</span>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => {
                  setCloseTime(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleAddException}
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Exception"}
            </button>
          </div>
        </div>
      )}

      {/* Exceptions List */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {exceptions.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            No special closures or holidays scheduled yet. Click &quot;Add Holiday / Exception&quot; to define upcoming closures.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {exceptions.map((exc) => (
              <div
                key={exc.exception_date}
                className="flex items-center justify-between p-3.5 sm:px-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                    {exc.exception_date}
                  </span>
                  {exc.is_closed ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      Closed All Day
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                      Special: {exc.open_time} - {exc.close_time}
                    </span>
                  )}
                  {exc.reason && (
                    <span className="text-zinc-500 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>{exc.reason}</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(exc.exception_date, exc.id)}
                  disabled={disabled || isSubmitting}
                  className="rounded-md p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Remove this exception"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
