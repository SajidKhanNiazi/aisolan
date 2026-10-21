"use client";

import { useState, useTransition, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppointmentWithDetails, AppointmentKpis } from "@/features/appointments/types";
import type { StaffWithServices } from "@/features/staff/types";
import type { ServiceWithCategory } from "@/features/services/types";
import { formatInstantInTimeZone } from "@/features/appointments/timezone";
import { ManualBookingWizard } from "./manual-booking-wizard";
import { AppointmentDetailsPanel } from "./appointment-details-panel";
import {
  listAppointmentsBySlug,
  getAppointmentKpis,
} from "@/features/appointments/server";

interface AppointmentCalendarProps {
  businessId: string;
  businessSlug: string;
  businessTimezone: string;
  currency: string;
  initialAppointments: AppointmentWithDetails[];
  initialKpis: AppointmentKpis;
  staffList: StaffWithServices[];
  servicesList: ServiceWithCategory[];
  initialDate?: string;
  initialView?: "day" | "week" | "list";
}

export function AppointmentCalendar({
  businessId,
  businessSlug,
  businessTimezone,
  currency,
  initialAppointments,
  initialKpis,
  staffList,
  servicesList,
  initialDate,
  initialView,
}: AppointmentCalendarProps) {
  // Navigation & View Mode State
  const [viewMode, setViewMode] = useState<"day" | "week" | "list">(initialView || "day");
  
  // Today in business timezone
  const getTodayDateString = useCallback(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: businessTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      return `${y}-${m}-${d}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, [businessTimezone]);

  const [currentDate, setCurrentDate] = useState<string>(initialDate || getTodayDateString());
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Appointments & KPIs state
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>(initialAppointments);
  const [kpis, setKpis] = useState<AppointmentKpis>(initialKpis);
  const [isPending, startTransition] = useTransition();

  // Notification / Alert state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isFirstMount = useRef(true);

  // Wizard & Details state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardDate, setWizardDate] = useState<string | undefined>(undefined);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Helper: date math
  const addDays = (dateStr: string, days: number): string => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
    return date.toISOString().slice(0, 10);
  };

  // Helper: get week boundaries (Monday to Sunday)
  const getWeekDates = useCallback((centerDateStr: string): string[] => {
    const [y, m, d] = centerDateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = date.getUTCDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(Date.UTC(y, m - 1, d + diffToMonday, 12, 0, 0));

    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i, 12, 0, 0));
      week.push(nextDay.toISOString().slice(0, 10));
    }
    return week;
  }, []);

  // Helper: get appointment's local date string in business timezone
  const getAppLocalDate = useCallback(
    (app: AppointmentWithDetails): string => {
      try {
        return formatInstantInTimeZone(new Date(app.starts_at), businessTimezone).dateStr;
      } catch {
        return app.starts_at.slice(0, 10);
      }
    },
    [businessTimezone]
  );

  // Reload appointments when date range or filters change
  const reloadData = useCallback(
    (targetDate = currentDate, targetStaff = selectedStaffId) => {
      startTransition(async () => {
        setErrorMessage(null);
        let startDate = targetDate;
        let endDate = targetDate;

        if (viewMode === "week") {
          const week = getWeekDates(targetDate);
          startDate = week[0];
          endDate = week[6];
        } else if (viewMode === "list") {
          startDate = targetDate;
          endDate = addDays(targetDate, 14);
        }

        const [appointmentsRes, kpisRes] = await Promise.all([
          listAppointmentsBySlug(businessSlug, {
            startDate,
            endDate,
            staffId: targetStaff === "all" ? undefined : targetStaff,
            status: selectedStatus === "all" ? undefined : selectedStatus,
            search: searchQuery.trim() || undefined,
          }),
          getAppointmentKpis(businessSlug, targetDate),
        ]);

        if (appointmentsRes.success && appointmentsRes.appointments) {
          setAppointments(appointmentsRes.appointments);
          setErrorMessage(null);
        } else if (!appointmentsRes.success) {
          setErrorMessage(
            appointmentsRes.error ||
              "Unable to retrieve appointments for this range. Please check your connection and try again."
          );
        }

        if (kpisRes.success && kpisRes.kpis) {
          setKpis(kpisRes.kpis);
        }
      });
    },
    [businessSlug, currentDate, selectedStaffId, selectedStatus, searchQuery, viewMode, getWeekDates]
  );

  // Trigger reload on date / viewMode / staff / status changes (skip redundant first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    reloadData(currentDate, selectedStaffId);
  }, [currentDate, viewMode, selectedStaffId, selectedStatus, reloadData]);

  // Sync date and viewMode to URL query params for reliable browser refresh and deep-linking
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("date", currentDate);
      url.searchParams.set("view", viewMode);
      window.history.replaceState({}, "", url.toString());
    }
  }, [currentDate, viewMode]);

  // Navigate functions
  const handlePrev = () => {
    const delta = viewMode === "week" ? -7 : -1;
    setCurrentDate((prev) => addDays(prev, delta));
  };

  const handleNext = () => {
    const delta = viewMode === "week" ? 7 : 1;
    setCurrentDate((prev) => addDays(prev, delta));
  };

  const handleToday = () => {
    setCurrentDate(getTodayDateString());
  };

  // Format helpers
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

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatHeaderTitle = () => {
    if (viewMode === "day") {
      const [y, m, d] = currentDate.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const week = getWeekDates(currentDate);
      const startParts = formatDateDisplay(week[0]);
      const endParts = formatDateDisplay(week[6]);
      return `${startParts} – ${endParts}`;
    }
    return `Agenda from ${formatDateDisplay(currentDate)}`;
  };

  const formatPrice = (minorUnits?: number | null) => {
    if (typeof minorUnits !== "number") return "—";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(minorUnits / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
      case "pending":
        return "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
      case "completed":
        return "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200";
      case "cancelled":
        return "border-rose-400 bg-rose-50 text-rose-800 line-through opacity-70 dark:bg-rose-950/30 dark:text-rose-300";
      case "no_show":
        return "border-zinc-400 bg-zinc-100 text-zinc-700 line-through opacity-70 dark:bg-zinc-800 dark:text-zinc-400";
      default:
        return "border-zinc-300 bg-zinc-50 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
    }
  };

  // Filtered appointments in memory for search query, staff, and status
  const filteredAppointments = useMemo(() => {
    let result = appointments;
    if (selectedStaffId !== "all") {
      result = result.filter((app) => app.staff_id === selectedStaffId);
    }
    if (selectedStatus !== "all") {
      result = result.filter((app) => app.status === selectedStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (app) =>
          (app.customer?.name && app.customer.name.toLowerCase().includes(q)) ||
          ((app.customer_name_snapshot || "").toLowerCase().includes(q)) ||
          (app.customer?.phone && app.customer.phone.includes(q)) ||
          (app.customer?.email && app.customer.email.toLowerCase().includes(q)) ||
          ((app.service_name_snapshot || "").toLowerCase().includes(q)) ||
          (app.service?.name && app.service.name.toLowerCase().includes(q)) ||
          (app.staff?.display_name && app.staff.display_name.toLowerCase().includes(q)) ||
          (app.notes && app.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [appointments, selectedStaffId, selectedStatus, searchQuery]);

  // Day View: only appointments on currentDate in salon timezone
  const dayAppointments = useMemo(() => {
    return filteredAppointments.filter((app) => getAppLocalDate(app) === currentDate);
  }, [filteredAppointments, currentDate, getAppLocalDate]);

  // Hourly slots for Day Timeline (08:00 to 20:00)
  const timelineHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  // Helper to get local hour/minute for positioning in day view
  const getAppointmentTimelineOffsets = (app: AppointmentWithDetails) => {
    const start = new Date(app.starts_at);
    const end = new Date(app.service_ends_at);

    // Format in salon timezone to get wall-clock hour & minutes
    const startStr = start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: businessTimezone,
    });
    const endStr = end.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: businessTimezone,
    });

    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);

    const startMinutesFrom8 = (startH - 8) * 60 + startM;
    const endMinutesFrom8 = (endH - 8) * 60 + endM;
    const durationMinutes = Math.max(15, endMinutesFrom8 - startMinutesFrom8);

    // Each hour = 64px, so each minute = 64/60 ≈ 1.0667px
    const pxPerMinute = 64 / 60;
    const topPx = Math.max(0, startMinutesFrom8 * pxPerMinute);
    const heightPx = Math.max(28, durationMinutes * pxPerMinute);

    return { topPx, heightPx, startStr, endStr };
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Today&apos;s Total</span>
            <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {kpis.todayCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {kpis.upcomingCount} upcoming
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span>Confirmed</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {kpis.confirmedCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Ready for service</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
            <span>Pending</span>
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {kpis.pendingCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Awaiting check-in</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {kpis.completedCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Served customers</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs font-medium text-rose-600 dark:text-rose-400">
            <span>Cancelled / No-show</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {kpis.cancelledCount + kpis.noShowCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {kpis.noShowCount} no-shows
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span>Est. Day Revenue</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatPrice(kpis.todayRevenueMinor)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Non-cancelled slots</div>
        </div>
      </div>

      {/* Actionable Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => reloadData(currentDate, selectedStaffId)}
              className="h-7 px-2.5 text-xs font-semibold border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200"
            >
              Retry
            </Button>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 font-bold px-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Calendar Controls & Navigation Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs font-medium"
            >
              Today
            </Button>
            <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous"
                className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next"
                className="rounded p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 ml-1">
              {formatHeaderTitle()}
            </h2>
            {isPending && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-400 ml-1" />
            )}
          </div>

          {/* Right: Actions & View Switcher */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  viewMode === "day"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  viewMode === "week"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  viewMode === "list"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                List
              </button>
            </div>

            {/* "+ New Appointment" Button */}
            <Button
              type="button"
              onClick={() => {
                setWizardDate(currentDate);
                setIsWizardOpen(true);
              }}
              className="h-8 gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Filter bar: Search, Staff, Status */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search customer, phone, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
            />
          </div>

          {/* Staff Filter */}
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
          >
            <option value="all">All Staff Members</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.display_name} {st.professional_title ? `(${st.professional_title})` : ""}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-Show</option>
          </select>

          {/* Refresh manual trigger */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => reloadData(currentDate, selectedStaffId)}
            className="h-8 px-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ml-auto"
            title="Refresh appointments"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* CALENDAR VIEW CONTENT */}
      {viewMode === "day" && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          {/* Day View Header */}
          <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Timeline (08:00 – 20:00 {businessTimezone})
            </span>
            <span>
              {dayAppointments.length} appointment{dayAppointments.length === 1 ? "" : "s"} scheduled
            </span>
          </div>

          <div className="relative min-h-[768px] overflow-x-auto p-4">
            {/* Timeline Hour Grid Lines */}
            <div className="relative" style={{ height: `${timelineHours.length * 64}px` }}>
              {timelineHours.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start border-t border-zinc-100 dark:border-zinc-800/80"
                  style={{ top: `${idx * 64}px`, height: "64px" }}
                >
                  <span className="w-14 text-xs font-medium text-zinc-400 dark:text-zinc-500 select-none">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                  <div
                    className="flex-1 h-full cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-colors"
                    onClick={() => {
                      setWizardDate(currentDate);
                      setIsWizardOpen(true);
                    }}
                    title="Click empty slot to create booking"
                  />
                </div>
              ))}

              {/* Render Appointment Cards Positioned on the Timeline */}
              {dayAppointments.map((app) => {
                const { topPx, heightPx, startStr, endStr } = getAppointmentTimelineOffsets(app);
                const colorStyle = getStatusColor(app.status);
                const custName = app.customer?.name || app.customer_name_snapshot || "Guest Customer";
                const servName = app.service?.name || app.service_name_snapshot || "Service";
                const stName = app.staff?.display_name || "Any Staff";

                return (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedAppointment(app);
                      setIsDetailsOpen(true);
                    }}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      left: "64px",
                      right: "12px",
                    }}
                    className={`absolute z-10 cursor-pointer overflow-hidden rounded-lg border p-2.5 shadow-xs transition-all hover:shadow-md hover:ring-2 hover:ring-blue-400/50 ${colorStyle}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate">
                            {custName}
                          </span>
                          <span className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                            {app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] opacity-90 mt-0.5">
                          <span className="font-semibold">{servName}</span>
                          <span>•</span>
                          <span>{stName}</span>
                          <span>•</span>
                          <span>{formatPrice(app.price_minor_snapshot)}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right font-mono text-[11px] font-semibold">
                        {startStr} – {endStr}
                      </div>
                    </div>
                  </div>
                );
              })}

              {dayAppointments.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-400 text-xs">
                  <CalendarDays className="h-8 w-8 mb-2 text-zinc-300 dark:text-zinc-600" />
                  <span>No appointments scheduled for this day</span>
                  <span className="text-[11px] text-zinc-400 mt-1">
                    Click anywhere on the timeline or &quot;+ New Booking&quot; to create one
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/70 text-center text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            {getWeekDates(currentDate).map((dayStr) => {
              const isToday = dayStr === getTodayDateString();
              const [y, m, d] = dayStr.split("-").map(Number);
              const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
              const dayName = dateObj.toLocaleDateString("en-GB", { weekday: "short" });
              const dayNum = dateObj.getDate();

              return (
                <div
                  key={dayStr}
                  className={`py-2.5 px-1 border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 ${
                    isToday ? "bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" : ""
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wider">{dayName}</div>
                  <div className={`text-base font-bold mt-0.5 ${isToday ? "text-blue-600 dark:text-blue-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                    {dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week Columns with Appointments */}
          <div className="grid grid-cols-7 min-h-[500px] divide-x divide-zinc-200 dark:divide-zinc-800">
            {getWeekDates(currentDate).map((dayStr) => {
              const dayColumnAppointments = filteredAppointments.filter(
                (app) => getAppLocalDate(app) === dayStr
              );

              return (
                <div
                  key={dayStr}
                  className="p-1.5 space-y-2 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors"
                >
                  {dayColumnAppointments.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => {
                        setSelectedAppointment(app);
                        setIsDetailsOpen(true);
                      }}
                      className={`cursor-pointer rounded-lg border p-2 text-xs transition-all hover:shadow-md ${getStatusColor(
                        app.status
                      )}`}
                    >
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {app.customer?.name || app.customer_name_snapshot || "Guest"}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {formatTime(app.starts_at)}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {app.service?.name || app.service_name_snapshot}
                      </div>
                    </div>
                  ))}

                  {dayColumnAppointments.length === 0 && (
                    <div
                      onClick={() => {
                        setWizardDate(dayStr);
                        setIsWizardOpen(true);
                      }}
                      className="h-20 rounded-lg border border-dashed border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 cursor-pointer"
                    >
                      + Book
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST / AGENDA VIEW */}
      {viewMode === "list" && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredAppointments.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => {
                      setSelectedAppointment(app);
                      setIsDetailsOpen(true);
                    }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatDateDisplay(getAppLocalDate(app))}
                      </div>
                      <div className="font-mono text-zinc-500 text-[11px]">
                        {formatTime(app.starts_at)} – {formatTime(app.service_ends_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {app.customer?.name || app.customer_name_snapshot || "Guest Customer"}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {app.customer?.phone || app.customer?.email || "No direct contact"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {app.service?.name || app.service_name_snapshot || "Service"}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {app.service?.duration_minutes || app.duration_minutes_snapshot} mins
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {app.staff?.display_name || "Any Available"}
                      </div>
                      <div className="text-[11px] text-zinc-500 capitalize">
                        {app.staff?.professional_title || "Staff"}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatPrice(app.price_minor_snapshot)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(app);
                          setIsDetailsOpen(true);
                        }}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                      No appointments match the selected filters or date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Booking Wizard Modal */}
      <ManualBookingWizard
        businessId={businessId}
        businessSlug={businessSlug}
        businessTimezone={businessTimezone}
        currency={currency}
        services={servicesList}
        staff={staffList}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialDate={wizardDate}
        onBookingSuccess={(createdAppt) => {
          setIsWizardOpen(false);
          const localBookingDate = createdAppt?.starts_at
            ? formatInstantInTimeZone(new Date(createdAppt.starts_at), businessTimezone).dateStr
            : currentDate;
          setCurrentDate(localBookingDate);
          setSuccessMessage(
            `Appointment successfully created for ${createdAppt?.customer_name_snapshot || "customer"} (${localBookingDate}).`
          );
          reloadData(localBookingDate, selectedStaffId);
        }}
      />

      {/* Appointment Details Slide-over Panel */}
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
        onAppointmentUpdated={(updated) => {
          setIsDetailsOpen(false);
          setSelectedAppointment(null);
          setSuccessMessage(`Appointment status updated to "${updated.status}".`);
          reloadData(currentDate, selectedStaffId);
        }}
      />
    </div>
  );
}
