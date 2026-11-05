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
    <header className="sticky top-0 z-50 w-full border-b border-[#AF6D7B]/15 bg-[#FBF6F3]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Official Brand Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#AF6D7B] rounded-xl p-1"
            aria-label="Bookzello Home"
          >
            <BookzelloLogo iconClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-xl sm:text-2xl" />
          </Link>
        </div>

        {/* Desktop Nav with refined beauty SaaS styling */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium text-[#27232B]/85">
          <Link
            href="/#features"
            className="hover:text-[#AF6D7B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF6D7B] rounded-md px-1.5 py-1"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-[#AF6D7B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF6D7B] rounded-md px-1.5 py-1"
          >
            How It Works
          </Link>
          <Link
            href="/#showcase"
            className="hover:text-[#AF6D7B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF6D7B] rounded-md px-1.5 py-1"
          >
            Product UI
          </Link>
          <Link
            href="/#who-its-for"
            className="hover:text-[#AF6D7B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF6D7B] rounded-md px-1.5 py-1"
          >
            Who It&apos;s For
          </Link>
          <Link
            href="/pricing"
            className="hover:text-[#AF6D7B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF6D7B] rounded-md px-1.5 py-1"
          >
            Pricing
          </Link>
          <Link
            href="/#faq"
            className="hover:text-[#AF6D7B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AF6D7B] rounded-md px-1.5 py-1"
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#AF6D7B]/30 bg-white px-4 py-2 text-xs font-semibold text-[#27232B] shadow-2xs hover:bg-[#FBF6F3] transition-all"
              title={userEmail ? `Signed in as ${userEmail}` : "Account Active"}
            >
              <UserCheck className="h-3.5 w-3.5 text-[#AF6D7B]" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-[#27232B]/85 hover:text-[#AF6D7B] transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60"
            >
              Log In
            </Link>
          )}

          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#27232B] px-5 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-[#553B4B] transition-all active:scale-[0.98]"
          >
            <span>Start Free</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#EBC9C5]" />
          </Link>
        </div>

        {/* Mobile & Tablet Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            href="/booking/bookpilot-qa-salon"
            className="inline-flex items-center rounded-full bg-[#27232B] px-4 py-2 text-xs font-medium text-white shadow-xs"
          >
            Start Free
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-[#27232B] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#AF6D7B]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#AF6D7B]/20 bg-[#FBF6F3] px-5 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-2.5 text-base font-medium text-[#27232B]">
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white hover:text-[#AF6D7B]"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white hover:text-[#AF6D7B]"
            >
              How It Works
            </Link>
            <Link
              href="/#showcase"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white hover:text-[#AF6D7B]"
            >
              Product UI
            </Link>
            <Link
              href="/#who-its-for"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white hover:text-[#AF6D7B]"
            >
              Who It&apos;s For
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white hover:text-[#AF6D7B]"
            >
              Pricing
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white hover:text-[#AF6D7B]"
            >
              FAQ
            </Link>
            <div className="pt-3 border-t border-[#AF6D7B]/20 flex flex-col gap-2.5">
              <Link
                href="/booking/bookpilot-qa-salon"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full bg-[#27232B] px-4 py-3 text-sm font-medium text-white shadow-xs"
              >
                <span>Start Free</span>
                <ArrowRight className="h-4 w-4 text-[#EBC9C5]" />
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-[#AF6D7B]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#27232B]"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#AF6D7B]" />
                  <span>Salon Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-full border border-[#AF6D7B]/30 px-4 py-2.5 text-sm font-medium text-[#27232B] hover:bg-white"
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
