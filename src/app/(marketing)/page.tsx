import Link from "next/link";
import { 
  Calendar, 
  ShieldCheck, 
  Bot, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Smartphone,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="w-full py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-blue-50/50 via-white to-transparent dark:from-blue-950/20 dark:via-zinc-950 dark:to-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Phase 1A: Architectural & Technical Foundation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.15]">
            AI-Powered Appointment Booking for Service Businesses
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            BookPilot AI is an upcoming multi-tenant appointment-booking SaaS and explainable AI receptionist platform. 
            Engineered initially for independent barbershops and hair salons, with a single deterministic booking core 
            designed to eliminate double-bookings across web, chat, and voice channels.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/booking">
              <Button size="lg" className="gap-2">
                <span>Preview Booking Flow</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="gap-2">
                <span>View Dashboard Placeholder</span>
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg py-2 px-4 max-w-md mx-auto">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Under Active Development: Core framework initialized; no live appointments are active.</span>
          </div>
        </div>
      </section>

      {/* Planned Architecture & Capabilities Overview */}
      <section className="w-full py-16 sm:py-24 bg-white dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="secondary" className="mb-3">Planned Core Architecture</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Deterministic Booking Meets Structured AI
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Designed from first principles to guarantee concurrency safety, tenant isolation, and verifiable AI receptionist actions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle>Collision-Safe Booking</CardTitle>
                <CardDescription>
                  PostgreSQL exclusion constraints prevent race conditions and guarantee zero double-bookings across all client channels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-zinc-500 font-medium">Scheduled for Phase 1</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                  <Bot className="h-5 w-5" />
                </div>
                <CardTitle>Tool-Using AI Receptionist</CardTitle>
                <CardDescription>
                  Conversational assistant uses deterministic server tools for live openings, prices, and policies. Never guesses availability.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-zinc-500 font-medium">Scheduled for Phase 2</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                  <Smartphone className="h-5 w-5" />
                </div>
                <CardTitle>Mobile-First Customer Flow</CardTitle>
                <CardDescription>
                  Fast 4-step mobile booking: Service → Staff → Date/Time → Confirm. WCAG AA accessibility and tokenized self-service changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-zinc-500 font-medium">Scheduled for Phase 1</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
                  <Cpu className="h-5 w-5" />
                </div>
                <CardTitle>Multi-Tenant Isolation</CardTitle>
                <CardDescription>
                  Every business record is scoped with organizational boundaries reinforced by database-level Row Level Security (RLS).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-zinc-500 font-medium">Scheduled for Phase 1B</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                  <Clock className="h-5 w-5" />
                </div>
                <CardTitle>Timezone & Schedule Engine</CardTitle>
                <CardDescription>
                  Full IANA timezone support, daylight saving handling, staff shift overrides, recurring breaks, and service buffer times.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-zinc-500 font-medium">Scheduled for Phase 1</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-2">
                  <Calendar className="h-5 w-5" />
                </div>
                <CardTitle>Multi-Channel Unification</CardTitle>
                <CardDescription>
                  Public mobile website, website chat, WhatsApp messaging, and voice telephone gateways interact with the same database core.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-zinc-500 font-medium">Phases 1–4 Roadmap</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
