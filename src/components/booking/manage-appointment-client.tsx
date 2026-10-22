"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ShieldAlert,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/features/services/types";
import {
  cancelAppointmentByToken,
  rescheduleAppointmentByToken,
  getPublicAppointmentAvailability,
} from "@/features/public-booking/server";
import type {
  ManagedAppointmentDetails,
  PublicSlot,
} from "@/features/public-booking/types";

interface ManageAppointmentClientProps {
  initialAppointment: ManagedAppointmentDetails;
  token: string;
}

export function ManageAppointmentClient({
  initialAppointment,
  token,
}: ManageAppointmentClientProps) {
  const [appointment, setAppointment] =
    useState<ManagedAppointmentDetails>(initialAppointment);
  const [activeTab, setActiveTab] = useState<"view" | "reschedule" | "cancel">("view");

  // Cancellation State
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Rescheduling State
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [rescheduleSlots, setRescheduleSlots] = useState<PublicSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Format date/time
  const startObj = new Date(appointment.startsAt);
  const localDateStr = startObj.toLocaleDateString("en-GB", {
    timeZone: appointment.business.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const localTimeStr = startObj.toLocaleTimeString("en-GB", {
    timeZone: appointment.business.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Handle Cancellation
  const handleCancelAppointment = async () => {
    setCancelling(true);
    setCancelError(null);

    try {
      const res = await cancelAppointmentByToken(token, cancelReason || undefined);
      if (!res.success) {
        setCancelError(res.error || "Unable to cancel appointment.");
        setCancelling(false);
        return;
      }

      setAppointment((prev) => ({
        ...prev,
        status: "cancelled",
        permissions: { canCancel: false, canReschedule: false },
      }));
      setActionSuccessMessage(
        "Your appointment has been successfully cancelled. Your reserved slot is released."
      );
      setActiveTab("view");
    } catch (err) {
      console.error("Cancel error:", err);
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // Load slots when reschedule tab is active or date changes
  React.useEffect(() => {
    if (activeTab !== "reschedule") return;

    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      setRescheduleError(null);
      setSelectedSlot(null);

      try {
        const res = await getPublicAppointmentAvailability({
          businessSlug: appointment.business.slug,
          serviceId: appointment.serviceId,
          staffId: appointment.staffId,
          staffPreference: "specific",
          date: rescheduleDate,
        });

        if (cancelled) return;

        if (res.success && res.data) {
          setRescheduleSlots(res.data.slots);
        } else {
          setRescheduleError(res.error || "No available slots on this date.");
          setRescheduleSlots([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Reschedule slots error:", err);
          setRescheduleError("Failed to fetch slots for this date.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [activeTab, rescheduleDate, appointment.business.slug, appointment.serviceId, appointment.staffId]);

  // Handle Reschedule Confirm
  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;

    setRescheduling(true);
    setRescheduleError(null);

    try {
      const res = await rescheduleAppointmentByToken(
        token,
        selectedSlot.startsAt,
        appointment.staffId
      );

      if (!res.success || !res.data) {
        setRescheduleError(
          res.error || "Could not reschedule to this slot. It may have just been booked."
        );
        setRescheduling(false);
        return;
      }

      setAppointment((prev) => ({
        ...prev,
        startsAt: res.data!.startsAt,
        status: "confirmed",
      }));
      setActionSuccessMessage("Your appointment has been successfully rescheduled!");
      setActiveTab("view");
    } catch (err) {
      console.error("Reschedule confirm error:", err);
      setRescheduleError("Network error. Please try again.");
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Appointment Summary Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              {appointment.business.name}
            </span>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
              {appointment.serviceName}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Booking Ref: <span className="font-mono font-semibold">{appointment.bookingReference}</span>
            </p>
          </div>

          <Badge
            variant={
              appointment.status === "confirmed"
                ? "default"
                : appointment.status === "cancelled"
                ? "warning"
                : "secondary"
            }
            className="capitalize text-xs font-semibold"
          >
            {appointment.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Date &amp; Time</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {localDateStr} at {localTimeStr}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Specialist</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {appointment.staffName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Price</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {formatCurrency(appointment.priceAmount, appointment.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        {appointment.status === "confirmed" && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            {appointment.permissions.canReschedule && (
              <Button
                variant={activeTab === "reschedule" ? "primary" : "outline"}
                size="sm"
                onClick={() =>
                  setActiveTab((prev) => (prev === "reschedule" ? "view" : "reschedule"))
                }
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reschedule Appointment</span>
              </Button>
            )}

            {appointment.permissions.canCancel && (
              <Button
                variant={activeTab === "cancel" ? "primary" : "outline"}
                size="sm"
                onClick={() =>
                  setActiveTab((prev) => (prev === "cancel" ? "view" : "cancel"))
                }
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Appointment</span>
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Reschedule Tab View */}
      {activeTab === "reschedule" && (
        <Card className="p-6 space-y-5 border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/10">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span>Reschedule Your Appointment</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Select a new date and time slot. Your current appointment will only be changed once confirmed.
            </p>
          </div>

          {rescheduleError && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{rescheduleError}</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Choose New Date
            </label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Slot picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Available Times
            </label>

            {loadingSlots ? (
              <div className="p-8 text-center text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs">Checking available slots...</span>
              </div>
            ) : rescheduleSlots.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">
                No slots available on this date for {appointment.staffName}. Please try another date.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {rescheduleSlots.map((slot) => {
                  const isSelected = selectedSlot?.startsAt === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-400"
                      }`}
                    >
                      {slot.localTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("view")}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedSlot || rescheduling}
              onClick={handleConfirmReschedule}
              className="gap-2 font-bold"
            >
              {rescheduling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm New Time</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Cancel Tab View */}
      {activeTab === "cancel" && (
        <Card className="p-6 space-y-4 border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Cancel This Appointment?
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Cancelling will release your reserved slot for {localDateStr} at {localTimeStr}. This action cannot be undone.
              </p>
            </div>
          </div>

          {cancelError && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cancelError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Reason for cancellation <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, feeling unwell..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("view")}
            >
              Keep Appointment
            </Button>
            <Button
              size="sm"
              disabled={cancelling}
              onClick={handleCancelAppointment}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold"
            >
              {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Cancellation</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Back to Salon Link */}
      <div className="text-center pt-2">
        <Link
          href={`/booking/${appointment.business.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {appointment.business.name}</span>
        </Link>
      </div>
    </div>
  );
}
