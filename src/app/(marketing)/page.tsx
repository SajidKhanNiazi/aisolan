import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { 
  Calendar, 
  Clock, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Scissors,
  Bot,
  MessageSquare,
  CheckCircle2,
  Star,
  Zap,
  Bell
} from "lucide-react";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { UiShowcase } from "@/components/marketing/ui-showcase";
import { HeroCta, ActionBannerCta } from "@/components/marketing/cta-buttons";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export const metadata: Metadata = {
  title: {
    absolute: "Salon Booking Software for Hair & Beauty Businesses | Bookzello",
  },
  description: "Bookzello salon booking software helps clients book online while you manage staff availability, services and appointments in one place. Explore a demo.",
  alternates: {
    canonical: "https://bookzello.com/",
  },
  openGraph: {
    title: "Salon Booking Software | Bookzello",
    description: "Simple online booking, a clear calendar and staff scheduling for hair and beauty businesses.",
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
        {/* SECTION 1 — HERO SECTION                                  */}
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
                {/* Badge above heading with live pulse and shimmer animation */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-200/90 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1D64EC] shadow-xs shimmer-badge">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D64EC]"></span>
                  </span>
                  <span>AI-POWERED FOR SALON BUSINESSES</span>
                </div>

                {/* Primary SEO H1 */}
                <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black tracking-tight text-slate-950 leading-[1.12]">
                  Salon Booking Software{" "}
                  <span className="blue-gradient-text block sm:inline">Powered by AI</span>
                </h1>

                {/* Supporting Paragraph */}
                <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Bookzello helps salons manage bookings through your website chat, WhatsApp, and a hosted booking page — with an AI receptionist that works 24/7.
                </p>

                {/* CTA Buttons */}
                <div className="pt-2 flex justify-center lg:justify-start">
                  <HeroCta 
                    primaryLabel="Start Free" 
                    secondaryLabel="Book a Demo" 
                    demoUrl="/booking/bookpilot-qa-salon" 
                  />
                </div>

                {/* Social Proof Rating Chip */}
                <div className="flex justify-center lg:justify-start pt-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200/80 px-3.5 py-1 text-xs text-slate-600 shadow-2xs">
                    <div className="flex items-center text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                    </div>
                    <span className="font-bold text-slate-900">4.9/5</span>
                    <span className="text-slate-300">•</span>
                    <span>Loved by 500+ salons &amp; barbers</span>
                  </div>
                </div>

                {/* Trust-building micro points */}
                <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1D64EC]" />
                    <span>No credit card required</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1D64EC]" />
                    <span>Setup in minutes</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1D64EC]" />
                    <span>Built for salons &amp; barbers</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1D64EC]" />
                    <span>24/7 support</span>
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
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">WhatsApp Booking</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Accept bookings on WhatsApp</p>
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
        {/* SECTION 3 — KEY FEATURES                                  */}
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
                  Instant WhatsApp and email confirmations with appointment reminders that dramatically cut costly salon no-shows.
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
        {/* SECTION 4 — HOW IT WORKS                                  */}
        {/* ========================================================= */}
        <section id="how-it-works" className="w-full py-16 sm:py-24 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50 border-y border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                HOW IT WORKS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">
                Three Easy Ways to Book Appointments
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Your clients can book through website chat, WhatsApp, or your own booking page — all powered by Bookzello&apos;s AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Step 1: Website Chatbot */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-lg shadow-slate-100 flex flex-col justify-between">
                <div>
                  {/* Visual Phone Mockup */}
                  <div className="relative mx-auto w-full max-w-[260px] aspect-9/14 rounded-[2rem] border-4 border-slate-800 bg-slate-900 p-2 shadow-xl mb-6">
                    <div className="w-full h-full rounded-[1.5rem] bg-gradient-to-b from-blue-50 to-white p-3 flex flex-col justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-blue-100">
                        <div className="h-5 w-5 rounded-full bg-[#1D64EC] text-white flex items-center justify-center font-bold text-[9px]">
                          B
                        </div>
                        <span className="font-bold text-slate-800">Bookzello AI Receptionist</span>
                      </div>
                      <div className="space-y-1.5 py-2">
                        <div className="bg-white rounded-lg p-2 shadow-xs border border-slate-100 text-slate-700">
                          Hi! How can I help you today?
                        </div>
                        <div className="bg-[#1D64EC] text-white rounded-lg p-2 shadow-xs self-end text-right">
                          Book an appointment
                        </div>
                        <div className="bg-white rounded-lg p-2 shadow-xs border border-slate-100 text-slate-700">
                          Sure! We have openings tomorrow at 10:00 AM &amp; 2:00 PM.
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100/60 p-1.5 text-center text-[#1D64EC] font-semibold">
                        Instant Website Booking
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#1D64EC] uppercase tracking-wider">
                    1. Website Chatbot
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">
                    Let AI Book Website Visitors
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Our AI receptionist engages site visitors immediately, answers service questions, and books them directly into your calendar.
                  </p>
                </div>
              </div>

              {/* Step 2: WhatsApp Booking */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-lg shadow-slate-100 flex flex-col justify-between">
                <div>
                  {/* Visual Phone Mockup */}
                  <div className="relative mx-auto w-full max-w-[260px] aspect-9/14 rounded-[2rem] border-4 border-slate-800 bg-slate-900 p-2 shadow-xl mb-6">
                    <div className="w-full h-full rounded-[1.5rem] bg-[#075E54] p-3 flex flex-col justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-emerald-700 text-white">
                        <div className="h-5 w-5 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center font-bold text-[9px]">
                          WA
                        </div>
                        <span className="font-bold">Bookzello WhatsApp</span>
                      </div>
                      <div className="space-y-1.5 py-2">
                        <div className="bg-white rounded-lg p-2 shadow-xs text-slate-800">
                          Hi! I&apos;d like to book a hair cut this Saturday.
                        </div>
                        <div className="bg-[#DCF8C6] rounded-lg p-2 shadow-xs text-slate-800 text-left">
                          Sure! Available times on Saturday:
                          <div className="font-bold text-[#075E54] mt-1">10:00 AM • 12:00 PM • 2:00 PM</div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-emerald-800 p-1.5 text-center text-white font-semibold">
                        Official WhatsApp Channel
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    2. WhatsApp Booking
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">
                    Accept Bookings on WhatsApp
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Clients can book, reschedule, and receive appointment reminders straight through WhatsApp messaging.
                  </p>
                </div>
              </div>

              {/* Step 3: Hosted Booking Page */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-lg shadow-slate-100 flex flex-col justify-between">
                <div>
                  {/* Visual Phone Mockup */}
                  <div className="relative mx-auto w-full max-w-[260px] aspect-9/14 rounded-[2rem] border-4 border-slate-800 bg-slate-900 p-2 shadow-xl mb-6">
                    <div className="w-full h-full rounded-[1.5rem] bg-slate-50 p-3 flex flex-col justify-between text-[10px]">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-slate-900">Select a Service</span>
                        <span className="text-[#1D64EC] font-semibold">1/3</span>
                      </div>
                      <div className="space-y-1.5 py-2">
                        <div className="bg-white rounded-lg p-2 border border-blue-200 shadow-xs flex justify-between items-center">
                          <span className="font-bold text-slate-800">Hair Cut &amp; Style</span>
                          <span className="text-[#1D64EC] font-bold">£45</span>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-xs flex justify-between items-center">
                          <span className="font-medium text-slate-700">Color Treatment</span>
                          <span className="text-slate-900 font-bold">£95</span>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-xs flex justify-between items-center">
                          <span className="font-medium text-slate-700">Nail Care</span>
                          <span className="text-slate-900 font-bold">£35</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-gradient-to-r from-[#1D64EC] to-[#0084FF] text-white p-1.5 text-center font-bold shadow-xs">
                        Continue to Time Slot →
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#1D64EC] uppercase tracking-wider">
                    3. Hosted Booking Page
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">
                    Share Your Booking Link
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Share your personalized booking link anywhere — in your Instagram bio, Google Maps, Facebook, or via SMS.
                  </p>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center">
              <Link
                href="/booking/bookpilot-qa-salon"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1D64EC] to-[#0084FF] px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all"
              >
                <span>Try the Online Booking Experience</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5 — PRODUCT SCREENS / UI SHOWCASE                 */}
        {/* ========================================================= */}
        <section id="showcase" className="w-full py-16 sm:py-24 bg-white">
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
        {/* SECTION 6 — WHO IT'S FOR                                  */}
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
                  <Zap className="h-6 w-6" />
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
        {/* SECTION 7 — WHY BOOKZELLO & SOCIAL PROOF                  */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Testimonial Card */}
              <div className="lg:col-span-6">
                <div className="rounded-[2.5rem] border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30 p-8 sm:p-10 shadow-xl shadow-blue-500/5">
                  <div className="flex items-center gap-1 text-amber-400 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-amber-400" />
                    ))}
                  </div>

                  <blockquote className="text-lg sm:text-xl font-medium text-slate-800 leading-relaxed mb-8">
                    &ldquo;Bookzello has made such a difference for our salon. We get more bookings, spend less time on the phone, and our clients love how easy it is to book!&rdquo;
                  </blockquote>

                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-md">
                      <Image
                        src="/images/testimonial-sarah.jpg"
                        alt="Sarah Mitchell - Salon Owner, Glow Beauty Studio"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Sarah Mitchell</p>
                      <p className="text-xs text-slate-500">Salon Owner, Glow Beauty Studio</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Key Stats & Why Choose Bookzello */}
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-[#1D64EC] bg-blue-50 px-3.5 py-1 rounded-full">
                    TRUSTED BY SALON OWNERS
                  </span>
                  <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
                    Loved by Salons Like Yours
                  </h2>
                  <p className="mt-3 text-base text-slate-600 leading-relaxed">
                    Designed from the ground up to solve the real challenges salon owners face every single day.
                  </p>
                </div>

                {/* Stat Counters matching reference */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-black text-[#1D64EC]">500+</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">Salons Trust Us</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600">30%</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">More Bookings</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-black text-[#1D64EC]">4.9/5</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">Average Rating</p>
                  </div>
                </div>

                {/* Key value checklist */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#1D64EC] mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong>Save time on manual booking:</strong> Stop juggling phone calls and text messages during client appointments.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#1D64EC] mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong>Convert more visitors:</strong> Capture late-night and weekend bookings when your reception desk is closed.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#1D64EC] mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong>Zero double bookings:</strong> Real-time collision engine protects every stylist&apos;s working calendar.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 8 — FAQ                                           */}
        {/* ========================================================= */}
        <section id="faq" className="w-full py-16 sm:py-24 bg-slate-50/60 border-t border-slate-100">
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
        {/* SECTION 9 — FINAL CTA BANNER                              */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
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
                Ready to Grow Your Salon with AI?
              </h2>

              <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
                Join hundreds of salon owners who are saving time and getting more clients with Bookzello.
              </p>

              <div className="pt-2">
                <ActionBannerCta 
                  primaryLabel="Start Free" 
                  secondaryLabel="Book a Demo" 
                  demoUrl="/booking/bookpilot-qa-salon" 
                />
              </div>

              {/* Trust Badges matching reference */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-blue-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>No credit card required</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Setup in minutes</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>24/7 support</span>
                </span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
