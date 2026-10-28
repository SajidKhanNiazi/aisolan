import Link from "next/link";
import { Calendar } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-100 bg-white py-12 text-sm text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-bold text-lg text-slate-900 mb-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1D64EC] to-[#0091FF] text-white shadow-sm shadow-blue-500/20">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Book<span className="text-[#1D64EC]">zello</span>
              </span>
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
                <Link href="/#how-it-works" className="hover:text-[#1D64EC] transition-colors">
                  How Online Booking Works
                </Link>
              </li>
              <li>
                <Link href="/#showcase" className="hover:text-[#1D64EC] transition-colors">
                  Software UI Showcase
                </Link>
              </li>
              <li>
                <Link href="/#who-its-for" className="hover:text-[#1D64EC] transition-colors">
                  Salons &amp; Barbershops
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#1D64EC] transition-colors">
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
                  className="hover:text-[#1D64EC] font-semibold text-[#1D64EC] transition-colors"
                >
                  Explore Booking Demo →
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#1D64EC] transition-colors">
                  Salon Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#1D64EC] transition-colors">
                  Sign In to Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Bookzello. All rights reserved.</p>
          <p>
            AI-powered salon booking software built for modern salons.
          </p>
        </div>
      </div>
    </footer>
  );
}

