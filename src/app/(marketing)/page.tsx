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
        "@type": "Organization",
        "@id": "https://bookzello.com/#organization",
        "name": "Bookzello",
        "url": "https://bookzello.com/",
        "logo": {
          "@type": "ImageObject",
          "@id": "https://bookzello.com/#logo",
          "url": "https://bookzello.com/icon-512.png",
          "width": 512,
          "height": 512,
          "caption": "Bookzello Logo"
        },
        "sameAs": [
          "https://www.instagram.com/bookzello/",
          "https://web.facebook.com/profile.php?id=61595843493664"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://bookzello.com/#website",
        "url": "https://bookzello.com/",
        "name": "Bookzello",
        "description": "Online salon booking software, staff scheduling, and appointment management for beauty and wellness businesses.",
        "publisher": {
          "@id": "https://bookzello.com/#organization"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://bookzello.com/#software",
        "name": "Bookzello Salon Booking Software",
        "url": "https://bookzello.com/",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Online appointment booking, staff availability, and daily calendar management software for hair salons, barbershops, and spas.",
        "featureList": [
          "24/7 online client appointment booking",
          "Individual staff schedules and working hours",
          "Automatic double-booking prevention with buffer times",
          "Centralized daily appointment dashboard",
          "AI chatbot receptionist for booking inquiries"
        ],
        "publisher": {
          "@id": "https://bookzello.com/#organization"
        }
      },
      {
        "@type": "WebPage",
        "@id": "https://bookzello.com/#webpage",
        "url": "https://bookzello.com/",
        "name": "Salon Booking Software That Keeps Every Appointment Organized",
        "description": "Bookzello brings online salon booking, staff availability, and appointment management into one system. Manage your team's daily calendar without juggling separate lists.",
        "isPartOf": {
          "@id": "https://bookzello.com/#website"
        },
        "about": {
          "@id": "https://bookzello.com/#software"
        },
        "publisher": {
          "@id": "https://bookzello.com/#organization"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://bookzello.com/#faq",
        "mainEntity": faqData.map((faq) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col items-center justify-center w-full bg-[#FBF6F3] text-[#27232B] selection:bg-[#EBC9C5] selection:text-[#553B4B] font-body overflow-x-clip">
        
        {/* ========================================================= */}
        {/* SECTION 1 (A) — EDITORIAL BEAUTY SAAS HERO                */}
        {/* ========================================================= */}
        <section className="relative w-full overflow-hidden pt-4 pb-8 sm:pt-6 sm:pb-10 lg:pt-7 lg:pb-12">
          {/* Subtle Warm Blush & Champagne Ambient Light */}
          <div 
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[560px] bg-gradient-to-b from-[#EBC9C5]/30 via-[#FBF6F3] to-transparent blur-3xl -z-10 pointer-events-none" 
            aria-hidden="true" 
          />
          <div 
            className="absolute top-12 right-12 w-96 h-96 bg-[#AF6D7B]/10 rounded-full blur-3xl -z-10 pointer-events-none" 
            aria-hidden="true" 
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
              
              {/* Left Column: Balanced Typography & CTAs (Fits viewport comfortably) */}
              <div className="lg:col-span-7 space-y-3.5 sm:space-y-4 text-center lg:text-left">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#AF6D7B]/25 bg-white/80 backdrop-blur-xs px-3 sm:px-3.5 py-1 text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] sm:tracking-[0.16em] uppercase text-[#AF6D7B] shadow-2xs max-w-full">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#AF6D7B]" />
                  <span className="truncate">ONLINE BOOKING FOR SALONS &amp; BARBERSHOPS</span>
                </div>

                {/* Primary SEO H1: Elegant, bold, and balanced */}
                <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] xl:text-[2.65rem] font-medium tracking-tight text-[#27232B] leading-[1.16] max-w-xl mx-auto lg:mx-0">
                  Salon Booking Software That Keeps Every Appointment Organized
                </h1>

                {/* Concise, High-Value Proposition */}
                <p className="text-sm sm:text-base text-[#553B4B]/90 leading-relaxed max-w-lg mx-auto lg:mx-0 font-normal">
                  Give clients a simple 24/7 online booking link, manage your team&apos;s daily calendar in real time, and eliminate double bookings with built-in AI assistance.
                </p>

                {/* High-Value Feature Highlights */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/20 px-3 py-1 text-xs font-medium text-[#27232B] shadow-2xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>24/7 Online Client Booking</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/20 px-3 py-1 text-xs font-medium text-[#27232B] shadow-2xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Zero Double Bookings</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/20 px-3 py-1 text-xs font-medium text-[#27232B] shadow-2xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Multi-Staff Calendar</span>
                  </span>
                </div>

                {/* Dual Conversion CTAs: 100% visible above fold */}
                <div className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-3">
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <span>Explore the Booking Demo</span>
                    <ArrowRight className="h-4 w-4 text-[#EBC9C5]" />
                  </Link>

                  <Link
                    href="/pricing"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#AF6D7B]/30 bg-white/90 backdrop-blur-xs hover:bg-white px-6 py-3 text-xs sm:text-sm font-semibold text-[#27232B] hover:border-[#AF6D7B]/60 transition-all shadow-2xs"
                  >
                    <span>View Pricing</span>
                  </Link>
                </div>

                {/* Supporting Text */}
                <p className="text-[11px] sm:text-xs text-[#553B4B]/70 font-normal pt-0.5">
                  Built for independent salon owners, barbershops, and growing beauty teams.
                </p>
              </div>

              {/* Right Column: Interactive Salon Booking Console */}
              <div className="lg:col-span-5 w-full pt-2 lg:pt-0">
                <HeroVisual />
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2 — QUICK BENEFIT STRIP (REFINED RIBBON)          */}
        {/* ========================================================= */}
        <section className="w-full py-8 sm:py-9 bg-white/80 backdrop-blur-xs border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Benefit 1 */}
              <div className="rounded-2xl border border-[#AF6D7B]/15 bg-[#FBF6F3]/60 p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 shadow-2xs hover:bg-white hover:border-[#AF6D7B]/35 transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#AF6D7B]/20 text-[#AF6D7B]">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">24/7 AI Receptionist</h3>
                  <p className="text-xs text-[#553B4B]/75 mt-0.5">Never miss a booking again</p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="rounded-2xl border border-[#AF6D7B]/15 bg-[#FBF6F3]/60 p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 shadow-2xs hover:bg-white hover:border-[#AF6D7B]/35 transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#AF6D7B]/20 text-[#AF6D7B]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">Online Booking</h3>
                  <p className="text-xs text-[#553B4B]/75 mt-0.5">Let clients book anytime</p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="rounded-2xl border border-[#AF6D7B]/15 bg-[#FBF6F3]/60 p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 shadow-2xs hover:bg-white hover:border-[#AF6D7B]/35 transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#AF6D7B]/20 text-[#AF6D7B]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">Real-time Availability</h3>
                  <p className="text-xs text-[#553B4B]/75 mt-0.5">Prevent double bookings</p>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="rounded-2xl border border-[#AF6D7B]/15 bg-[#FBF6F3]/60 p-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 shadow-2xs hover:bg-white hover:border-[#AF6D7B]/35 transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#AF6D7B]/20 text-[#AF6D7B]">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">Staff &amp; Calendar</h3>
                  <p className="text-xs text-[#553B4B]/75 mt-0.5">Manage team schedules easily</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3 — VALUE PILLARS (ASYMMETRICAL BEAUTY CARDS)     */}
        {/* ========================================================= */}
        <section id="features" className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                WHY SALONS CHOOSE BOOKZELLO
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                Everything You Need to Run a Smoother, Busier Salon
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed max-w-2xl mx-auto">
                Say goodbye to double bookings, messy pen-and-paper notes, and interrupted appointments. Bookzello keeps your chairs filled and your day calm.
              </p>
            </div>

            {/* Asymmetrical 2-Row Layout Instead of Generic 4-Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              {/* Feature 1 — Hero Feature Card (Span 6) */}
              <div className="lg:col-span-6 rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/25 text-[#AF6D7B] mb-5">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-2.5">
                  Real-time Availability
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Show up-to-date slots to avoid double bookings. Availability updates instantly as clients book online or in person.
                </p>
              </div>

              {/* Feature 2 — Hero Feature Card (Span 6) */}
              <div className="lg:col-span-6 rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/25 text-[#AF6D7B] mb-5">
                  <Bell className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-2.5">
                  Automated Confirmations
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Instant email and SMS confirmations with appointment reminders that dramatically cut costly salon no-shows.
                </p>
              </div>

              {/* Feature 3 — Span 6 */}
              <div className="lg:col-span-6 rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/25 text-[#AF6D7B] mb-5">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-2.5">
                  Staff Scheduling
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Manage your team&apos;s working hours, breaks, and vacations with ease. Assign specific treatments to individual specialists.
                </p>
              </div>

              {/* Feature 4 — Span 6 */}
              <div className="lg:col-span-6 rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/25 text-[#AF6D7B] mb-5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-2.5">
                  Manage Bookings Easily
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  View, edit, reschedule, and track all bookings in one calm workspace. Full control over salon policies and rebooking rules.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4 (B) — HOW ONLINE SALON BOOKING WORKS (STEPPER)  */}
        {/* ========================================================= */}
        <section id="how-it-works" className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                HOW IT WORKS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                How Online Salon Booking Works With Bookzello
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed">
                Give customers a straightforward way to book while keeping your salon calendar organized.
              </p>
            </div>

            {/* Sequential Step Progression */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Step 1 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 shadow-xs hover:border-[#AF6D7B]/40 hover:bg-white transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                    Step 01
                  </div>
                  <h3 className="text-lg font-semibold text-[#27232B] mb-2">
                    1. Choose a Service
                  </h3>
                  <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                    Clients select the haircut, styling service, or beauty treatment they need. Your salon controls the service price, duration, and eligible staff members.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 shadow-xs hover:border-[#AF6D7B]/40 hover:bg-white transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                    Step 02
                  </div>
                  <h3 className="text-lg font-semibold text-[#27232B] mb-2">
                    2. Find an Available Time
                  </h3>
                  <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                    Bookzello checks the selected service against salon hours, staff schedules, existing appointments, and configured booking rules. Customers can choose a suitable available time.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 shadow-xs hover:border-[#AF6D7B]/40 hover:bg-white transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                    Step 03
                  </div>
                  <h3 className="text-lg font-semibold text-[#27232B] mb-2">
                    3. Confirm the Appointment
                  </h3>
                  <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                    Clients provide their booking details and complete the reservation. The confirmed appointment is recorded in your salon&apos;s shared calendar.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 shadow-xs hover:border-[#AF6D7B]/40 hover:bg-white transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                    Step 04
                  </div>
                  <h3 className="text-lg font-semibold text-[#27232B] mb-2">
                    4. Manage the Day From Your Dashboard
                  </h3>
                  <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                    Review upcoming appointments, check assigned staff, find customer information, and manage reservations from one place.
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center">
              <Link
                href="/booking/bookpilot-qa-salon"
                className="inline-flex items-center gap-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-8 py-4 text-base font-medium text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>Try the Online Booking Experience</span>
                <ArrowRight className="h-5 w-5 text-[#EBC9C5]" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5 (C) — MANAGE STAFF SCHEDULES (WARM NUDE TONE)   */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                STAFF SCHEDULING &amp; CAPACITY
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                Manage Staff Schedules Without Double Booking
              </h2>
              <div className="mt-4 space-y-3 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed">
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
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                  Set Working Hours for Each Team Member
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Configure working schedules and service assignments so appointment availability reflects who can actually perform a treatment.
                </p>
              </div>

              {/* Point 2 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                  Account for Different Service Durations
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  A 15-minute beard trim and a 60-minute treatment require different calendar intervals. Cleanup buffers can also affect when the next appointment should begin.
                </p>
              </div>

              {/* Point 3 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                  Keep Confirmed Appointments in One Place
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Bookings made through supported customer-facing channels belong in the same appointment system, helping the salon owner review the day&apos;s schedule without searching separate records.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6 — PRODUCT SCREENS / UI SHOWCASE                 */}
        {/* ========================================================= */}
        <section id="showcase" className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                PRODUCT UI SHOWCASE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                A Unified Workspace for Modern Salon Teams
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed">
                Explore the intuitive interface built for salon owners, stylists, and clients. Click through the preview tabs below:
              </p>
            </div>

            <UiShowcase />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 7 (D) — SEE DAILY APPOINTMENTS AT A GLANCE        */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                SALON MANAGEMENT DASHBOARD
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                See Your Salon&apos;s Daily Appointments at a Glance
              </h2>
              <div className="mt-4 space-y-3 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed">
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
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                  Know Who Is Coming In
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Review appointment times, customer names, services, staff assignments, and booking statuses.
                </p>
              </div>

              {/* Point 2 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                  Manage a Growing Team
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Keep individual staff schedules connected to one salon calendar while preserving each team member&apos;s availability.
                </p>
              </div>

              {/* Point 3 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-9 shadow-sm hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                  Check Appointments From Your Phone
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B]/80 leading-relaxed">
                  Use the responsive dashboard to review bookings when you&apos;re away from your computer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 8 — WHO IT'S FOR (BOUTIQUE SALON CARDS)           */}
        {/* ========================================================= */}
        <section id="who-its-for" className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                MADE FOR YOUR BUSINESS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                Tailored for Hair Salons, Barbershops &amp; Beauty Studios
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed">
                Bookzello adapts to your team setup, services, and appointment durations without complicated rules.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category 1: Hair Salons */}
              <div className="rounded-3xl border border-[#EBC9C5] bg-gradient-to-b from-[#FDF8F6] via-white to-white p-6 sm:p-7 shadow-xs hover:border-[#AF6D7B]/60 hover:shadow-md transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <Scissors className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2">Hair Salons</h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Manage cuts, styling, and color treatments with custom durations and cleanup buffers between clients.
                </p>
              </div>

              {/* Category 2: Barbershops */}
              <div className="rounded-3xl border border-[#553B4B]/20 bg-gradient-to-b from-[#F7F4F6] via-white to-white p-6 sm:p-7 shadow-xs hover:border-[#553B4B]/50 hover:shadow-md transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#27232B] text-white mb-5">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2">Barbershops</h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Keep chairs rotating efficiently with quick fades, beard grooming, and hot towel treatments.
                </p>
              </div>

              {/* Category 3: Beauty & Spas */}
              <div className="rounded-3xl border border-[#E5D7CA] bg-gradient-to-b from-[#FAF6F0] via-white to-white p-6 sm:p-7 shadow-xs hover:border-[#AF6D7B]/60 hover:shadow-md transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2">Beauty &amp; Spas</h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Offer relaxing facials, lashes, and skin treatments with assigned treatment rooms and therapists.
                </p>
              </div>

              {/* Category 4: Nail Studios */}
              <div className="rounded-3xl border border-[#EBC9C5] bg-gradient-to-b from-[#FBF2F4] via-white to-white p-6 sm:p-7 shadow-xs hover:border-[#AF6D7B]/60 hover:shadow-md transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-[#AF6D7B]/20 text-[#AF6D7B] mb-5">
                  <Check className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2">Nail Studios</h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Schedule manicures, pedicures, and nail art with flexible service add-ons and specialist selection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 9 (F) — BUILT AROUND REAL SALON BOOKING CHALLENGES*/}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2.5rem] border border-[#AF6D7B]/25 bg-gradient-to-br from-white via-[#FBF6F3] to-[#F5ECE8] p-8 sm:p-12 lg:p-16 shadow-lg shadow-[#553B4B]/5 text-center space-y-6">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/20 px-4 py-1.5 rounded-full shadow-2xs">
                BUILT FOR REAL SALONS
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                Built Around Real Salon Booking Challenges
              </h2>

              <div className="max-w-2xl mx-auto space-y-3.5 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed">
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
                  className="inline-flex items-center gap-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-8 py-4 text-base font-medium text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <span>See Bookzello in Action</span>
                  <ArrowRight className="h-4 w-4 text-[#EBC9C5]" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 10 (E) — WHAT TO LOOK FOR IN SALON SOFTWARE       */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-t border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                BUYER&apos;S EVALUATION GUIDE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                What to Look for in Salon Booking Software
              </h2>
              <div className="mt-4 space-y-3 text-base sm:text-lg text-[#553B4B]/80 leading-relaxed">
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
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-8 hover:bg-white hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                  Check 01
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2.5">
                  Is Online Booking Easy for Your Clients?
                </h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Customers should be able to find a service, understand its price, choose an available appointment, and complete the booking process without unnecessary steps.
                </p>
              </div>

              {/* Checkpoint 2 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-8 hover:bg-white hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                  Check 02
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2.5">
                  Does It Handle Staff Availability Correctly?
                </h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Look for individual working hours, eligible service assignments, appointment durations, and protection against overlapping bookings. Test what happens when two customers request the same stylist.
                </p>
              </div>

              {/* Checkpoint 3 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-8 hover:bg-white hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                  Check 03
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2.5">
                  Can You Manage a Busy Day Quickly?
                </h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  A useful dashboard should show today&apos;s appointments, assigned staff, customer details, and booking statuses clearly. If you manage ten or more appointments, finding the next customer shouldn&apos;t require searching through several screens.
                </p>
              </div>

              {/* Checkpoint 4 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-8 hover:bg-white hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                  Check 04
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2.5">
                  Can Customers Change Their Appointments?
                </h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Review the platform&apos;s cancellation and rescheduling options. Check whether your salon can set booking notice rules and whether released slots become available again.
                </p>
              </div>

              {/* Checkpoint 5 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-8 hover:bg-white hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                  Check 05
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2.5">
                  Is the Pricing Clear?
                </h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Compare the monthly subscription, staff limits, included features, and any additional charges. A low starting price doesn&apos;t always mean a lower total cost for a growing salon.
                </p>
              </div>

              {/* Checkpoint 6 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-8 hover:bg-white hover:border-[#AF6D7B]/45 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] tracking-wider uppercase mb-3">
                  Check 06
                </div>
                <h3 className="text-lg font-semibold text-[#27232B] mb-2.5">
                  Can You Test the Real Booking Experience?
                </h3>
                <p className="text-sm text-[#553B4B]/80 leading-relaxed">
                  Try a customer booking before adopting the system. Check whether it appears correctly in the dashboard, whether staff availability updates, and whether the appointment details remain consistent.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/booking/bookpilot-qa-salon"
                className="inline-flex items-center gap-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-8 py-4 text-base font-medium text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>Explore Bookzello&apos;s Booking Demo</span>
                <ArrowRight className="h-5 w-5 text-[#EBC9C5]" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 11 — FAQ (WARM IVORY SURFACE)                     */}
        {/* ========================================================= */}
        <section id="faq" className="w-full py-16 sm:py-24 bg-[#FBF6F3] border-t border-[#AF6D7B]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-[0.16em] font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/20 px-3.5 py-1 rounded-full">
                COMMON QUESTIONS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#27232B] leading-tight">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-base text-[#553B4B]/80">
                Everything you need to know about Bookzello AI salon booking software.
              </p>
            </div>

            <FaqAccordion items={faqData} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 12 (G) — FINAL CTA BANNER (LUXURY COCOON)         */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-[#AF6D7B]/15">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#27232B] via-[#382633] to-[#27232B] p-8 sm:p-14 lg:p-16 text-center text-white shadow-2xl shadow-[#27232B]/20 border border-[#AF6D7B]/25 relative">
            {/* Ambient pattern */}
            <div 
              className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#AF6D7B]/15 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />
            <div 
              className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#EBC9C5]/10 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-white leading-tight">
                Make Your Next Salon Booking Simpler
              </h2>

              <p className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
                Give clients an easier way to reserve appointments and give your team a clearer place to manage the day. Explore how Bookzello&apos;s salon booking software brings services, staff schedules, and customer bookings together.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#FBF6F3] hover:bg-white text-[#27232B] font-medium px-8 py-4 text-sm sm:text-base shadow-lg transition-all cursor-pointer"
                >
                  <span>Explore the Booking Demo</span>
                  <ArrowRight className="h-4 w-4 text-[#AF6D7B]" />
                </Link>

                <Link
                  href="/pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 text-white font-medium px-8 py-4 text-sm sm:text-base backdrop-blur-xs transition-all"
                >
                  <span>View Pricing</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-stone-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#EBC9C5]" />
                  <span>Early access evaluation</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#EBC9C5]" />
                  <span>Setup in minutes</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#EBC9C5]" />
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
