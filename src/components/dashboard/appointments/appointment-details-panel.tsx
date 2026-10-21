"use client";

import { useState, useTransition } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Appointment, AppointmentWithDetails } from "@/features/appointments/types";
import type { StaffWithServices } from "@/features/staff/types";
import type { AvailabilitySlot } from "@/features/availability/types";
import { getAppointmentAvailability } from "@/features/availability/server";
import {
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
} from "@/features/appointments/server";

interface AppointmentDetailsPanelProps {
  appointment: AppointmentWithDetails | null;
  businessId: string;
  businessSlug: string;
  businessTimezone: string;
  currency: string;
  staffList: StaffWithServices[];
  isOpen: boolean;
  onClose: () => void;
  onAppointmentUpdated: (updated: Appointment) => void;
  onSelectCustomer?: (customer: { id?: string | null; name: string; phone?: string | null; email?: string | null }) => void;
}

export function AppointmentDetailsPanel({
  appointment,
  businessId,
  businessSlug,
  businessTimezone,
  currency,
  staffList,
  isOpen,
  onClose,
  onAppointmentUpdated,
  onSelectCustomer,
}: AppointmentDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "reschedule" | "cancel" | "status">("details");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleStaffId, setRescheduleStaffId] = useState<string>("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState<"confirmed" | "completed" | "no_show" | "cancelled">("completed");
  const [statusReason, setStatusReason] = useState("");

  if (!isOpen || !appointment) {
    return null;
  }

  // Formatting helpers
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: businessTimezone,
      });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: businessTimezone,
      });
    } catch {
      return isoString;
    }
  };

  const formatPrice = (minorUnits?: number | null) => {
    if (typeof minorUnits !== "number") return "—";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(minorUnits / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700">Confirmed</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Pending</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="border-rose-400 text-rose-600 dark:text-rose-400">Cancelled</Badge>;
      case "no_show":
        return <Badge variant="outline" className="border-rose-400 text-rose-600 dark:text-rose-400">No-Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Check if appointment is in terminal state
  const isTerminal = ["cancelled", "completed", "no_show"].includes(appointment.status);

  // Load slots for rescheduling
  const handleLoadRescheduleSlots = async (date: string, staffId: string) => {
    if (!date) return;
    setIsLoadingSlots(true);
    setActionError(null);
    setSelectedSlot(null);

    try {
      const resp = await getAppointmentAvailability({
        businessId,
        serviceId: appointment.service_id,
        staffId: staffId || undefined,
        staffPreference: staffId ? "specific" : "any",
        date,
      });

      if (!resp.success || !resp.data) {
        setActionError(resp.error || "Failed to query available slots for this date.");
        setRescheduleSlots([]);
      } else {
        setRescheduleSlots(resp.data.slots || []);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to load slots.");
      setRescheduleSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Reschedule submission
  const handleExecuteReschedule = () => {
    if (!selectedSlot) {
      setActionError("Please select a new timeslot.");
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const targetStaffId = rescheduleStaffId || selectedSlot.availableStaffIds[0] || appointment.staff_id;
      const res = await rescheduleAppointment(
        {
          business_id: businessId,
          appointment_id: appointment.id,
          new_starts_at: selectedSlot.startsAt,
          new_staff_id: targetStaffId || undefined,
          reason: rescheduleReason.trim() || undefined,
        },
        businessSlug
      );

      if (!res.success) {
        setActionError(res.error || "Failed to reschedule appointment.");
      } else if (res.data) {
        setActionSuccess("Appointment successfully rescheduled!");
        onAppointmentUpdated(res.data);
        setTimeout(() => {
          setActiveTab("details");
          setActionSuccess(null);
        }, 1200);
      }
    });
  };

  // Cancel submission
  const handleExecuteCancel = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await cancelAppointment(
        {
          business_id: businessId,
          appointment_id: appointment.id,
          reason: cancelReason.trim() || undefined,
        },
        businessSlug
      );

      if (!res.success) {
        setActionError(res.error || "Failed to cancel appointment.");
      } else if (res.data) {
        setActionSuccess("Appointment cancelled successfully.");
        onAppointmentUpdated(res.data);
        setTimeout(() => {
          setActiveTab("details");
          setActionSuccess(null);
        }, 1200);
      }
    });
  };

  // Status update submission
  const handleExecuteStatusUpdate = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await updateAppointmentStatus(
        {
          business_id: businessId,
          appointment_id: appointment.id,
          status: selectedStatus,
          reason: statusReason.trim() || undefined,
        },
        businessSlug
      );

      if (!res.success) {
        setActionError(res.error || "Failed to update appointment status.");
      } else if (res.data) {
        setActionSuccess(`Status updated to ${selectedStatus}!`);
        onAppointmentUpdated(res.data);
        setTimeout(() => {
          setActiveTab("details");
          setActionSuccess(null);
        }, 1200);
      }
    });
  };

  const customerDisplayName = appointment.customer?.name || appointment.customer_name_snapshot || "Guest Customer";
  const customerPhone = appointment.customer?.phone || null;
  const customerEmail = appointment.customer?.email || null;
  const serviceDisplayName = appointment.service?.name || appointment.service_name_snapshot || "Service";
  const serviceDuration = appointment.service?.duration_minutes || appointment.duration_minutes_snapshot || 30;
  const servicePriceMinor = appointment.price_minor_snapshot;
  const staffDisplayName = appointment.staff?.display_name || "Any Available / Unassigned";
  const staffTitle = appointment.staff?.professional_title || null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/40 backdrop-blur-sm transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Appointment Details
                </h2>
                {getStatusBadge(appointment.status)}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Ref: <span className="font-mono text-zinc-700 dark:text-zinc-300">{appointment.id.slice(0, 8)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Tabs Navigation */}
          <div className="flex border-b border-zinc-200 bg-zinc-50/70 px-4 dark:border-zinc-800 dark:bg-zinc-950/40 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setActiveTab("details"); setActionError(null); }}
              className={`py-2.5 px-3 border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Overview
            </button>
            {!isTerminal && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("reschedule");
                    setActionError(null);
                    const initDate = appointment.starts_at.slice(0, 10);
                    setRescheduleDate(initDate);
                    setRescheduleStaffId(appointment.staff_id || "");
                    handleLoadRescheduleSlots(initDate, appointment.staff_id || "");
                  }}
                  className={`py-2.5 px-3 border-b-2 transition-colors ${
                    activeTab === "reschedule"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("status"); setActionError(null); }}
                  className={`py-2.5 px-3 border-b-2 transition-colors ${
                    activeTab === "status"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Status
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("cancel"); setActionError(null); }}
                  className={`py-2.5 px-3 border-b-2 transition-colors ${
                    activeTab === "cancel"
                      ? "border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-400"
                      : "border-transparent text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                  }`}
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Feedback messages */}
          {actionError && (
            <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "details" && (
              <>
                {/* Date & Time Highlight Card */}
                <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Scheduled Slot ({businessTimezone})
                  </div>
                  <div className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {formatDate(appointment.starts_at)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    <span>
                      {formatTime(appointment.starts_at)} – {formatTime(appointment.service_ends_at)}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      Customer
                    </div>
                    {onSelectCustomer && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectCustomer({
                            id: appointment.customer_id,
                            name: customerDisplayName,
                            phone: customerPhone,
                            email: customerEmail,
                          })
                        }
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                      >
                        View Profile <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {customerDisplayName}
                    </h3>
                    <div className="mt-1.5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {customerPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-zinc-400" />
                          <a
                            href={`tel:${customerPhone}`}
                            className="hover:underline font-mono"
                          >
                            {customerPhone}
                          </a>
                        </div>
                      )}
                      {customerEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          <a
                            href={`mailto:${customerEmail}`}
                            className="hover:underline"
                          >
                            {customerEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Service & Staff */}
                <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                    Service & Provider
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Service</span>
                      <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                        {serviceDisplayName}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">
                        {serviceDuration} mins • {formatPrice(servicePriceMinor)}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Assigned Staff</span>
                      <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                        {staffDisplayName}
                      </p>
                      {staffTitle && (
                        <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 capitalize">
                          {staffTitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes & Metadata */}
                {(appointment.notes || appointment.cancellation_reason) && (
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <FileText className="h-3.5 w-3.5 text-zinc-400" />
                      Notes
                    </div>
                    {appointment.notes && (
                      <div className="rounded-lg bg-zinc-50 p-2.5 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 block mb-0.5">
                          Appointment Note:
                        </span>
                        {appointment.notes}
                      </div>
                    )}
                    {appointment.cancellation_reason && (
                      <div className="rounded-lg bg-rose-50 p-2.5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                        <span className="font-medium block mb-0.5">Cancellation Reason:</span>
                        {appointment.cancellation_reason}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* TAB: Reschedule */}
            {activeTab === "reschedule" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                  Rescheduling checks real-time availability atomically. If the slot is unavailable, the current appointment stays confirmed.
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Select New Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={rescheduleDate}
                    onChange={(e) => {
                      setRescheduleDate(e.target.value);
                      handleLoadRescheduleSlots(e.target.value, rescheduleStaffId);
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Staff Member
                  </label>
                  <select
                    value={rescheduleStaffId}
                    onChange={(e) => {
                      setRescheduleStaffId(e.target.value);
                      handleLoadRescheduleSlots(rescheduleDate, e.target.value);
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Any Available Staff</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.display_name} {st.professional_title ? `(${st.professional_title})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Available Slots ({rescheduleDate || "Select a date"})
                  </label>
                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-6 text-xs text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                      Checking real-time calendar...
                    </div>
                  ) : rescheduleSlots.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
                      No available slots found for this date. Try another date or staff member.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1">
                      {rescheduleSlots.map((slot) => {
                        const isSelected = selectedSlot?.startsAt === slot.startsAt;
                        return (
                          <button
                            key={slot.startsAt}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {slot.localTime}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Reason for Reschedule (Optional)
                  </label>
                  <input
                    type="text"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Customer requested earlier time"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleExecuteReschedule}
                    disabled={!selectedSlot || isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Confirming Reschedule...
                      </>
                    ) : (
                      "Confirm Reschedule"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: Update Status */}
            {activeTab === "status" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300">
                  Update customer visit status. Setting an appointment to Completed or No-Show finalises the booking.
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Select New Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("completed")}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all ${
                        selectedStatus === "completed"
                          ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Completed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("no_show")}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all ${
                        selectedStatus === "no_show"
                          ? "border-rose-600 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <span>No-Show</span>
                    </button>
                    {appointment.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => setSelectedStatus("confirmed")}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all ${
                          selectedStatus === "confirmed"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Confirmed</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Internal Status Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="e.g. Paid in cash at reception"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleExecuteStatusUpdate}
                    disabled={isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating Status...
                      </>
                    ) : (
                      "Apply Status Change"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: Cancel */}
            {activeTab === "cancel" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <span className="font-semibold block">Are you sure you want to cancel this booking?</span>
                    Cancelling releases this staff slot immediately and sends the cancellation event to audit logs.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Reason for Cancellation
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Customer phoned to cancel due to illness"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleExecuteCancel}
                    disabled={isPending}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Cancelling Appointment...
                      </>
                    ) : (
                      "Cancel This Appointment"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
