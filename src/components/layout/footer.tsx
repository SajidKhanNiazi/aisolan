"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookzelloLogo } from "@/components/ui/bookzello-logo";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function Footer() {
  const pathname = usePathname();

  // Hide Footer completely inside embedded widget iframe
  if (pathname?.startsWith("/embed") || pathname?.startsWith("/dashboard")) {
    return null;
  }

  return (
    <footer className="w-full border-t border-[#AF6D7B]/15 bg-[#FBF6F3] py-14 text-sm text-[#553B4B]/80 font-body transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          
          {/* Brand & Social Column */}
          <div className="sm:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              aria-label="Bookzello Home"
            >
              <BookzelloLogo iconClassName="h-8 w-8" textClassName="text-xl" />
            </Link>
            
            <p className="text-sm text-[#553B4B]/85 max-w-sm leading-relaxed">
              AI-powered salon booking software for hair, barber, and beauty businesses. Keep appointments, staff schedules, and client reservations organized in one calm calendar.
            </p>

            {/* Social Pages with Interactive Beauty UI/UX */}
            <div className="pt-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#AF6D7B]">
                Connect With Bookzello
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href="https://www.instagram.com/bookzello/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#AF6D7B]/25 bg-white hover:bg-gradient-to-r hover:from-[#fdf497]/25 hover:via-[#fd5949]/15 hover:to-[#d6249f]/15 hover:border-[#d6249f]/40 text-xs font-medium text-[#27232B] transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                  aria-label="Follow Bookzello on Instagram (opens in a new tab)"
                >
                  <InstagramIcon className="h-4 w-4 text-[#AF6D7B] group-hover:text-[#d6249f] transition-colors" />
                  <span>Instagram</span>
                  <span className="text-[10px] text-[#AF6D7B]/80 font-normal">@bookzello</span>
                </a>

                <a
                  href="https://web.facebook.com/profile.php?id=61595843493664"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#AF6D7B]/25 bg-white hover:bg-blue-50/70 hover:border-blue-300 text-xs font-medium text-[#27232B] transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                  aria-label="Connect with Bookzello on Facebook (opens in a new tab)"
                >
                  <FacebookIcon className="h-4 w-4 text-[#AF6D7B] group-hover:text-[#1877F2] transition-colors" />
                  <span>Facebook</span>
                  <span className="text-[10px] text-[#AF6D7B]/80 font-normal">Page</span>
                </a>
              </div>
            </div>

            <p className="text-xs text-[#553B4B]/60 leading-relaxed pt-1">
              Product previews and booking demonstrations use synthetic test accounts. Deterministic scheduling engine and availability controls are active in sandbox verification.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-[#27232B] text-xs uppercase tracking-wider mb-3.5">
              Product &amp; Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#features" className="hover:text-[#AF6D7B] transition-colors">
                  Features Overview
                </Link>
              </li>
              <li>
                <Link href="/salon-management-software" className="hover:text-[#AF6D7B] font-medium text-[#27232B] transition-colors">
                  Salon Management Software
                </Link>
              </li>
              <li>
                <Link href="/barbershop-booking-software" className="hover:text-[#AF6D7B] font-medium text-[#27232B] transition-colors">
                  Barbershop Booking Software
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#AF6D7B] transition-colors">
                  Pricing &amp; Plans
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#AF6D7B] transition-colors">
                  How Online Booking Works
                </Link>
              </li>
              <li>
                <Link href="/#showcase" className="hover:text-[#AF6D7B] transition-colors">
                  Software UI Showcase
                </Link>
              </li>
              <li>
                <Link href="/#who-its-for" className="hover:text-[#AF6D7B] transition-colors">
                  Salons &amp; Barbershops
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#AF6D7B] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Access & Demos */}
          <div>
            <h4 className="font-semibold text-[#27232B] text-xs uppercase tracking-wider mb-3.5">
              Explore &amp; Access
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="hover:text-[#553B4B] font-semibold text-[#AF6D7B] transition-colors inline-flex items-center gap-1"
                >
                  <span>Explore Booking Demo</span>
                  <span>→</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#AF6D7B] transition-colors">
                  Salon Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#AF6D7B] transition-colors">
                  Sign In to Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div>
            <h4 className="font-semibold text-[#27232B] text-xs uppercase tracking-wider mb-3.5">
              Legal &amp; Trust
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-[#AF6D7B] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#AF6D7B] transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="hover:text-[#AF6D7B] transition-colors">
                  Data Deletion Instructions
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-8 border-t border-[#AF6D7B]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#553B4B]/70">
          <p>© 2026 Bookzello. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[#553B4B]/80">
            <Link href="/privacy" className="hover:text-[#AF6D7B] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#AF6D7B] transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/data-deletion" className="hover:text-[#AF6D7B] transition-colors">
              Data Deletion
            </Link>
          </div>

          {/* Social Icons in Bottom Bar */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#553B4B]/60 mr-1 hidden sm:inline">Follow us:</span>
            <a
              href="https://www.instagram.com/bookzello/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-[#AF6D7B]/20 text-[#AF6D7B] hover:text-[#d6249f] hover:border-[#d6249f]/40 hover:bg-white transition-all shadow-2xs"
              aria-label="Bookzello Instagram"
              title="Instagram: @bookzello"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://web.facebook.com/profile.php?id=61595843493664"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-[#AF6D7B]/20 text-[#AF6D7B] hover:text-[#1877F2] hover:border-blue-300 hover:bg-white transition-all shadow-2xs"
              aria-label="Bookzello Facebook"
              title="Facebook: Bookzello"
            >
              <FacebookIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
