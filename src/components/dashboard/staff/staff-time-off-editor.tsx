"use client";

import { useState } from "react";
import type { StaffTimeOff, StaffWithServices, StaffTimeOffReason } from "@/features/staff/types";
import { addStaffTimeOff, deleteStaffTimeOff } from "@/features/staff/server";
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  X,
  Palmtree,
  Stethoscope,
  GraduationCap,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

interface StaffTimeOffEditorProps {
  staff: StaffWithServices;
  initialTimeOff: StaffTimeOff[];
  businessId: string;
  businessSlug: string;
  timezone: string;
}

const REASON_ICONS: Record<StaffTimeOffReason, React.ComponentType<{ className?: string }>> = {
  vacation: Palmtree,
  sick: Stethoscope,
  training: GraduationCap,
  personal: Briefcase,
  other: HelpCircle,
};

export function StaffTimeOffEditor({
  staff,
  initialTimeOff,
  businessId,
  businessSlug,
  timezone,
}: StaffTimeOffEditorProps) {
  const [timeOffList, setTimeOffList] = useState<StaffTimeOff[]>(initialTimeOff);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reasonType, setReasonType] = useState<StaffTimeOffReason>("vacation");
  const [notes, setNotes] = useState("");

  // Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
    setIsFullDay(true);
    setStartTime("09:00");
    setEndTime("13:00");
    setReasonType("vacation");
    setNotes("");
    setErrorMessage(null);
  };

  const handleAddTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      setErrorMessage("End date must be on or after start date.");
      return;
    }

    if (!isFullDay && startTime >= endTime) {
      setErrorMessage("End time must be after start time for partial-day time off.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      start_date: startDate,
      end_date: endDate,
      is_full_day: isFullDay,
      start_time: isFullDay ? null : startTime,
      end_time: isFullDay ? null : endTime,
      reason_type: reasonType,
      notes: notes.trim() || null,
    };

    const res = await addStaffTimeOff(businessId, staff.id, payload, businessSlug);
    if (!res.success || !res.timeOff) {
      setErrorMessage(res.error || "Failed to schedule time off.");
      setIsSaving(false);
      return;
    }

    setTimeOffList((prev) => [...prev, res.timeOff!]);
    setIsAddModalOpen(false);
    setIsSaving(false);
    resetForm();
    setSuccessMessage(`Scheduled time off from ${res.timeOff.start_date} to ${res.timeOff.end_date}.`);
  };

  const handleDelete = async (timeOffId: string) => {
    if (!confirm("Are you sure you want to remove this time off entry?")) return;
    const res = await deleteStaffTimeOff(businessId, staff.id, timeOffId, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to delete time off.");
      return;
    }
    setTimeOffList((prev) => prev.filter((t) => t.id !== timeOffId));
    setSuccessMessage("Time off entry removed.");
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
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
            {staff.display_name} — Time Off & Leave
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Manage vacations, sick leave, training days, and unavailable hours in local timezone ({timezone}).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Time Off
        </button>
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

      {/* Time Off List */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Scheduled Leave & Exceptions ({timeOffList.length})
        </h2>

        {timeOffList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
            <Calendar className="mx-auto h-8 w-8 text-zinc-400" />
            <p className="mt-2 text-xs sm:text-sm text-zinc-500 font-medium">
              No time off scheduled for {staff.display_name}.
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Add vacation periods or doctor appointments to prevent online bookings during leave.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {timeOffList.map((item) => {
              const Icon = REASON_ICONS[item.reason_type] || HelpCircle;
              const isMultiDay = item.start_date !== item.end_date;

              return (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                          {item.reason_type} Leave
                        </span>
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {item.is_full_day ? "Full Day" : `${item.start_time}–${item.end_time}`}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        {isMultiDay ? `${item.start_date} to ${item.end_date}` : item.start_date}
                      </p>

                      {item.notes && (
                        <p className="mt-1 text-xs text-zinc-400 italic">{item.notes}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-zinc-400 hover:text-rose-600 p-1.5 transition-colors"
                    title="Delete time off"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Time Off Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Schedule Time Off</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTimeOff} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Leave Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value as StaffTimeOffReason)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="vacation">Vacation / Holiday</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="training">Training / Education</option>
                  <option value="other">Other Reason</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="full-day-toggle"
                  checked={isFullDay}
                  onChange={(e) => setIsFullDay(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="full-day-toggle" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Full Day Leave
                </label>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required={!isFullDay}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      End Time
                    </label>
                    <input
                      type="time"
                      required={!isFullDay}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Optional Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context for this time off period..."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Add Leave Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
