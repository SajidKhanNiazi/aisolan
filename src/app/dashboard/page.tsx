import Link from "next/link";
import { ShieldAlert, ArrowLeft, Users, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPlaceholderPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/50 dark:bg-amber-950/30 mb-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-100 p-2 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-amber-900 dark:text-amber-200">
                Dashboard — Development Placeholder
              </h1>
              <Badge variant="warning">Phase 1A Preview</Badge>
            </div>
            <p className="mt-2 text-sm text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              This dashboard route is a structural placeholder establishing routing conventions. 
              No authentication, business owner login, tenant data, or statistics are active in Phase 1A. 
              Secure Supabase Auth and multi-tenant organization onboarding will be introduced in Phase 1B.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-75">
        <Card>
          <CardHeader>
            <Calendar className="h-5 w-5 text-zinc-400 mb-1" />
            <CardTitle>Daily Appointments</CardTitle>
            <CardDescription>Live daily glance for salon owners</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400 font-mono">Placeholder (Phase 1)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-5 w-5 text-zinc-400 mb-1" />
            <CardTitle>Staff & Shifts</CardTitle>
            <CardDescription>Manage working hours & breaks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400 font-mono">Placeholder (Phase 1)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Settings className="h-5 w-5 text-zinc-400 mb-1" />
            <CardTitle>Salon Settings</CardTitle>
            <CardDescription>Policies, services & timezones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400 font-mono">Placeholder (Phase 1)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
