import Link from "next/link";
import { connection } from "next/server";
import { Calendar, LayoutDashboard, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function Navbar() {
  await connection();
  let isAuthenticated = false;
  let userEmail: string | null = null;

  try {
    const user = await getAuthenticatedUser();
    if (user) {
      isAuthenticated = true;
      userEmail = user.email || null;
    }
  } catch {
    // If Supabase check fails in test environment, default gracefully
    isAuthenticated = false;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <span>Bookzello</span>
          </Link>
          <Badge variant="warning" className="hidden sm:inline-flex text-[11px]">
            Phase 1C
          </Badge>
        </div>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/booking"
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            <span>Booking</span>
          </Link>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title={userEmail ? `Signed in as ${userEmail}` : "Account Active"}
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Workspace Active</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <span>Bookzello</span>
          </Link>
          <Badge variant="warning" className="hidden sm:inline-flex text-[11px]">
            Phase 1C
          </Badge>
        </div>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/booking"
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            <span>Booking</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

