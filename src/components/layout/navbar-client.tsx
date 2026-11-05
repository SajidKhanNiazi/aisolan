"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserCheck, Menu, X, ArrowRight } from "lucide-react";
import { BookzelloLogo } from "@/components/ui/bookzello-logo";

interface NavbarClientProps {
  isAuthenticated: boolean;
  userEmail: string | null;
}

export function NavbarClient({ isAuthenticated, userEmail }: NavbarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Hide Navbar completely inside embedded widget iframe
  if (pathname?.startsWith("/embed") || pathname?.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/60 bg-[#FCFAF8]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Official Brand Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#1852E8] rounded-xl p-1"
            aria-label="Bookzello Home"
          >
            <BookzelloLogo iconClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-xl sm:text-2xl" />
          </Link>
        </div>

        {/* Desktop Nav with refined beauty SaaS styling */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium text-stone-600">
          <Link
            href="/#features"
            className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md px-1.5 py-1"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md px-1.5 py-1"
          >
            How It Works
          </Link>
          <Link
            href="/#showcase"
            className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md px-1.5 py-1"
          >
            Product UI
          </Link>
          <Link
            href="/#who-its-for"
            className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md px-1.5 py-1"
          >
            Who It&apos;s For
          </Link>
          <Link
            href="/pricing"
            className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md px-1.5 py-1"
          >
            Pricing
          </Link>
          <Link
            href="/#faq"
            className="hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md px-1.5 py-1"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition-all"
              title={userEmail ? `Signed in as ${userEmail}` : "Account Active"}
            >
              <UserCheck className="h-3.5 w-3.5 text-rose-700" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-stone-700 hover:text-stone-950 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100/60"
            >
              Log In
            </Link>
          )}

          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <span>Start Free</span>
            <ArrowRight className="h-3.5 w-3.5 text-stone-300" />
          </Link>
        </div>

        {/* Mobile & Tablet Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs"
          >
            Start Free
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-stone-700 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-stone-200/60 bg-[#FCFAF8] px-5 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-2.5 text-base font-semibold text-stone-800">
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-stone-100/70 hover:text-stone-950"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-stone-100/70 hover:text-stone-950"
            >
              How It Works
            </Link>
            <Link
              href="/#showcase"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-stone-100/70 hover:text-stone-950"
            >
              Product UI
            </Link>
            <Link
              href="/#who-its-for"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-stone-100/70 hover:text-stone-950"
            >
              Who It&apos;s For
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-stone-100/70 hover:text-stone-950"
            >
              Pricing
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-stone-100/70 hover:text-stone-950"
            >
              FAQ
            </Link>
            <div className="pt-3 border-t border-stone-200/60 flex flex-col gap-2.5">
              <Link
                href="/booking/bookpilot-qa-salon"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-xs"
              >
                <span>Start Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800"
                >
                  <LayoutDashboard className="h-4 w-4 text-rose-700" />
                  <span>Salon Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-full border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
                >
                  Log In
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
