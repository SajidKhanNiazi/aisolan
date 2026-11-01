"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookzelloLogo } from "@/components/ui/bookzello-logo";

export function Footer() {
  const pathname = usePathname();

  // Hide Footer completely inside embedded widget iframe
  if (pathname?.startsWith("/embed")) {
    return null;
  }
  return (
    <footer className="w-full border-t border-slate-100 bg-white py-12 text-sm text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-3 hover:opacity-95 transition-opacity"
            >
              <BookzelloLogo iconClassName="h-8 w-8" textClassName="text-xl" />
            </Link>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed mb-4">
              AI-powered salon booking software for hair, barber, and beauty businesses. Keep appointments, staff schedules, and client reservations organized in one calm calendar.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Product previews and booking demonstrations use synthetic test accounts. Deterministic scheduling engine and availability controls are active in sandbox verification.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Product &amp; Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#features" className="hover:text-[#1D64EC] transition-colors">
                  Features Overview
                </Link>
              </li>
              <li>
                <Link href="/salon-management-software" className="hover:text-[#1852E8] font-medium text-slate-700 transition-colors">
                  Salon Management Software
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#1852E8] transition-colors">
                  How Online Booking Works
                </Link>
              </li>
              <li>
                <Link href="/#showcase" className="hover:text-[#1852E8] transition-colors">
                  Software UI Showcase
                </Link>
              </li>
              <li>
                <Link href="/#who-its-for" className="hover:text-[#1852E8] transition-colors">
                  Salons &amp; Barbershops
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#1852E8] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Access & Demos */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Explore &amp; Access
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="hover:text-[#1852E8] font-semibold text-[#1852E8] transition-colors"
                >
                  Explore Booking Demo →
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#1852E8] transition-colors">
                  Salon Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#1852E8] transition-colors">
                  Sign In to Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Legal &amp; Trust
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-[#1852E8] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#1852E8] transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="hover:text-[#1852E8] transition-colors">
                  Data Deletion Instructions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Bookzello. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-500">
            <Link href="/privacy" className="hover:text-[#1852E8] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#1852E8] transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/data-deletion" className="hover:text-[#1852E8] transition-colors">
              Data Deletion
            </Link>
          </div>
          <p>
            AI-powered salon booking software built for modern salons.
          </p>
        </div>
      </div>
    </footer>
  );
}

