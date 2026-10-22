"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Sun,
  Sunset,
  Moon,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPublicAppointmentAvailability } from "@/features/public-booking/server";
import type {
  PublicService,
  PublicSlot,
  PublicAvailabilityData,
} from "@/features/public-booking/types";

interface DateTimeStepProps {
  businessSlug: string;
  selectedService: PublicService;
  selectedStaffId: string | null;
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: PublicSlot | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: PublicSlot) => void;
  onBack: () => void;
  onContinue: () => void;
  timezone: string;
}

export function DateTimeStep({
  businessSlug,
  selectedService,
  selectedStaffId,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  onBack,
  onContinue,
  timezone,
}: DateTimeStepProps) {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<PublicAvailabilityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate next 14 calendar dates for quick selection
  const dateChips = React.useMemo(() => {
    const list: Array<{ date: string; dayName: string; dayNumber: string; monthName: string }> = [];
    const now = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);

      // Format ISO YYYY-MM-DD in business timezone
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const isoDate = `${year}-${month}-${day}`;

      const dayName = d.toLocaleDateString("en-GB", { weekday: "short" });
      const dayNumber = String(d.getDate());
      const monthName = d.toLocaleDateString("en-GB", { month: "short" });

      list.push({ date: isoDate, dayName, dayNumber, monthName });
    }
    return list;
  }, []);

  // Fetch slots whenever selectedDate, service, or staff changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchSlots() {
      setLoading(true);
      setError(null);

      try {
        const res = await getPublicAppointmentAvailability({
          businessSlug,
          serviceId: selectedService.id,
          staffId: selectedStaffId,
          staffPreference: selectedStaffId ? "specific" : "any",
          date: selectedDate,
        });

        if (isCancelled) return;

        if (res.success && res.data) {
          setAvailability(res.data);
        } else {
          setError(res.error || "Unable to load available times.");
          setAvailability(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load availability:", err);
          setError("Failed to fetch slots. Please check your network connection.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (selectedDate && selectedService?.id) {
      fetchSlots();
    }

    return () => {
      isCancelled = true;
    };
  }, [businessSlug, selectedService.id, selectedStaffId, selectedDate]);

  // Group slots into morning, afternoon, evening
  const morningSlots = availability?.slots.filter((s) => s.period === "morning") || [];
  const afternoonSlots = availability?.slots.filter((s) => s.period === "afternoon") || [];
  const eveningSlots = availability?.slots.filter((s) => s.period === "evening") || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Select Date &amp; Time
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Times shown in salon local time ({timezone}).
        </p>
      </div>

      {/* Date selector chips */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Select Date</span>
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin focus-visible:outline-none">
          {dateChips.map((chip) => {
            const isSelected = selectedDate === chip.date;
            return (
              <button
                key={chip.date}
                type="button"
                onClick={() => onSelectDate(chip.date)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[70px] py-2.5 px-3 rounded-xl border-2 transition-all cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider",
                    isSelected ? "text-blue-100" : "text-zinc-400"
                  )}
                >
                  {chip.dayName}
                </span>
                <span className="text-lg font-bold my-0.5">{chip.dayNumber}</span>
                <span
                  className={cn(
                    "text-[10px]",
                    isSelected ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {chip.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Section */}
      <div className="space-y-4 pt-2">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Available Appointment Times</span>
        </label>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-400 space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Checking live slot availability...</p>
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </Card>
        ) : availability && availability.slots.length === 0 ? (
          <Card className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            <p className="text-sm font-medium">No available slots on this date.</p>
            <p className="text-xs text-zinc-400 mt-1">
              Please choose another day or select &quot;Any Available Specialist&quot; to see more times.
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Morning */}
            {morningSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Morning</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.startsAt === slot.startsAt;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={cn(
                          "py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-blue-400"
                        )}
                      >
                        {slot.localTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Afternoon */}
            {afternoonSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <Sunset className="w-3.5 h-3.5 text-orange-500" />
                  <span>Afternoon</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.startsAt === slot.startsAt;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={cn(
                          "py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-blue-400"
                        )}
                      >
                        {slot.localTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evening */}
            {eveningSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Evening</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {eveningSlots.map((slot) => {
                    const isSelected = selectedSlot?.startsAt === slot.startsAt;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={cn(
                          "py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all text-center focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-blue-400"
                        )}
                      >
                        {slot.localTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          onClick={onContinue}
          disabled={!selectedSlot}
          size="lg"
          className="min-w-[140px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
