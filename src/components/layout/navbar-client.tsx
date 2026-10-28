"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, LayoutDashboard, UserCheck, Menu, X, ArrowRight } from "lucide-react";

interface NavbarClientProps {
  isAuthenticated: boolean;
  userEmail: string | null;
}

export function NavbarClient({ isAuthenticated, userEmail }: NavbarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E8E6DF] bg-[#FBFAF8]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-[#142B43] hover:opacity-90 transition-opacity"
            aria-label="Bookzello Home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A8F87] text-white shadow-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#142B43]">Bookzello</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334E68]">
          <Link
            href="/#features"
            className="hover:text-[#0A8F87] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F87] rounded-md px-1 py-0.5"
          >
            Product
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-[#0A8F87] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F87] rounded-md px-1 py-0.5"
          >
            How It Works
          </Link>
          <Link
            href="/#who-its-for"
            className="hover:text-[#0A8F87] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F87] rounded-md px-1 py-0.5"
          >
            Who It&apos;s For
          </Link>
          <Link
            href="/#faq"
            className="hover:text-[#0A8F87] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F87] rounded-md px-1 py-0.5"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A8F87]/30 bg-[#E6F5F4] px-3.5 py-2 text-xs font-semibold text-[#0A8F87] hover:bg-[#d5eeec] transition-colors shadow-2xs"
          >
            <span>Explore Demo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E6DF] bg-white px-3.5 py-2 text-xs font-semibold text-[#142B43] shadow-xs hover:bg-[#F4F2EC] transition-colors"
              title={userEmail ? `Signed in as ${userEmail}` : "Account Active"}
            >
              <UserCheck className="h-3.5 w-3.5 text-[#0A8F87]" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[#142B43] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1B3A5A] transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center rounded-lg bg-[#E6F5F4] px-2.5 py-1.5 text-xs font-semibold text-[#0A8F87]"
          >
            Demo
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-[#142B43] hover:bg-[#E8E6DF]/50 focus:outline-none focus:ring-2 focus:ring-[#0A8F87]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E6DF] bg-[#FBFAF8] px-4 pt-3 pb-5 shadow-lg animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-3 text-base font-medium text-[#142B43]">
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#E6F5F4] hover:text-[#0A8F87]"
            >
              Product
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#E6F5F4] hover:text-[#0A8F87]"
            >
              How It Works
            </Link>
            <Link
              href="/#who-its-for"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#E6F5F4] hover:text-[#0A8F87]"
            >
              Who It&apos;s For
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#E6F5F4] hover:text-[#0A8F87]"
            >
              FAQ
            </Link>
            <div className="pt-3 border-t border-[#E8E6DF] flex flex-col gap-2.5">
              <Link
                href="/booking/bookpilot-qa-salon"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#0A8F87] px-4 py-2.5 text-sm font-semibold text-white shadow-xs"
              >
                <span>Explore Booking Demo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm font-semibold text-[#142B43]"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#0A8F87]" />
                  <span>Open Salon Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg border border-[#142B43] px-4 py-2 text-sm font-semibold text-[#142B43]"
                >
                  Sign In
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
