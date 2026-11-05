import type { Metadata } from "next";
import Link from "next/link";
import { 
  Calendar, 
  Clock, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Scissors,
  Bot,
  CheckCircle2,
  Bell,
  Smartphone,
  Check,
  LayoutDashboard
} from "lucide-react";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { UiShowcase } from "@/components/marketing/ui-showcase";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export const metadata: Metadata = {
  title: {
    absolute: "Salon Booking Software That Keeps Every Appointment Organized | Bookzello",
  },
  description: "Bookzello brings online salon booking, staff availability, and appointment management into one system. Manage your team's daily calendar without juggling separate lists.",
  alternates: {
    canonical: "https://bookzello.com/",
  },
  openGraph: {
    title: "Salon Booking Software That Keeps Every Appointment Organized | Bookzello",
    description: "Bookzello brings online salon booking, staff availability, and appointment management into one system.",
    url: "https://bookzello.com/",
    siteName: "Bookzello",
    locale: "en_GB",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const faqData = [
  {
    id: "what-is-bookzello",
    question: "What is Bookzello salon booking software?",
    answer: "Bookzello is an AI-powered salon booking software and scheduling platform designed for hair salons, barbershops, and beauty studios. It provides clients with 24/7 online booking across your website, WhatsApp, and hosted booking pages, while giving your staff a unified calendar that prevents double bookings."
  },
  {
    id: "is-it-for-small-salons",
    question: "Is Bookzello suitable for small salons and independent barbers?",
    answer: "Yes! Bookzello is specifically built for independent salon owners, chair renters, barbershops, and boutique teams with 1 to 10 staff members. It requires zero complicated setup, no technical knowledge, and scales as your business grows."
  },
  {
    id: "can-i-use-on-mobile",
    question: "Can my clients and team use it easily on mobile?",
    answer: "Absolutely. Over 90% of salon clients book on their phones. Bookzello is designed mobile-first: clients can complete reservations in under 60 seconds without downloading an app, and staff can review their daily schedule on any smartphone."
  },
  {
    id: "how-does-ai-receptionist-work",
    question: "How does the AI receptionist handle bookings and inquiries?",
    answer: "Bookzello's AI receptionist connects directly to your verified services, prices, and live calendar. When customers ask about haircut prices, stylists, or available times, the assistant answers naturally in everyday language and guides them to book confirmed slots without making guesses."
  },
  {
    id: "can-i-add-to-website-instagram",
    question: "Can I add Bookzello to my existing website or Instagram?",
    answer: "Yes. You get a personalized hosted booking page link that you can place in your Instagram bio, Google Business profile, Facebook page, or TikTok. You can also embed the booking widget directly into any WordPress, Squarespace, or custom website."
  },
  {
    id: "does-it-prevent-double-bookings",
    question: "Does Bookzello help prevent double bookings?",
    answer: "Yes. Bookzello's deterministic appointment engine validates staff shifts, recurring breaks, service durations, and cleanup buffers before confirming any reservation. Overlapping appointments are automatically blocked at the database level."
  },
  {
    id: "how-much-does-bookzello-cost",
    question: "How much does Bookzello cost?",
    answer: "Bookzello is currently in Early Access with pricing to be announced prior to commercial release. Salons participating in the pilot evaluation can explore the platform without subscription commitments. Learn more on our dedicated Pricing & Plans page."
  }
];

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://bookzello.com/#website",
        "url": "https://bookzello.com/",
        "name": "Bookzello",
        "description": "AI-powered salon booking software for hair and beauty businesses.",
        "publisher": {
          "@id": "https://bookzello.com/#organization"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://bookzello.com/#organization",
        "name": "Bookzello",
        "url": "https://bookzello.com/",
        "logo": "https://bookzello.com/favicon.ico"
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://bookzello.com/#software",
        "name": "Bookzello Salon Booking Software",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col items-center justify-center w-full bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-700">
        
        {/* ========================================================= */}
        {/* SECTION 1 (A) — HERO SECTION                              */}
        {/* ========================================================= */}
        <section className="relative w-full overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-20 lg:pb-28">
          {/* Ambient Multi-Layer Blue Radial Mesh Backdrop */}
          <div 
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[720px] bg-gradient-to-b from-blue-100/40 via-sky-50/25 to-transparent blur-2xl -z-10 pointer-events-none" 
            aria-hidden="true"
          />
          <div 
            className="absolute top-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse-glow" 
            aria-hidden="true" 
          />
          <div 
            className="absolute top-40 left-10 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse-glow" 
            aria-hidden="true" 
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column: Hero Copy & Conversion CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-200/90 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1D64EC] shadow-xs shimmer-badge">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D64EC]"></span>
                  </span>
                  <span>ONLINE BOOKING FOR SALONS &amp; BARBERSHOPS</span>
                </div>

                {/* Primary SEO H1 */}
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight text-slate-950 leading-[1.14]">
                  Salon Booking Software That Keeps Every Appointment Organized
                </h1>

                {/* Supporting Paragraphs */}
                <div className="space-y-3 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  <p>
                    Running a salon is busy enough without constantly checking messages, answering booking calls, or wondering which stylist is free. When appointments come from different places, one missed update can disrupt your schedule and frustrate customers.
                  </p>
                  <p>
                    Bookzello brings online salon booking, staff availability, and appointment management into one system. Give clients a simple booking link, manage your team&apos;s daily calendar, and explore AI-assisted website booking without juggling separate appointment lists.
                  </p>
                </div>

                {/* Dual Conversion CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D64EC] to-[#0084FF] px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Explore the Booking Demo</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/pricing"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm sm:text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs"
                  >
                    <span>View Pricing</span>
                  </Link>
                </div>

                {/* Supporting Text */}
                <p className="text-xs sm:text-sm font-medium text-slate-500 pt-1">
                  Built for independent salon owners, barbershops, and growing beauty teams.
                </p>

                {/* Trust Points */}
                <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1D64EC]" />
                    <span>Real-time availability</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1D64EC]" />
                    <span>Multi-staff calendar</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1D64EC]" />
                    <span>No double bookings</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Hero Visual with Stylist & Glassmorphic UI Cards */}
              <div className="lg:col-span-5 w-full pt-4 lg:pt-0">
                <HeroVisual />
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2 — QUICK BENEFIT STRIP                           */}
        {/* ========================================================= */}
        <section className="w-full py-10 bg-slate-50/60 border-y border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Benefit 1 */}
              <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:shadow-md transition-shadow">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-[#1D64EC]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">24/7 AI Receptionist</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Never miss a booking again</p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:shadow-md transition-shadow">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100/70 text-[#0091FF]">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Online Booking</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Let clients book anytime</p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:shadow-md transition-shadow">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Real-time Availability</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Prevent double bookings</p>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:shadow-md transition-shadow">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100/70 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Staff &amp; Calendar</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage team schedules easily</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3 — VALUE PILLARS                                 */}
        {/* ========================================================= */}
        <section id="features" className="w-full py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                WHY SALONS CHOOSE BOOKZELLO
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                Everything You Need to Run a Smoother, Busier Salon
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Say goodbye to double bookings, messy pen-and-paper notes, and interrupted appointments. Bookzello keeps your chairs filled and your day calm.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 sm:p-7 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#1D64EC] mb-5">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Real-time Availability
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Show up-to-date slots to avoid double bookings. Availability updates instantly as clients book online or in person.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 sm:p-7 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-5">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Automated Confirmations
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Instant email and SMS confirmations with appointment reminders that dramatically cut costly salon no-shows.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 sm:p-7 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-5">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Staff Scheduling
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Manage your team&apos;s working hours, breaks, and vacations with ease. Assign specific treatments to individual specialists.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 sm:p-7 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-[#0091FF] mb-5">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Manage Bookings Easily
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  View, edit, reschedule, and track all bookings in one calm workspace. Full control over salon policies and rebooking rules.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4 (B) — HOW ONLINE SALON BOOKING WORKS            */}
        {/* ========================================================= */}
        <section id="how-it-works" className="w-full py-16 sm:py-24 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50 border-y border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                HOW IT WORKS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                How Online Salon Booking Works With Bookzello
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Give customers a straightforward way to book while keeping your salon calendar organized.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all">
                <div>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-blue-50 text-[#1D64EC] font-black text-sm mb-4">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    1. Choose a Service
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Clients select the haircut, styling service, or beauty treatment they need. Your salon controls the service price, duration, and eligible staff members.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all">
                <div>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-blue-50 text-[#1D64EC] font-black text-sm mb-4">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    2. Find an Available Time
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Bookzello checks the selected service against salon hours, staff schedules, existing appointments, and configured booking rules. Customers can choose a suitable available time.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all">
                <div>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-blue-50 text-[#1D64EC] font-black text-sm mb-4">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    3. Confirm the Appointment
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Clients provide their booking details and complete the reservation. The confirmed appointment is recorded in your salon&apos;s shared calendar.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all">
                <div>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-blue-50 text-[#1D64EC] font-black text-sm mb-4">
                    4
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    4. Manage the Day From Your Dashboard
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Review upcoming appointments, check assigned staff, find customer information, and manage reservations from one place.
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center">
              <Link
                href="/booking/bookpilot-qa-salon"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1D64EC] to-[#0084FF] px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span>Try the Online Booking Experience</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5 (C) — MANAGE STAFF SCHEDULES WITHOUT CONFLICTS  */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                STAFF SCHEDULING &amp; CAPACITY
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                Manage Staff Schedules Without Double Booking
              </h2>
              <div className="mt-4 space-y-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                <p>
                  When several stylists or barbers work in the same salon, they can have different working hours, services, and existing appointments. A single list of appointment times isn&apos;t enough to manage that properly.
                </p>
                <p>
                  Bookzello uses staff-specific availability to help keep schedules accurate. If one stylist is booked at 10 AM, another qualified stylist may still be available at that time. The important rule is preventing overlapping appointments for the same occupied staff member.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Point 1 */}
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/40 p-6 sm:p-8 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#1D64EC] mb-5">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Set Working Hours for Each Team Member
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Configure working schedules and service assignments so appointment availability reflects who can actually perform a treatment.
                </p>
              </div>

              {/* Point 2 */}
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/40 p-6 sm:p-8 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-5">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Account for Different Service Durations
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  A 15-minute beard trim and a 60-minute treatment require different calendar intervals. Cleanup buffers can also affect when the next appointment should begin.
                </p>
              </div>

              {/* Point 3 */}
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/40 p-6 sm:p-8 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-5">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Keep Confirmed Appointments in One Place
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Bookings made through supported customer-facing channels belong in the same appointment system, helping the salon owner review the day&apos;s schedule without searching separate records.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6 — PRODUCT SCREENS / UI SHOWCASE                 */}
        {/* ========================================================= */}
        <section id="showcase" className="w-full py-16 sm:py-24 bg-slate-50/60 border-y border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                PRODUCT UI SHOWCASE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                A Unified Workspace for Modern Salon Teams
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Explore the intuitive interface built for salon owners, stylists, and clients. Click through the preview tabs below:
              </p>
            </div>

            <UiShowcase />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 7 (D) — SEE DAILY APPOINTMENTS AT A GLANCE        */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                SALON MANAGEMENT DASHBOARD
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                See Your Salon&apos;s Daily Appointments at a Glance
              </h2>
              <div className="mt-4 space-y-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                <p>
                  A salon owner should be able to open the dashboard and quickly understand what the day looks like. Who is coming next? Which stylist is assigned? What service has the client booked?
                </p>
                <p>
                  Bookzello brings appointment information into a shared management view so your team can review the schedule, identify confirmed bookings, and find relevant appointment details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Point 1 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#1D64EC] mb-5">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Know Who Is Coming In
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Review appointment times, customer names, services, staff assignments, and booking statuses.
                </p>
              </div>

              {/* Point 2 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-5">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Manage a Growing Team
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Keep individual staff schedules connected to one salon calendar while preserving each team member&apos;s availability.
                </p>
              </div>

              {/* Point 3 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-[#0091FF] mb-5">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Check Appointments From Your Phone
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Use the responsive dashboard to review bookings when you&apos;re away from your computer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 8 — WHO IT'S FOR                                  */}
        {/* ========================================================= */}
        <section id="who-its-for" className="w-full py-16 sm:py-24 bg-slate-50/60 border-y border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                MADE FOR YOUR BUSINESS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                Tailored for Hair Salons, Barbershops &amp; Beauty Studios
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Bookzello adapts to your team setup, services, and appointment durations without complicated rules.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category 1 */}
              <div className="glass-card rounded-3xl p-6 sm:p-7 hover:shadow-xl transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#1D64EC] mb-5">
                  <Scissors className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Hair Salons</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Manage cuts, styling, and color treatments with custom durations and cleanup buffers between clients.
                </p>
              </div>

              {/* Category 2 */}
              <div className="glass-card rounded-3xl p-6 sm:p-7 hover:shadow-xl transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white mb-5">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Barbershops</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Keep chairs rotating efficiently with quick fades, beard grooming, and hot towel treatments.
                </p>
              </div>

              {/* Category 3 */}
              <div className="glass-card rounded-3xl p-6 sm:p-7 hover:shadow-xl transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 mb-5">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Beauty &amp; Spas</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Offer relaxing facials, lashes, and skin treatments with assigned treatment rooms and therapists.
                </p>
              </div>

              {/* Category 4 */}
              <div className="glass-card rounded-3xl p-6 sm:p-7 hover:shadow-xl transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 mb-5">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Nail Studios</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Schedule manicures, pedicures, and nail art with flexible service add-ons and specialist selection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 9 (F) — BUILT AROUND REAL SALON BOOKING CHALLENGES*/}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2.5rem] border border-blue-200/80 bg-gradient-to-br from-blue-50/60 via-white to-sky-50/40 p-8 sm:p-12 lg:p-14 shadow-xl shadow-blue-500/5 text-center space-y-6">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-white border border-blue-200 px-4 py-1.5 rounded-full shadow-2xs">
                BUILT FOR REAL SALONS
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                Built Around Real Salon Booking Challenges
              </h2>

              <div className="max-w-2xl mx-auto space-y-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                <p>
                  Bookzello focuses on the daily tasks that matter to appointment-based businesses: helping clients find available times, keeping staff calendars organized, and giving salon owners a clear view of their bookings.
                </p>
                <p>
                  Explore the booking workflow and see how services, availability, and appointments fit together.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1D64EC] to-[#0084FF] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <span>See Bookzello in Action</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 10 (E) — WHAT TO LOOK FOR IN SALON SOFTWARE       */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-slate-50/60 border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                BUYER&apos;S EVALUATION GUIDE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                What to Look for in Salon Booking Software
              </h2>
              <div className="mt-4 space-y-3 text-base sm:text-lg text-slate-600 leading-relaxed">
                <p>
                  Choosing salon booking software is about more than accepting appointments online. The system needs to work for the customers booking services and the team managing the calendar.
                </p>
                <p>
                  Before choosing a platform, test these practical requirements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Checkpoint 1 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#1D64EC] font-bold text-sm mb-4">
                  01
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Is Online Booking Easy for Your Clients?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Customers should be able to find a service, understand its price, choose an available appointment, and complete the booking process without unnecessary steps.
                </p>
              </div>

              {/* Checkpoint 2 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#1D64EC] font-bold text-sm mb-4">
                  02
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Does It Handle Staff Availability Correctly?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Look for individual working hours, eligible service assignments, appointment durations, and protection against overlapping bookings. Test what happens when two customers request the same stylist.
                </p>
              </div>

              {/* Checkpoint 3 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#1D64EC] font-bold text-sm mb-4">
                  03
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Can You Manage a Busy Day Quickly?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A useful dashboard should show today&apos;s appointments, assigned staff, customer details, and booking statuses clearly. If you manage ten or more appointments, finding the next customer shouldn&apos;t require searching through several screens.
                </p>
              </div>

              {/* Checkpoint 4 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#1D64EC] font-bold text-sm mb-4">
                  04
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Can Customers Change Their Appointments?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Review the platform&apos;s cancellation and rescheduling options. Check whether your salon can set booking notice rules and whether released slots become available again.
                </p>
              </div>

              {/* Checkpoint 5 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#1D64EC] font-bold text-sm mb-4">
                  05
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Is the Pricing Clear?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Compare the monthly subscription, staff limits, included features, and any additional charges. A low starting price doesn&apos;t always mean a lower total cost for a growing salon.
                </p>
              </div>

              {/* Checkpoint 6 */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs hover:border-blue-200 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#1D64EC] font-bold text-sm mb-4">
                  06
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Can You Test the Real Booking Experience?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Try a customer booking before adopting the system. Check whether it appears correctly in the dashboard, whether staff availability updates, and whether the appointment details remain consistent.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/booking/bookpilot-qa-salon"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1D64EC] to-[#0084FF] px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span>Explore Bookzello&apos;s Booking Demo</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 11 — FAQ                                          */}
        {/* ========================================================= */}
        <section id="faq" className="w-full py-16 sm:py-24 bg-white border-t border-slate-100">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                COMMON QUESTIONS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Everything you need to know about Bookzello AI salon booking software.
              </p>
            </div>

            <FaqAccordion items={faqData} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 12 (G) — FINAL CTA BANNER                         */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#1D64EC] via-[#1A5BD8] to-[#0091FF] p-8 sm:p-14 lg:p-16 text-center text-white shadow-2xl shadow-blue-500/25 relative">
            {/* Ambient pattern */}
            <div 
              className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-2xl pointer-events-none" 
              aria-hidden="true" 
            />
            <div 
              className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" 
              aria-hidden="true" 
            />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Make Your Next Salon Booking Simpler
              </h2>

              <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
                Give clients an easier way to reserve appointments and give your team a clearer place to manage the day. Explore how Bookzello&apos;s salon booking software brings services, staff schedules, and customer bookings together.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm sm:text-base font-bold text-[#1D64EC] shadow-lg hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Explore the Booking Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 backdrop-blur-xs px-8 py-4 text-sm sm:text-base font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  <span>View Pricing</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-blue-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Early access evaluation</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Setup in minutes</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Independent salons &amp; barbers</span>
                </span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
