import Link from "next/link";
import { Calendar, ArrowLeft, Info, CheckCircle2 } from "lucide-react";
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
            Public Booking Experience
          </h1>
          <Badge variant="warning">Under Development</Badge>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
          This route establishes the URL pattern for customer appointments (e.g., <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">/booking/[businessSlug]</code>). 
          No live appointment scheduling or payment collection is active in Phase 1A.
        </p>

        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 text-left text-xs text-blue-900 dark:text-blue-200 mb-8">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Upcoming Milestone Implementation:</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800 dark:text-blue-300">
                <li>Service catalog & duration calculation</li>
                <li>Staff availability & conflict-free slot generation</li>
                <li>Mobile-first 4-step reservation form</li>
                <li>PostgreSQL atomic concurrency lock against double-booking</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Routing foundation validated & ready for Phase 1 booking core</span>
        </div>
      </div>
    </div>
  );
}
