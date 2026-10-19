"use client";

import { useState } from "react";
import { Globe, Check, Sparkles } from "lucide-react";
import { IANA_TIMEZONES, isValidIanaTimezone } from "@/features/organizations/validation";

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
}

export function TimezoneSelector({ value, onChange, disabled }: TimezoneSelectorProps) {
  // Lazily detect browser timezone on client without causing cascading render warnings
  const [detectedTimezone] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return browserTz && isValidIanaTimezone(browserTz) ? browserTz : null;
    } catch {
      return null;
    }
  });

  const handleApplyDetected = () => {
    if (detectedTimezone) {
      onChange(detectedTimezone);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="business-timezone" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Business Operating Timezone
        </label>
        {detectedTimezone && detectedTimezone !== value && (
          <button
            type="button"
            onClick={handleApplyDetected}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Use browser timezone ({detectedTimezone})</span>
          </button>
        )}
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          <Globe className="h-4 w-4" />
        </div>
        <select
          id="business-timezone"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          disabled={disabled}
          className="block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {/* Ensure currently selected value is present even if not in standard list */}
          {value && !IANA_TIMEZONES.includes(value as typeof IANA_TIMEZONES[number]) && (
            <option value={value}>{value} (Current)</option>
          )}
          {detectedTimezone && !IANA_TIMEZONES.includes(detectedTimezone as typeof IANA_TIMEZONES[number]) && (
            <option value={detectedTimezone}>{detectedTimezone} (Detected)</option>
          )}
          {IANA_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>
          Timezone confirmed: <code className="font-semibold text-zinc-700 dark:text-zinc-300">{value}</code>. All future appointment slots and reminders will compute relative to this timezone.
        </span>
      </div>
    </div>
  );
}
