import Link from "next/link";
import { connection } from "next/server";
import {
  Calendar,
  Clock,
  Scissors,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Settings,
  Globe,
  Users,
  User,
} from "lucide-react";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { getBusinessServices } from "@/features/services/server";
import { getBusinessStaff } from "@/features/staff/server";
import { getBusinessBookingReadiness } from "@/features/organizations/readiness";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PublicBookingCard } from "@/components/dashboard/public-booking-card";
import { BookingReadinessCard } from "@/components/dashboard/readiness/booking-readiness-card";
import { SalonLogo } from "@/components/ui/salon-logo";
import { formatInstantInTimeZone } from "@/features/appointments/timezone";
import {
  listAppointmentsBySlug,
  getAppointmentKpis,
} from "@/features/appointments/server";
import { TodayAgenda } from "@/components/dashboard/appointments/today-agenda";
import {
  TrendingUp,
  XCircle,
} from "lucide-react";

interface BusinessWorkspacePageProps {
  params: Promise<{
    businessSlug: string;
  }>;
  searchParams: Promise<{
    created?: string;
    onboarded?: string;
  }>;
}

export const instant = false;

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function BusinessWorkspacePage({
  params,
  searchParams,
}: BusinessWorkspacePageProps) {
  await connection();
  const { businessSlug } = await params;
  const { created, onboarded } = await searchParams;

  // 1. Authorize caller and retrieve workspace configuration
  const config = await getFullBusinessConfig(businessSlug);

  // If user is not an authorized member or slug does not exist, return safe 404
  if (!config) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Workspace Access Restricted
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This workspace does not exist or you do not have permission to view it.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard/businesses"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <span>View Your Authorized Workspaces</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { business, openingHours, onboarding: onboardingProg } = config;
  const isOwner = business.role === "owner";
  const completedCount = onboardingProg.completed_steps?.length || 0;
  const isSetupComplete = onboardingProg.is_completed || completedCount >= 4;

  const tz = business.timezone || "Europe/London";
  const currency = business.currency || "GBP";
  const now = new Date();
  const localToday = formatInstantInTimeZone(now, tz).dateStr;

  // 2. Fetch services, staff, readiness, and today's appointments/KPIs in parallel
  const [servicesData, staffData, readinessReport, appointmentsRes, kpisRes] = await Promise.all([
    getBusinessServices(businessSlug, false),
    getBusinessStaff(businessSlug, false),
    getBusinessBookingReadiness(businessSlug),
    listAppointmentsBySlug(businessSlug, {
      startDate: localToday,
      endDate: localToday,
    }),
    getAppointmentKpis(businessSlug, localToday),
  ]);

  const todayAppointments =
    appointmentsRes.success && appointmentsRes.appointments
      ? appointmentsRes.appointments
      : [];

  const todayKpis =
    kpisRes.success && kpisRes.kpis
      ? kpisRes.kpis
      : {
          todayCount: 0,
          confirmedCount: 0,
          pendingCount: 0,
          completedCount: 0,
          cancelledCount: 0,
          noShowCount: 0,
          upcomingCount: 0,
          todayRevenueMinor: 0,
          currency: currency,
        };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  const activeServicesCount = servicesData.services.filter((s) => s.is_active).length;
  const activeStaffCount = staffData.staff.filter((s) => s.is_active).length;

  const formattedTodayDisplay = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  }).format(now);

  const currentTimeDisplay = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(now);

  const formatPrice = (minorUnits?: number | null) => {
    if (typeof minorUnits !== "number") return "—";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(minorUnits / 100);
  };

  return (
    <div className="space-y-8">
      {/* Creation Confirmation Banner */}
      {created === "true" && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Workspace successfully established!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                You are registered as the verified Owner of {business.name}. Next, complete your business onboarding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Completed Banner */}
      {onboarded === "true" && isSetupComplete && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Setup wizard completed!</p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Your salon profile, weekly schedule, timezone, and booking policies are securely saved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header section — Executive Salon Identity & Quick Actions */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left: Salon Branding & Meta */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <div className="rounded-2xl p-1 bg-white border border-slate-200/90 shadow-xs">
                <SalonLogo name={business.name} logoUrl={business.logo_url} size="lg" />
              </div>
            </div>
            
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 truncate">
                  {business.name}
                </h1>
                
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Salon
                </span>

                <Badge
                  variant={getRoleBadgeVariant(business.role)}
                  className="uppercase tracking-wider text-[10px] font-bold px-2 py-0.5"
                >
                  Role: {business.role}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md font-mono text-[11px]">
                  <span>@</span>
                  <span>{business.slug}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="capitalize text-slate-700 font-medium flex items-center gap-1">
                  <Scissors className="h-3.5 w-3.5 text-blue-600" />
                  <span>{business.business_type}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  <code className="font-mono text-[11px] text-slate-600">{tz}</code>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Tiered Primary & Secondary Action Hub */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <Link
              href={`/dashboard/${business.slug}/appointments`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-blue-500/20 hover:bg-blue-700 hover:shadow-sm transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Open Calendar</span>
            </Link>

            <Link
              href={`/dashboard/${business.slug}/customers`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>Customers</span>
            </Link>

            {isOwner && (
              <Link
                href={`/dashboard/${business.slug}/settings`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                <span>Settings</span>
              </Link>
            )}

            <Link
              href={`/booking/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50/70 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-2xs"
            >
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              <span>Public Page</span>
              <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
            </Link>
          </div>
        </div>
      </div>

      {/* Online Booking Paused Advisory Banner (if owner paused online bookings) */}
      {!config.policy.online_booking_enabled && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Online Booking Currently Paused
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your public booking portal is in private mode. New client bookings cannot be scheduled online.
              </p>
            </div>
          </div>
          {isOwner && (
            <Link
              href={`/dashboard/${business.slug}/settings`}
              className="inline-flex items-center gap-1 self-start sm:self-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs whitespace-nowrap"
            >
              <span>Enable in Settings</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Daily Operations Highlight & Salon Timezone Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-blue-50/30 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>Today&apos;s Daily Operations Overview</span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              {formattedTodayDisplay}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                Salon Timezone: <strong className="font-mono text-slate-800">{tz}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Current Salon Time: <strong className="font-mono text-slate-800">{currentTimeDisplay}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/dashboard/${business.slug}/appointments`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>Open Calendar</span>
            </Link>
          </div>
        </div>

        {/* KPI Strip — 6 Elevated Modern Metric Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 border-t border-slate-200/80 pt-5">
          {/* Total Bookings */}
          <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Today&apos;s Total</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {todayKpis.todayCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-medium">All scheduled today</div>
          </div>

          {/* Confirmed Bookings */}
          <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>Confirmed</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {todayKpis.confirmedCount}
            </div>
            <div className="mt-1 text-[11px] text-emerald-600/90 font-medium">Ready for service</div>
          </div>

          {/* Upcoming Bookings */}
          <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-sky-200 transition-all" title="Confirmed bookings scheduled later today relative to current salon time">
            <div className="flex items-center justify-between text-xs font-semibold text-sky-700">
              <span>Upcoming</span>
              <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {todayKpis.upcomingCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-medium truncate">Later today ({tz})</div>
          </div>

          {/* Completed Bookings */}
          <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-teal-200 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-teal-700">
              <span>Completed</span>
              <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {todayKpis.completedCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-medium">Finished visits</div>
          </div>

          {/* Cancelled Bookings */}
          <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-rose-200 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
              <span>Cancelled</span>
              <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {todayKpis.cancelledCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-medium truncate">
              {todayKpis.noShowCount > 0 ? `${todayKpis.noShowCount} no-shows` : "Released slots"}
            </div>
          </div>

          {/* Est. Day Revenue */}
          <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>Est. Revenue</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate" title={formatPrice(todayKpis.todayRevenueMinor)}>
              {formatPrice(todayKpis.todayRevenueMinor)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-medium">Non-cancelled ({currency})</div>
          </div>
        </div>
      </div>

      {/* Primary Surface: Today&apos;s Appointments Agenda */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Today&apos;s Appointments Agenda
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            {todayAppointments.length} booking{todayAppointments.length === 1 ? "" : "s"} scheduled today
          </span>
        </div>

        <TodayAgenda
          businessSlug={business.slug}
          businessId={business.id}
          businessTimezone={tz}
          currency={currency}
          localToday={localToday}
          initialAppointments={todayAppointments}
          staffList={staffData.staff}
          servicesList={servicesData.services}
        />
      </div>

      
      {/* Public Booking Customer Share & QR Code Card */}
      <PublicBookingCard
        businessSlug={business.slug}
        businessName={business.name}
        onlineBookingEnabled={config.policy.online_booking_enabled}
      />

      {/* Live Booking Readiness Audit & Setup Card */}
      {readinessReport && (
        <BookingReadinessCard
          report={readinessReport}
          businessSlug={business.slug}
          isOwner={isOwner}
        />
      )}

      {/* Opening Hours Summary Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Weekly Operating Schedule Summary
              </h2>
              <p className="text-xs text-slate-500">Regular salon opening hours for client bookings</p>
            </div>
          </div>
          {isOwner && (
            <Link
              href={`/dashboard/${business.slug}/settings`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>Edit Schedule</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
            const dayIntervals = openingHours.filter((h) => h.day_of_week === dayIdx);
            const openIntervals = dayIntervals.filter(
              (inv) => !inv.is_closed && inv.open_time && inv.close_time
            );
            const isClosed = openIntervals.length === 0;

            return (
              <div
                key={dayIdx}
                className={`rounded-xl border p-3 text-center transition-all ${
                  isClosed
                    ? "border-slate-100 bg-slate-50/60"
                    : "border-slate-200/90 bg-white shadow-2xs hover:border-blue-200"
                }`}
              >
                <p className={`text-xs font-bold ${isClosed ? "text-slate-400" : "text-slate-800"}`}>
                  {DAYS_SHORT[dayIdx]}
                </p>
                <div className="mt-1.5 text-[11px]">
                  {isClosed ? (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-100">
                      Closed
                    </span>
                  ) : (
                    <div className="space-y-0.5 text-slate-700 font-mono text-[10px] font-semibold">
                      {openIntervals.map((inv, idx) => (
                        <div key={idx}>
                          {(inv.open_time || "").slice(0, 5)} - {(inv.close_time || "").slice(0, 5)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Operational Modules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Operational Modules &amp; Tools
            </h2>
            <p className="text-xs text-slate-500">Fast navigation to all salon management features</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Services Module */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Scissors className="h-5 w-5" />
              </div>
              <Badge variant="default" className="text-[10px] font-bold bg-blue-600 text-white">
                Active ({activeServicesCount})
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900">Services &amp; Pricing</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Haircuts, styling, treatments, custom durations, and pricing in {business.currency || "GBP"}.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/dashboard/${business.slug}/services`}
                className="inline-flex items-center justify-between w-full text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <span>Manage services &amp; pricing</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Staff & Shifts Module */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="default" className="text-[10px] font-bold bg-purple-600 text-white">
                Active ({activeStaffCount})
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900">Team &amp; Staff</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Stylist profiles, service assignments, working shift schedules, and time off.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/dashboard/${business.slug}/staff`}
                className="inline-flex items-center justify-between w-full text-xs font-bold text-purple-600 hover:text-purple-700"
              >
                <span>Manage team &amp; schedules</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Appointment Calendar & Manual Booking */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <Badge variant="default" className="text-[10px] font-bold bg-blue-600 text-white">
                Live
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900">Appointment Calendar</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Interactive timeline calendar, walk-in and phone bookings, rescheduling, and status tracking.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/dashboard/${business.slug}/appointments`}
                className="inline-flex items-center justify-between w-full text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <span>Open appointment calendar</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Customer Directory */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <Badge variant="default" className="text-[10px] font-bold bg-indigo-600 text-white">
                CRM
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900">Customer Directory</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Client directory, contact management, lifetime spend, and visit history logs.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/dashboard/${business.slug}/customers`}
                className="inline-flex items-center justify-between w-full text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <span>View customer directory</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Availability & Booking Engine */}
          <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <Badge variant="default" className="text-[10px] font-bold bg-emerald-600 text-white">
                Engine
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900">Availability Engine</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Deterministic real-time slot generation, buffer calculation, and capacity holds.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/dashboard/${business.slug}/availability`}
                className="inline-flex items-center justify-between w-full text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                <span>Preview appointment slots</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* AI Receptionist Module */}
          <div className="group rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 bg-white">
                Preview
              </Badge>
            </div>
            <h3 className="text-base font-bold text-slate-800">AI Receptionist</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Autonomous conversational website, WhatsApp, and phone bookings with tool calling.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/60">
              <span className="text-xs font-medium text-slate-400">
                Autonomous voice &amp; chat features active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
