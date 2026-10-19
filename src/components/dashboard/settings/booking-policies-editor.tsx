"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { BookingPolicy } from "@/features/organizations/types";
import { Badge } from "@/components/ui/badge";

interface BookingPoliciesEditorProps {
  initialPolicy: BookingPolicy;
  onChange: (policy: BookingPolicy) => void;
  disabled?: boolean;
}

export function BookingPoliciesEditor({
  initialPolicy,
  onChange,
  disabled,
}: BookingPoliciesEditorProps) {
  const [policy, setPolicy] = useState<BookingPolicy>(initialPolicy);

  const handleChange = <K extends keyof BookingPolicy>(field: K, val: BookingPolicy[K]) => {
    const updated = { ...policy, [field]: val };
    setPolicy(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Informational Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                Booking Notice & Cancellation Policies
              </span>
              <Badge variant="warning" className="text-[10px] uppercase font-bold">
                Configured — activates when online booking launches
              </Badge>
            </div>
            <p className="mt-1 text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
              These policies configure lead times, buffers, and cancellation deadlines. In Phase 1C, your rules are securely saved and will be strictly enforced once the deterministic booking engine is released (Phase 1E).
            </p>
          </div>
        </div>
      </div>

      {/* Policy Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Min Notice Hours */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="min-notice-hours"
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Minimum Booking Notice
            </label>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {policy.min_notice_hours} hours
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            How many hours in advance must a customer schedule an appointment. Prevents last-minute surprises.
          </p>
          <input
            id="min-notice-hours"
            type="number"
            min={0}
            max={720}
            value={policy.min_notice_hours}
            onChange={(e) =>
              handleChange("min_notice_hours", Math.max(0, parseInt(e.target.value, 10) || 0))
            }
            disabled={disabled}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Max Advance Days */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="max-advance-days"
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Maximum Advance Window
            </label>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {policy.max_advance_days} days
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            The farthest into the future customers can book slots (e.g. 30, 60, or 90 days).
          </p>
          <input
            id="max-advance-days"
            type="number"
            min={1}
            max={365}
            value={policy.max_advance_days}
            onChange={(e) =>
              handleChange("max_advance_days", Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            disabled={disabled}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Cancellation Notice Period */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="cancellation-notice"
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Cancellation Notice Period
            </label>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {policy.cancellation_notice_hours} hours
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Minimum lead time before an appointment start time for penalty-free customer self-cancellation.
          </p>
          <input
            id="cancellation-notice"
            type="number"
            min={0}
            max={720}
            value={policy.cancellation_notice_hours}
            onChange={(e) =>
              handleChange(
                "cancellation_notice_hours",
                Math.max(0, parseInt(e.target.value, 10) || 0)
              )
            }
            disabled={disabled}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Appointment Buffer Preference */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="default-buffer"
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Default Service Buffer
            </label>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {policy.default_buffer_minutes} min
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Preparation and sanitization buffer automatically padded between consecutive appointments.
          </p>
          <select
            id="default-buffer"
            value={policy.default_buffer_minutes}
            onChange={(e) =>
              handleChange("default_buffer_minutes", parseInt(e.target.value, 10) || 0)
            }
            disabled={disabled}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value={0}>0 minutes (Back-to-back)</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes (Recommended)</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>
      </div>

      {/* Online Appointment Requests Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Enable Online Appointment Requests
            </span>
            <Badge variant="outline" className="text-[10px]">
              Ready for Phase 1E
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">
            Allow public clients to request appointments directly through your public booking link.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={policy.online_booking_enabled}
            onChange={(e) => handleChange("online_booking_enabled", e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Cancellation Policy Description Text */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2">
        <label
          htmlFor="cancellation-policy-text"
          className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Customer-Facing Cancellation Policy Wording
        </label>
        <p className="text-[11px] text-zinc-500">
          This policy explanation will be displayed to customers during the checkout and booking confirmation steps.
        </p>
        <textarea
          id="cancellation-policy-text"
          rows={3}
          value={policy.cancellation_policy_text || ""}
          onChange={(e) => handleChange("cancellation_policy_text", e.target.value)}
          placeholder="e.g. Please give at least 24 hours notice to cancel or reschedule your appointment without fee."
          maxLength={1000}
          disabled={disabled}
          className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
    </div>
  );
}
