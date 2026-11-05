"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  User,
  Scissors,
  Phone,
  Mail,
  Copy,
  Check,
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  Calendar,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppointmentWithDetails, Appointment } from "@/features/appointments/types";
import type { StaffWithServices } from "@/features/staff/types";
import type { ServiceWithCategory } from "@/features/services/types";
import {
  getAppointmentTimeDetails,
  getBookingSource,
} from "@/features/appointments/layout-utils";
import { listAppointmentsBySlug } from "@/features/appointments/server";
import { AppointmentDetailsPanel } from "./appointment-details-panel";
import { ManualBookingWizard } from "./manual-booking-wizard";

interface TodayAgendaProps {
  businessSlug: string;
  businessId: string;
  businessTimezone: string;
  currency: string;
  localToday: string;
  initialAppointments: AppointmentWithDetails[];
  staffList: StaffWithServices[];
  servicesList: ServiceWithCategory[];
}

export function TodayAgenda({
  businessSlug,
  businessId,
  businessTimezone,
  currency,
  localToday,
  initialAppointments,
  staffList,
  servicesList,
}: TodayAgendaProps) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>(initialAppointments);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick-copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drawer & Wizard state
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Refresh appointments for today
  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      setErrorMessage(null);
      const res = await listAppointmentsBySlug(businessSlug, {
        startDate: localToday,
        endDate: localToday,
      });

      if (res.success && res.appointments) {
        setAppointments(res.appointments);
      } else {
        setErrorMessage(res.error || "Unable to refresh appointments. Please try again.");
      }
    });
  }, [businessSlug, localToday]);

  // Copy phone number to clipboard with feedback
  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Format currency
  const formatPrice = (minorUnits?: number | null) => {
    if (typeof minorUnits !== "number") return "—";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(minorUnits / 100);
  };

  // Filter and sort appointments chronologically
  const filteredAppointments = useMemo(() => {
    let result = appointments;

    if (selectedStaffId !== "all") {
      result = result.filter((app) => app.staff_id === selectedStaffId);
    }

    if (selectedStatus !== "all") {
      result = result.filter((app) => app.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((app) => {
        const custName = (app.customer?.name || app.customer_name_snapshot || "").toLowerCase();
        const custPhone = (app.customer?.phone || "").toLowerCase();
        const custEmail = (app.customer?.email || "").toLowerCase();
        const servName = (app.service?.name || app.service_name_snapshot || "").toLowerCase();
        const stName = (app.staff?.display_name || "").toLowerCase();
        const notes = (app.notes || "").toLowerCase();

        return (
          custName.includes(q) ||
          custPhone.includes(q) ||
          custEmail.includes(q) ||
          servName.includes(q) ||
          stName.includes(q) ||
          notes.includes(q)
        );
      });
    }

    // Strict chronological sort by starts_at
    return [...result].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [appointments, selectedStaffId, selectedStatus, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            Confirmed
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            Completed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Pending
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 line-through opacity-80 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            Cancelled
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 line-through opacity-80 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            No-Show
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 capitalize">
            {status}
          </span>
        );
    }
  };

  const getSourceBadge = (app: AppointmentWithDetails) => {
    const source = getBookingSource(app);
    let colorClass = "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

    if (source.source === "ai_receptionist") {
      colorClass = "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300";
    } else if (source.source === "whatsapp") {
      colorClass = "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300";
    } else if (source.source === "public_wizard") {
      colorClass = "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300";
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${colorClass}`}>
        {source.source === "ai_receptionist" && <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
        {source.badgeText}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search today's bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100"
            />
          </div>

          {/* Staff Filter */}
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100"
          >
            <option value="all">All Specialists</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.display_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-100"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-Show</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            title="Refresh Today's Bookings"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            size="sm"
            className="h-8 gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Booking</span>
          </Button>

          <Link
            href={`/dashboard/${businessSlug}/appointments`}
            className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Full Calendar</span>
          </Link>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Desktop Agenda Table View */}
      <div className="hidden md:block rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
              <th className="py-3 px-4">Time & Duration</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Service & Price</th>
              <th className="py-3 px-4">Specialist</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300">
            {filteredAppointments.map((app) => {
              const details = getAppointmentTimeDetails(app, businessTimezone);
              const custName = app.customer?.name || app.customer_name_snapshot || "Guest Customer";
              const custPhone = app.customer?.phone || null;
              const custEmail = app.customer?.email || null;
              const servName = app.service?.name || app.service_name_snapshot || "Service";
              const staffName = app.staff?.display_name || "Any Specialist";
              const isCopied = copiedId === app.id;

              return (
                <tr
                  key={app.id}
                  onClick={() => {
                    setSelectedAppointment(app);
                    setIsDetailsOpen(true);
                  }}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  {/* Time & Duration */}
                  <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {details.startStr} – {details.endStr}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-sans mt-0.5">
                      {details.durationMinutes} mins
                    </div>
                  </td>

                  {/* Customer & Contacts */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span>{custName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                      {custPhone ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${custPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline dark:text-blue-400 font-mono"
                            title="Call customer"
                          >
                            {custPhone}
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(app.id, custPhone, e)}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            title="Copy phone number"
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="italic text-zinc-400">No phone</span>
                      )}

                      {custEmail && (
                        <>
                          <span>•</span>
                          <a
                            href={`mailto:${custEmail}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-zinc-500 hover:text-blue-600 hover:underline dark:hover:text-blue-400 truncate max-w-[140px]"
                            title={custEmail}
                          >
                            {custEmail}
                          </a>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Service & Price */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{servName}</span>
                    </div>
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatPrice(app.price_minor_snapshot)}
                    </div>
                  </td>

                  {/* Specialist */}
                  <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                    {staffName}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(app.status)}
                  </td>

                  {/* Booking Source */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getSourceBadge(app)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {custPhone && (
                        <a
                          href={`tel:${custPhone}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          title="Call customer"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {custEmail && (
                        <a
                          href={`mailto:${custEmail}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          title="Email customer"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAppointment(app);
                          setIsDetailsOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs font-semibold"
                      >
                        Details
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAppointments.length === 0 && (
          <div className="py-12 px-4 text-center">
            <Clock className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No appointments scheduled for today
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedStaffId !== "all" || selectedStatus !== "all"
                ? "No bookings match your current filter selections. Try clearing your filters."
                : "Bookings scheduled via the public wizard, AI receptionist, or manual walk-in will appear here in chronological order."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                size="sm"
                className="gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Booking</span>
              </Button>
              <Link
                href={`/dashboard/${businessSlug}/appointments`}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <span>View Full Calendar</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden space-y-3">
        {filteredAppointments.map((app) => {
          const details = getAppointmentTimeDetails(app, businessTimezone);
          const custName = app.customer?.name || app.customer_name_snapshot || "Guest Customer";
          const custPhone = app.customer?.phone || null;
          const custEmail = app.customer?.email || null;
          const servName = app.service?.name || app.service_name_snapshot || "Service";
          const staffName = app.staff?.display_name || "Any Specialist";
          const isCopied = copiedId === app.id;

          return (
            <div
              key={app.id}
              onClick={() => {
                setSelectedAppointment(app);
                setIsDetailsOpen(true);
              }}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer hover:border-zinc-300 transition-colors"
            >
              {/* Top Row: Time and Status */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>
                    {details.startStr} – {details.endStr}
                  </span>
                  <span className="text-[11px] font-sans font-normal text-zinc-500">
                    ({details.durationMinutes}m)
                  </span>
                </div>
                {getStatusBadge(app.status)}
              </div>

              {/* Middle Row: Customer, Service, Staff */}
              <div className="py-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{custName}</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatPrice(app.price_minor_snapshot)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">{servName}</span>
                  <span>Specialist: <strong className="text-zinc-800 dark:text-zinc-200">{staffName}</strong></span>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  {getSourceBadge(app)}
                </div>
              </div>

              {/* Bottom Row: Quick Contact & Details Actions */}
              <div
                className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 flex-wrap"
                onClick={(e) => e.stopPropagation()}
              >
                {custPhone && (
                  <>
                    <a
                      href={`tel:${custPhone}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      <Phone className="h-3 w-3 text-blue-600" />
                      <span>Call</span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) => handleCopyPhone(app.id, custPhone, e)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                {custEmail && (
                  <a
                    href={`mailto:${custEmail}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <Mail className="h-3 w-3 text-blue-600" />
                    <span>Email</span>
                  </a>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAppointment(app);
                    setIsDetailsOpen(true);
                  }}
                  className="ml-auto h-7 px-2.5 text-xs font-semibold"
                >
                  Details
                </Button>
              </div>
            </div>
          );
        })}

        {filteredAppointments.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <Clock className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No appointments scheduled for today
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Add walk-in clients or view the full calendar.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                size="sm"
                className="gap-1.5 bg-blue-600 text-xs text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Booking</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Details Panel Drawer */}
      {selectedAppointment && (
        <AppointmentDetailsPanel
          appointment={selectedAppointment}
          businessId={businessId}
          businessSlug={businessSlug}
          businessTimezone={businessTimezone}
          currency={currency}
          staffList={staffList}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedAppointment(null);
          }}
          onAppointmentUpdated={(updated: Appointment) => {
            // Update in local state
            setAppointments((prev) =>
              prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
            );
            handleRefresh();
          }}
        />
      )}

      {/* Manual Booking Wizard */}
      {isWizardOpen && (
        <ManualBookingWizard
          businessId={businessId}
          businessSlug={businessSlug}
          businessTimezone={businessTimezone}
          currency={currency}
          staff={staffList}
          services={servicesList}
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          initialDate={localToday}
          onBookingSuccess={() => {
            setIsWizardOpen(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
