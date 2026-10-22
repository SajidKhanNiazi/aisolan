import Link from "next/link";
import { connection } from "next/server";
import {
  Calendar,
  Clock,
  Sparkles,
  Scissors,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Settings,
  Globe,
  Check,
  Users,
  User,
} from "lucide-react";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { getBusinessServices } from "@/features/services/server";
import { getBusinessStaff } from "@/features/staff/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PublicBookingCard } from "@/components/dashboard/public-booking-card";

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

  // Enforces server-side authorization and tenant verification
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

  // Group opening hours summary
  const openDaysCount = openingHours.filter((h) => !h.is_closed).length;

  // Fetch real Phase 1D services and staff counts
  const [servicesData, staffData] = await Promise.all([
    getBusinessServices(businessSlug),
    getBusinessStaff(businessSlug),
  ]);

  const activeServicesCount = servicesData.services.filter((s) => s.is_active).length;
  const activeStaffCount = staffData.staff.filter((s) => s.is_active).length;

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

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {business.name}
            </h1>
            <Badge
              variant={getRoleBadgeVariant(business.role)}
              className="uppercase tracking-wider text-[11px] font-bold px-2 py-0.5"
            >
              Role: {business.role}
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Workspace
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>Slug: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{business.slug}</code></span>
            <span>•</span>
            <span className="capitalize font-medium text-zinc-700 dark:text-zinc-300">Category: {business.business_type}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
              <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <code className="font-mono text-[11px]">{business.timezone || "Europe/London"}</code>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/${business.slug}/appointments`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Open Calendar</span>
          </Link>
          <Link
            href={`/dashboard/${business.slug}/customers`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            <span>Customers</span>
          </Link>
          {isOwner && (
            <Link
              href={`/dashboard/${business.slug}/settings`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Edit Settings</span>
            </Link>
          )}
          <Link
            href={`/booking/${business.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-blue-600" />
            <span>Public Booking Page</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Public Booking Customer Share & QR Code Card */}
      <PublicBookingCard
        businessSlug={business.slug}
        businessName={business.name}
        onlineBookingEnabled={config.policy.online_booking_enabled}
      />

      {/* Setup Completion / Onboarding Card */}
      {!isSetupComplete ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Business Setup Incomplete ({completedCount}/5 steps finished)
                </h2>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                Configure your opening hours, address, confirmed timezone, and cancellation rules to get your salon ready for online bookings.
              </p>
            </div>

            {isOwner && (
              <Link
                href={`/dashboard/${business.slug}/onboarding`}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 whitespace-nowrap transition-colors"
              >
                <span>Complete Setup</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Phase 1C Configuration Active & Complete
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Weekly operating schedule: {openDaysCount} days open • Timezone: {business.timezone}
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/${business.slug}/settings`}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200 underline"
          >
            Review or update settings →
          </Link>
        </div>
      )}

      {/* Opening Hours Summary Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Weekly Operating Schedule Summary
            </h2>
          </div>
          {isOwner && (
            <Link
              href={`/dashboard/${business.slug}/settings`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Edit Schedule
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
            const dayIntervals = openingHours.filter((h) => h.day_of_week === dayIdx);
            const openIntervals = dayIntervals.filter(
              (inv) => !inv.is_closed && inv.open_time && inv.close_time
            );
            const isClosed = openIntervals.length === 0;

            return (
              <div
                key={dayIdx}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-2.5 text-center dark:border-zinc-800/80 dark:bg-zinc-800/40"
              >
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {DAYS_SHORT[dayIdx]}
                </p>
                <div className="mt-1 text-[11px]">
                  {isClosed ? (
                    <span className="text-zinc-400 dark:text-zinc-500">Closed</span>
                  ) : (
                    <div className="space-y-0.5 text-zinc-600 dark:text-zinc-300 font-mono text-[10px]">
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

      {/* Workspace Operational Modules with Accurate Roadmap Labels */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Operational Modules & Milestone Roadmap
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Services Module - Phase 1D ACTIVE */}
          <Card className="border-blue-200 dark:border-blue-900/50 bg-gradient-to-b from-blue-50/30 to-transparent">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <Scissors className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Services & Catalog</CardTitle>
                <Badge variant="default" className="text-[10px] bg-blue-600">Active</Badge>
              </div>
              <CardDescription className="text-xs">
                Haircuts, styling, treatments, durations, and pricing in {business.currency || "GBP"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 rounded-md bg-white p-2.5 border border-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-700">
                <span>Active Services:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{activeServicesCount}</span>
              </div>
              <Link
                href={`/dashboard/${business.slug}/services`}
                className="inline-flex items-center justify-between w-full text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <span>Manage services & pricing</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Staff & Shifts Module - Phase 1D ACTIVE */}
          <Card className="border-purple-200 dark:border-purple-900/50 bg-gradient-to-b from-purple-50/30 to-transparent">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Team & Staff</CardTitle>
                <Badge variant="default" className="text-[10px] bg-purple-600">Active</Badge>
              </div>
              <CardDescription className="text-xs">
                Staff profiles, service assignments, working shifts, and time off.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 rounded-md bg-white p-2.5 border border-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-700">
                <span>Active Team Members:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{activeStaffCount}</span>
              </div>
              <Link
                href={`/dashboard/${business.slug}/staff`}
                className="inline-flex items-center justify-between w-full text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                <span>Manage team & schedules</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Availability & Booking Engine - Phase 1E ACTIVE */}
          <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-b from-emerald-50/30 to-transparent">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Availability Engine</CardTitle>
                <Badge variant="default" className="text-[10px] bg-emerald-600">Active</Badge>
              </div>
              <CardDescription className="text-xs">
                Real-time slot generation, buffer calculation, and capacity holds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-white p-2.5 text-xs text-zinc-600 border border-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-700 dark:text-zinc-300">
                <span>Deterministic collision-safe slot generation (Phase 1E-B).</span>
              </div>
              <Link
                href={`/dashboard/${business.slug}/availability`}
                className="inline-flex items-center justify-between w-full text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <span>Preview appointment slots</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Appointment Calendar & Manual Booking - Phase 1E-C ACTIVE */}
          <Card className="border-blue-200 dark:border-blue-900/50 bg-gradient-to-b from-blue-50/30 to-transparent">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Appointment Calendar</CardTitle>
                <Badge variant="default" className="text-[10px] bg-blue-600">Active</Badge>
              </div>
              <CardDescription className="text-xs">
                Interactive salon calendar, walk-in and phone bookings, rescheduling, and status tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-white p-2.5 text-xs text-zinc-600 border border-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-700 dark:text-zinc-300">
                <span>Day & Week timeline, atomic booking wizard, and daily revenue KPIs.</span>
              </div>
              <Link
                href={`/dashboard/${business.slug}/appointments`}
                className="inline-flex items-center justify-between w-full text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <span>Open appointment calendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Customer Directory - Phase 1E-C ACTIVE */}
          <Card className="border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-b from-indigo-50/30 to-transparent">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                <User className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Customer Directory</CardTitle>
                <Badge variant="default" className="text-[10px] bg-indigo-600">Active</Badge>
              </div>
              <CardDescription className="text-xs">
                Client directory, contact management, lifetime spend, and visit history logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-white p-2.5 text-xs text-zinc-600 border border-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-700 dark:text-zinc-300">
                <span>Client profiles, visit counts, spend metrics, and past appointment history.</span>
              </div>
              <Link
                href={`/dashboard/${business.slug}/customers`}
                className="inline-flex items-center justify-between w-full text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>View customer directory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* AI Receptionist Module - Phase 2 */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-2">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">AI Receptionist</CardTitle>
                <Badge variant="outline" className="text-[10px]">Phase 2</Badge>
              </div>
              <CardDescription className="text-xs">
                Autonomous web, WhatsApp, and phone bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-zinc-50 p-2.5 text-xs text-zinc-500 dark:bg-zinc-800/50">
                Autonomous tool-calling receptionist unlocks in <strong>Phase 2 — FYP AI Receptionist</strong>.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
