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
  Sparkles,
  User,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPublicAppointmentAvailability } from "@/features/public-booking/server";
import { formatCurrency } from "@/features/services/types";
import type {
  PublicService,
  PublicStaff,
  PublicSlot,
  PublicAvailabilityData,
} from "@/features/public-booking/types";

interface DateTimeStepProps {
  businessSlug: string;
  selectedService: PublicService;
  staffList?: PublicStaff[];
  allowStaffSelection?: boolean;
  selectedStaffId: string | null;
  onSelectStaff?: (staffId: string | null) => void;
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: PublicSlot | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: PublicSlot) => void;
  onBack: () => void;
  onContinue: () => void;
  timezone: string;
  currency?: string;
  conflictMessage?: string | null;
}

export function DateTimeStep({
  businessSlug,
  selectedService,
  staffList = [],
  allowStaffSelection = false,
  selectedStaffId,
  onSelectStaff,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  onBack,
  onContinue,
  timezone,
  currency = "GBP",
  conflictMessage,
}: DateTimeStepProps) {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<PublicAvailabilityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter staff to those qualified for this service (if assignedStaffIds is available)
  const qualifiedStaff = React.useMemo(() => {
    if (!allowStaffSelection || !staffList.length) return [];
    if (selectedService.assignedStaffIds && selectedService.assignedStaffIds.length > 0) {
      return staffList.filter((st) => selectedService.assignedStaffIds!.includes(st.id));
    }
    return staffList;
  }, [allowStaffSelection, staffList, selectedService]);

  // Generate next 14 calendar dates for quick selection
  const dateChips = React.useMemo(() => {
    const list: Array<{ date: string; dayName: string; dayNumber: string; monthName: string }> = [];
    const now = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);

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
      {/* Service Header Info */}
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60">
        <div>
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Selected Service
          </span>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {selectedService.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
            <span>{selectedService.durationMinutes} min</span>
            {selectedService.bufferMinutes > 0 && (
              <span>• +{selectedService.bufferMinutes}m buffer</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(selectedService.priceAmount, selectedService.currency || currency)}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium mt-0.5"
          >
            Change
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Choose Date &amp; Time
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Times shown in salon local time ({timezone}).
        </p>
      </div>

      {/* Optional Professional Preference (Only when business enables it and has multiple staff) */}
      {allowStaffSelection && qualifiedStaff.length > 1 && onSelectStaff && (
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Professional Preference (Optional)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectStaff(null)}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                selectedStaffId === null
                  ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500 font-semibold"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs">Any Available Professional</span>
              </div>
              {selectedStaffId === null && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>

            {qualifiedStaff.map((staff) => (
              <button
                key={staff.id}
                type="button"
                onClick={() => onSelectStaff(staff.id)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  selectedStaffId === staff.id
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="text-xs truncate">{staff.displayName}</span>
                </div>
                {selectedStaffId === staff.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visible Conflict Alert Banner */}
      {conflictMessage && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-sm block">Slot Update</span>
            <p className="leading-relaxed text-amber-800 dark:text-amber-300">
              {conflictMessage}
            </p>
          </div>
        </div>
      )}

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
              Please choose another day or check back later for newly opened openings.
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Morning Slots */}
            {morningSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
                          "py-2.5 px-3 rounded-xl border text-center text-sm font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        {slot.localTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Afternoon Slots */}
            {afternoonSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
                          "py-2.5 px-3 rounded-xl border text-center text-sm font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        {slot.localTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evening Slots */}
            {eveningSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
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
                          "py-2.5 px-3 rounded-xl border text-center text-sm font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
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

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Services</span>
        </Button>

        <Button
          type="button"
          disabled={!selectedSlot}
          onClick={onContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-semibold"
        >
          Continue to Details
        </Button>
      </div>
    </div>
  );
}
