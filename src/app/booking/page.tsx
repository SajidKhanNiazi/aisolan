import Link from "next/link";
import { Calendar, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BookingPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-5">
          <Calendar className="h-7 w-7" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Public Customer Booking
          </h1>
          <Badge variant="default">Phase 1F Active</Badge>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
          Customer self-service booking is now live for salons and barbershops. To book an appointment, visit your salon&apos;s personal booking page.
        </p>

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 text-left text-xs text-blue-900 dark:text-blue-200 mb-6">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Try the live QA salon booking experience:</p>
              <p className="text-blue-800 dark:text-blue-300">
                Book treatments, select specialists, check conflict-free time slots, and manage reservations without requiring an owner account.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/booking/bookpilot-qa-salon">
            <Button size="md" className="gap-2 w-full sm:w-auto">
              <span>Visit BookPilot QA Salon</span>
              <Calendar className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/businesses">
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              Owner Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
