import Link from "next/link";
import { Calendar } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-[#E8E6DF] bg-white py-12 text-sm text-[#627D98]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-bold text-lg text-[#142B43] mb-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A8F87] text-white">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#142B43]">Bookzello</span>
            </Link>
            <p className="text-sm text-[#334E68] max-w-md leading-relaxed mb-4">
              Salon booking software for hair, barber, and beauty businesses. Keep appointments, staff schedules, and client reservations organized in one calm calendar.
            </p>
            <p className="text-xs text-[#829AB1] leading-relaxed">
              Product previews and booking demonstrations use synthetic test accounts. Deterministic scheduling engine and availability controls are active in sandbox verification.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-[#142B43] text-xs uppercase tracking-wider mb-3">
              Product & Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#features" className="hover:text-[#0A8F87] transition-colors">
                  Software Overview
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#0A8F87] transition-colors">
                  How Online Booking Works
                </Link>
              </li>
              <li>
                <Link href="/#who-its-for" className="hover:text-[#0A8F87] transition-colors">
                  Salons & Barbershops
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#0A8F87] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Access & Demos */}
          <div>
            <h4 className="font-semibold text-[#142B43] text-xs uppercase tracking-wider mb-3">
              Explore & Access
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="hover:text-[#0A8F87] font-medium text-[#0A8F87] transition-colors"
                >
                  Explore Booking Demo →
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#0A8F87] transition-colors">
                  Salon Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#0A8F87] transition-colors">
                  Sign In to Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E8E6DF] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#829AB1]">
          <p>© 2026 Bookzello. All rights reserved.</p>
          <p>
            Built for independent salon owners and growing teams.
          </p>
        </div>
      </div>
    </footer>
  );
}

