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
} from "lucide-react";
import { getBusinessBySlug } from "@/features/organizations/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface BusinessWorkspacePageProps {
  params: Promise<{
    businessSlug: string;
  }>;
  searchParams: Promise<{
    created?: string;
  }>;
}

export const instant = false;

export default async function BusinessWorkspacePage({
  params,
  searchParams,
}: BusinessWorkspacePageProps) {
  await connection();
  const { businessSlug } = await params;
  const { created } = await searchParams;

  // Enforces server-side authorization and tenant verification
  const business = await getBusinessBySlug(businessSlug);

  // If user is not an authorized member or slug does not exist, return safe 404
  if (!business) {
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
                You are registered as the verified Owner of {business.name}.
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
          <p className="mt-1.5 text-xs text-zinc-500 flex items-center gap-2">
            <span>Slug: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{business.slug}</code></span>
            <span>•</span>
            <span className="capitalize">Type: {business.business_type}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/booking`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            <span>Public Booking Preview</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Next Setup Step Card */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-start gap-3.5">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-blue-950 dark:text-blue-200">
              Next setup step: Service catalog & staff shifts
            </h2>
            <p className="mt-1 text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
              Your multi-tenant workspace foundation is active and isolated under PostgreSQL Row Level Security (Phase 1B). 
              The next development milestone (Phase 1C) will introduce service definition, staff management, working hours, and the deterministic booking engine.
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Operational Modules (Explicit empty states - no fabricated data) */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Operational Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Services Module */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-2">
                <Scissors className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Services & Catalog</CardTitle>
              <CardDescription className="text-xs">
                Haircuts, styling, treatments, and durations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-zinc-50 p-2.5 text-xs text-zinc-500 dark:bg-zinc-800/50">
                No services configured yet. Service setup will become available in the next milestone.
              </div>
            </CardContent>
          </Card>

          {/* Schedules Module */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-2">
                <Clock className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Staff & Schedules</CardTitle>
              <CardDescription className="text-xs">
                Staff members, working hours, and breaks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-zinc-50 p-2.5 text-xs text-zinc-500 dark:bg-zinc-800/50">
                No staff shifts defined. Schedules and staff management scheduled for Phase 1C.
              </div>
            </CardContent>
          </Card>

          {/* Appointments Module */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-2">
                <Calendar className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Appointments</CardTitle>
              <CardDescription className="text-xs">
                Confirmed bookings and customer arrivals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-zinc-50 p-2.5 text-xs text-zinc-500 dark:bg-zinc-800/50">
                No appointments scheduled. Collision-safe booking engine unlocks in Phase 1C.
              </div>
            </CardContent>
          </Card>

          {/* AI Receptionist Module */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-2">
                <Bot className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">AI Receptionist</CardTitle>
              <CardDescription className="text-xs">
                Autonomous web, WhatsApp, and phone bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-zinc-50 p-2.5 text-xs text-zinc-500 dark:bg-zinc-800/50">
                AI receptionist agent standby. Structured tool-calling receptionist unlocks in Phase 2.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
