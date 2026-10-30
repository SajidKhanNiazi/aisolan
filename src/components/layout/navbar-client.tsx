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
  if (pathname?.startsWith("/embed")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Official Brand Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#1852E8] rounded-xl p-1"
            aria-label="Bookzello Home"
          >
            <BookzelloLogo iconClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-xl sm:text-2xl" />
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link
            href="/#features"
            className="hover:text-[#1852E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1852E8] rounded-md px-1 py-0.5"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-[#1852E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1852E8] rounded-md px-1 py-0.5"
          >
            How It Works
          </Link>
          <Link
            href="/#showcase"
            className="hover:text-[#1852E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1852E8] rounded-md px-1 py-0.5"
          >
            Product UI
          </Link>
          <Link
            href="/#who-its-for"
            className="hover:text-[#1852E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1852E8] rounded-md px-1 py-0.5"
          >
            Who It&apos;s For
          </Link>
          <Link
            href="/#faq"
            className="hover:text-[#1852E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1852E8] rounded-md px-1 py-0.5"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3.5">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors"
              title={userEmail ? `Signed in as ${userEmail}` : "Account Active"}
            >
              <UserCheck className="h-3.5 w-3.5 text-[#1852E8]" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-[#1852E8] transition-colors px-2 py-1"
            >
              Log In
            </Link>
          )}

          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1852E8] to-[#00D2FF] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all"
          >
            <span>Start Free</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center rounded-full bg-gradient-to-r from-[#1852E8] to-[#00D2FF] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
          >
            Start Free
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1852E8]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-100 bg-white px-5 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-3 text-base font-semibold text-slate-800">
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-[#1852E8]"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-[#1852E8]"
            >
              How It Works
            </Link>
            <Link
              href="/#showcase"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-[#1852E8]"
            >
              Product UI
            </Link>
            <Link
              href="/#who-its-for"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-[#1852E8]"
            >
              Who It&apos;s For
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-[#1852E8]"
            >
              FAQ
            </Link>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <Link
                href="/booking/bookpilot-qa-salon"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1852E8] to-[#00D2FF] px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25"
              >
                <span>Start Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#1852E8]" />
                  <span>Salon Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
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
