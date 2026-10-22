"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  PublicSalonProfile,
  PublicService,
  PublicStaff,
  PublicSlot,
} from "@/features/public-booking/types";
import { formatCurrency } from "@/features/services/types";

interface ReviewStepProps {
  salon: PublicSalonProfile;
  selectedService: PublicService;
  selectedStaff: PublicStaff | null; // null = Any Available
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: PublicSlot;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  onBack: () => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
  submissionError: string | null;
}

export function ReviewStep({
  salon,
  selectedService,
  selectedStaff,
  selectedDate,
  selectedSlot,
  customerName,
  customerEmail,
  customerPhone,
  customerNotes,
  onBack,
  onConfirm,
  submitting,
  submissionError,
}: ReviewStepProps) {
  const [agreed, setAgreed] = useState(true);

  // Format date nicely
  const formattedDate = React.useMemo(() => {
    try {
      const parts = selectedDate.split("-");
      const d = new Date(
        Number.parseInt(parts[0], 10),
        Number.parseInt(parts[1], 10) - 1,
        Number.parseInt(parts[2], 10)
      );
      return d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Review &amp; Confirm
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Please check your appointment details before confirming.
        </p>
      </div>

      {submissionError && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Booking Could Not Be Completed</p>
            <p>{submissionError}</p>
          </div>
        </div>
      )}

      {/* Appointment Summary Card */}
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 p-0">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Salon
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
                {salon.name}
              </h3>
              {(salon.addressLine1 || salon.city) && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {[salon.addressLine1, salon.city, salon.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>

            <Badge variant="default" className="text-xs">
              Self-Service
            </Badge>
          </div>
        </div>

        <div className="p-5 space-y-4 text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Service & Price */}
          <div className="flex items-start justify-between pt-1">
            <div>
              <span className="text-xs text-zinc-400 font-medium">Service</span>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                {selectedService.name}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{selectedService.durationMinutes} minutes</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-400 font-medium">Price</span>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {formatCurrency(selectedService.priceAmount, selectedService.currency || salon.currency)}
              </div>
              <span className="text-[10px] text-zinc-400">Pay at salon</span>
            </div>
          </div>

          {/* Specialist */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <span className="text-xs text-zinc-400 font-medium">Specialist</span>
              <div className="flex items-center gap-2 mt-0.5">
                <User className="w-4 h-4 text-zinc-400" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedStaff ? selectedStaff.displayName : "Any Available Specialist"}
                </span>
              </div>
            </div>
            {!selectedStaff && (
              <span className="text-[11px] text-zinc-400 italic">
                Assigned on confirmation
              </span>
            )}
          </div>

          {/* Date & Time */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <span className="text-xs text-zinc-400 font-medium">Date &amp; Time</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {formattedDate} at {selectedSlot.localTime}
                </span>
              </div>
            </div>
            <span className="text-xs text-zinc-400">
              {salon.timezone}
            </span>
          </div>

          {/* Customer */}
          <div className="pt-4">
            <span className="text-xs text-zinc-400 font-medium">Client</span>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {customerName}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 space-x-2">
              {customerEmail && <span>{customerEmail}</span>}
              {customerEmail && customerPhone && <span>•</span>}
              {customerPhone && <span>{customerPhone}</span>}
            </div>
            {customerNotes && (
              <p className="text-xs text-zinc-500 mt-1 italic">
                Note: &quot;{customerNotes}&quot;
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Cancellation Policy Notice */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/30 p-4 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Cancellation &amp; Rescheduling Policy</span>
        </div>
        <p className="leading-relaxed">
          {salon.cancellationPolicyText ||
            `Cancellations or changes must be made at least ${salon.cancellationNoticeHours} hours before your scheduled appointment time.`}
        </p>
        <p className="text-[11px] text-zinc-500">
          You will receive a private self-service link on your confirmation screen to easily modify or cancel your booking at any time in compliance with this policy.
        </p>
      </div>

      {/* Agreement Checkbox */}
      <label className="flex items-start gap-2.5 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          I confirm that the appointment details above are correct and agree to the salon&apos;s cancellation policy.
        </span>
      </label>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={submitting}
          size="lg"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!agreed || submitting}
          size="lg"
          className="min-w-[180px] gap-2 font-bold"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Appointment</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
