import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  Users,
  Scissors,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { BarbershopHeroVisual } from "@/components/marketing/barbershop-hero-visual";

export const metadata: Metadata = {
  title: {
    absolute: "Barbershop Booking Software With AI Scheduling | Bookzello",
  },
  description:
    "Let clients book haircuts and beard trims online. Manage barber schedules, prevent double bookings, and organize appointments with Bookzello.",
  alternates: {
    canonical: "https://bookzello.com/barbershop-booking-software",
  },
  openGraph: {
    title: "Barbershop Booking Software With AI Scheduling | Bookzello",
    description:
      "Let clients book haircuts and beard trims online. Manage barber schedules, prevent double bookings, and organize appointments with Bookzello.",
    url: "https://bookzello.com/barbershop-booking-software",
    siteName: "Bookzello",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const faqData = [
  {
    id: "best-booking-software-small-barbershop",
    question: "What is the best booking software for a small barbershop?",
    answer:
      "The best option depends on your team size, budget, and required features. For a small shop, prioritize easy online booking, individual barber schedules, clear pricing, and a simple daily dashboard. Test the booking process before committing to a subscription.",
  },
  {
    id: "can-customers-book-online",
    question: "Can customers book a barber appointment online?",
    answer:
      "Yes. Online barber booking software allows customers to choose a service and an available appointment time through a booking page. Some systems also support website-based AI booking assistants.",
  },
  {
    id: "separate-schedule-each-barber",
    question: "Can each barber have a separate schedule?",
    answer:
      "Yes, many barbershop scheduling platforms support individual staff schedules. This allows different barbers to have their own working hours, assigned services, and existing appointments.",
  },
  {
    id: "how-software-prevents-double-bookings",
    question: "How does booking software prevent double bookings?",
    answer:
      "A reliable system checks the selected barber's existing appointments, service duration, and availability before confirming a booking. It should also recheck availability during final confirmation to prevent conflicting appointments.",
  },
  {
    id: "two-barbers-same-time",
    question: "Can two barbers accept appointments at the same time?",
    answer:
      "Yes. Two different barbers can serve different customers simultaneously, provided each is available and the shop has the necessary capacity. A conflict occurs when appointments overlap for the same required staff member or shared resource.",
  },
  {
    id: "can-clients-choose-barber",
    question: "Can clients choose a specific barber?",
    answer:
      "Many booking systems offer staff selection. If a customer selects a particular barber, the software should check that employee's availability rather than silently assigning someone else.",
  },
  {
    id: "add-booking-to-website",
    question: "Can I add appointment booking to my barbershop website?",
    answer:
      "Yes. Depending on the platform, you may be able to add a booking link, embed a scheduling widget, or use an AI receptionist on your website.",
  },
  {
    id: "free-barbershop-booking-software",
    question: "Is there free barbershop booking software?",
    answer:
      "Some providers offer free plans or trials, but limits and included features vary. Check staff limits, booking restrictions, transaction fees, and paid add-ons before making a decision.",
  },
  {
    id: "does-software-send-reminders",
    question: "Does booking software send appointment reminders?",
    answer:
      "Many platforms support automated email or SMS reminders. The delivery channels, pricing, and configuration requirements vary by provider, so confirm exactly what is included.",
  },
  {
    id: "separate-system-every-barber",
    question: "Do I need a separate booking system for every barber?",
    answer:
      "No. A multi-staff booking system can manage several barbers within one shop while maintaining individual schedules and availability.",
  },
];

export default function BarbershopBookingSoftwarePage() {
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
        "@id": "https://bookzello.com/barbershop-booking-software#webpage",
        "url": "https://bookzello.com/barbershop-booking-software",
        "name": "Barbershop Booking Software That Keeps Your Schedule Under Control",
        "description": "Bookzello barbershop booking software helps barbers and shop owners manage online appointments, barber availability, and daily bookings from one dashboard.",
        "isPartOf": {
          "@id": "https://bookzello.com/#website"
        },
        "about": {
          "@id": "https://bookzello.com/#software"
        },
        "publisher": {
          "@id": "https://bookzello.com/#organization"
        },
        "breadcrumb": {
          "@id": "https://bookzello.com/barbershop-booking-software#breadcrumb"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://bookzello.com/barbershop-booking-software#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://bookzello.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Barbershop Booking Software",
            "item": "https://bookzello.com/barbershop-booking-software"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://bookzello.com/barbershop-booking-software#faq",
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

      <div className="flex flex-col items-center justify-center w-full bg-[#FBF6F3] text-[#27232B] selection:bg-[#EBC9C5] selection:text-[#553B4B] font-body">
        
        {/* ========================================================= */}
        {/* HERO SECTION — COMPACT SAAS 2-COLUMN PRODUCT HERO         */}
        {/* ========================================================= */}
        <section className="relative w-full overflow-hidden pt-4 pb-6 sm:pt-6 sm:pb-10 lg:pt-8 lg:pb-12">
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[720px] bg-gradient-to-b from-[#EBC9C5]/30 via-[#AF6D7B]/10 to-transparent blur-3xl -z-10 pointer-events-none"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              
              {/* Left Column: Product Positioning, Narrative & Direct Fold CTAs */}
              <div className="lg:col-span-7 space-y-2.5 sm:space-y-3 text-center lg:text-left">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#AF6D7B]/25 bg-white/80 backdrop-blur-xs px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#AF6D7B] shadow-2xs">
                  <Scissors className="h-3 w-3 text-[#AF6D7B]" />
                  <span>Barbershop Booking Software &amp; AI Scheduling</span>
                </div>

                {/* H1 Headline */}
                <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-semibold tracking-tight text-[#27232B] leading-[1.14]">
                  Barbershop Booking Software That Keeps Your Schedule Under Control
                </h1>

                {/* Concise, High-Value Value Proposition */}
                <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed max-w-lg mx-auto lg:mx-0 font-normal">
                  Let clients book haircuts and grooming services online 24/7. Organize individual barber schedules, prevent overlapping appointments with buffer times, and manage your day from one simple dashboard.
                </p>

                {/* Conversion Actions Visible in Initial Viewport */}
                <div className="pt-0.5 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5">
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <span>View Bookzello&apos;s Booking Demo</span>
                    <ArrowRight className="h-4 w-4 text-[#EBC9C5]" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#AF6D7B]/30 bg-white hover:bg-[#FBF6F3] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#27232B] hover:border-[#AF6D7B]/50 transition-all shadow-xs active:scale-[0.99]"
                  >
                    <span>Compare Pricing &amp; Plans</span>
                  </Link>
                </div>

                {/* Feature Chips */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#553B4B] shadow-2xs">
                    <ShieldCheck className="h-3 w-3 text-[#AF6D7B]" />
                    <span>Zero Double Bookings</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#553B4B] shadow-2xs">
                    <Users className="h-3 w-3 text-[#AF6D7B]" />
                    <span>Multi-Barber Schedules</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#553B4B] shadow-2xs">
                    <Clock className="h-3 w-3 text-[#AF6D7B]" />
                    <span>24/7 Online Booking</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#553B4B] shadow-2xs">
                    <Sparkles className="h-3 w-3 text-[#AF6D7B]" />
                    <span>AI Chatbot Receptionist</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Interactive Barbershop SaaS Console */}
              <div className="lg:col-span-5 w-full">
                <BarbershopHeroVisual />
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 1: WHAT IS BARBERSHOP BOOKING SOFTWARE?           */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Left Column: Product Definition */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                  PRODUCT OVERVIEW
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                  What Is Barbershop Booking Software?
                </h2>
                <div className="space-y-3 text-[#553B4B] leading-relaxed text-sm sm:text-base">
                  <p>
                    Barbershop booking software is a digital system that helps barbers and shop owners schedule, organize, and manage customer appointments.
                  </p>
                  <p>
                    Instead of relying entirely on calls or handwritten bookings, customers can select a service, choose an available time, and submit an appointment request or confirmation online.
                  </p>
                  <p className="pt-2 text-xs sm:text-sm text-[#553B4B]/80 italic border-t border-[#AF6D7B]/15">
                    Some platforms also include payment processing, marketing tools, point-of-sale systems, and client marketplaces. Others focus on scheduling and appointment management. The best choice depends on how your barbershop operates and which problems you need to solve first.
                  </p>
                </div>
              </div>

              {/* Right Column: Structured SaaS Capabilities Card */}
              <div className="lg:col-span-7">
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-8 space-y-4 shadow-xs">
                  <h3 className="text-xs font-semibold text-[#AF6D7B] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#AF6D7B]" />
                    <span>A typical barber booking system helps you:</span>
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#553B4B]">
                    <li className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0 mt-0.5" />
                      <span>Accept online appointments outside business hours.</span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0 mt-0.5" />
                      <span>Organize individual barber schedules.</span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0 mt-0.5" />
                      <span>Display available haircut and grooming services.</span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0 mt-0.5" />
                      <span>Prevent overlapping appointments for the same barber.</span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0 mt-0.5" />
                      <span>Manage customer bookings from one dashboard.</span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0 mt-0.5" />
                      <span>Handle appointment cancellations and rescheduling.</span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs sm:col-span-2">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0 mt-0.5" />
                      <span>Keep service durations, working hours, and booking rules consistent.</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: WHY BARBERSHOPS NEED ONLINE BOOKING SOFTWARE   */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                OPERATIONAL VALUE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Why Barbershops Need Online Booking Software
              </h2>
              <div className="space-y-3 text-[#553B4B] leading-relaxed text-base sm:text-lg">
                <p>
                  A barbershop&apos;s schedule can change throughout the day. Customers arrive early, appointments run longer than expected, and staff members take breaks or finish shifts at different times. When bookings are managed manually, keeping everything accurate becomes harder as the business grows.
                </p>
                <p className="text-sm sm:text-base text-[#553B4B]/90">
                  You&apos;re halfway through a haircut when your phone rings. Another customer wants a fade, someone needs to reschedule, and two clients are asking for the same barber at 10 AM. Managing appointments through phone calls, text messages, and a paper calendar can quickly become stressful. That&apos;s where barbershop booking software can help. The right system lets clients book appointments online, checks each barber&apos;s availability, and keeps your schedule organized in one place.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-[#FBF6F3] flex items-center justify-center text-[#AF6D7B] border border-[#AF6D7B]/20 mb-2">
                  <Scissors className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B]">
                  Reduce Interruptions During Haircuts
                </h3>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  Every appointment call takes attention away from the customer sitting in your chair. With online booking for barbers, clients can view services and available appointments without waiting for someone to answer the phone. This is especially useful for owner-operated shops where the person managing appointments is also cutting hair.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-[#FBF6F3] flex items-center justify-center text-[#AF6D7B] border border-[#AF6D7B]/20 mb-2">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B]">
                  Let Clients Book After Business Hours
                </h3>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  Customers don&apos;t always look for appointments while your shop is open. A 24/7 booking page lets them check available times in the evening, early morning, or during their lunch break. The shop doesn&apos;t need to be staffed for customers to browse available appointments.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-[#FBF6F3] flex items-center justify-center text-[#AF6D7B] border border-[#AF6D7B]/20 mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B]">
                  Keep Multiple Barber Schedules Organized
                </h3>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  When several barbers work in one location, each may have different working hours, days off, and service specialties. Barbershop scheduling software helps separate those schedules while keeping them visible to the owner. This makes it easier to see who is working, which appointments are coming up, and where free time remains.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: HOW IT WORKS — CLIENT WORKFLOW                 */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                CLIENT EXPERIENCE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Online Booking Software for Barbershops: How It Works
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                Online booking should be simple for customers and easy for the shop owner to manage. A typical booking experience involves three steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-md bg-white border border-[#AF6D7B]/25 px-2.5 py-1 text-xs font-semibold text-[#AF6D7B]">
                    Step 1
                  </div>
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    Step 1: Choose a Haircut or Grooming Service
                  </h3>
                  <p className="text-sm text-[#553B4B] leading-relaxed">
                    Customers open the booking page and select the service they need. For example:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[#27232B] pt-1">
                    <span className="rounded-xl bg-white p-2 text-center border border-[#AF6D7B]/15">Classic Haircut</span>
                    <span className="rounded-xl bg-white p-2 text-center border border-[#AF6D7B]/15">Skin Fade</span>
                    <span className="rounded-xl bg-white p-2 text-center border border-[#AF6D7B]/15">Beard Trim</span>
                    <span className="rounded-xl bg-white p-2 text-center border border-[#AF6D7B]/15">Haircut &amp; Beard Trim</span>
                    <span className="rounded-xl bg-white p-2 text-center border border-[#AF6D7B]/15">Hair Styling</span>
                    <span className="rounded-xl bg-white p-2 text-center border border-[#AF6D7B]/15">Scalp Treatment</span>
                  </div>
                </div>
                <p className="text-xs text-[#553B4B]/80 italic pt-2 border-t border-[#AF6D7B]/10">
                  Each service should have a clear description, price, and estimated duration. This helps clients understand what they&apos;re booking before choosing a time.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-md bg-white border border-[#AF6D7B]/25 px-2.5 py-1 text-xs font-semibold text-[#AF6D7B]">
                    Step 2
                  </div>
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    Step 2: Select an Available Appointment
                  </h3>
                  <p className="text-sm text-[#553B4B] leading-relaxed">
                    The booking system checks the shop&apos;s schedule and displays eligible appointment times. Availability should account for:
                  </p>
                  <ul className="space-y-1.5 text-xs text-[#553B4B]">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF6D7B]" />
                      <span>Shop opening hours.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF6D7B]" />
                      <span>Individual barber working hours.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF6D7B]" />
                      <span>Staff assigned to the selected service.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF6D7B]" />
                      <span>Existing appointments.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF6D7B]" />
                      <span>Service duration.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF6D7B]" />
                      <span>Cleanup or preparation time.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF6D7B]" />
                      <span>Booking notice requirements.</span>
                    </li>
                  </ul>
                </div>
                <p className="text-xs text-[#553B4B]/80 italic pt-2 border-t border-[#AF6D7B]/10">
                  When properly configured, customers see appointment options that match the shop&apos;s actual availability.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-md bg-white border border-[#AF6D7B]/25 px-2.5 py-1 text-xs font-semibold text-[#AF6D7B]">
                    Step 3
                  </div>
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    Step 3: Confirm the Appointment
                  </h3>
                  <p className="text-sm text-[#553B4B] leading-relaxed">
                    The customer enters the required contact details and completes the booking. The appointment then appears in the shop&apos;s management calendar with its service, time, assigned barber, and confirmation status.
                  </p>
                  <p className="text-sm text-[#553B4B] leading-relaxed">
                    Bookzello provides a public booking link that a shop can share with clients or place on its website.
                  </p>
                </div>

                {/* Demo Callout inside Step 3 */}
                <div className="mt-2 rounded-2xl border border-[#AF6D7B]/25 bg-white p-4 space-y-2.5 shadow-2xs">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#AF6D7B]">
                      Live Experience Demo
                    </p>
                    <p className="text-xs text-[#27232B] font-medium">
                      Try the customer booking experience in a real sandbox:
                    </p>
                  </div>
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <span>View Bookzello&apos;s Booking Demo</span>
                    <ExternalLink className="h-3 w-3 text-[#EBC9C5]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: MULTI-BARBER SCHEDULING ENGINE                 */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                SCHEDULING ENGINE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Barbershop Scheduling Software for Multiple Barbers
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                Managing several barbers requires more than a calendar containing appointment times. The system must understand which staff member is performing each service.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Left Column: Staff Schedule & Simultaneous Logic */}
              <div className="lg:col-span-6 space-y-8">
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    Give Every Barber Their Own Schedule
                  </h3>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    Consider a barbershop with three employees:
                  </p>

                  {/* Staff Schedule Table */}
                  <div className="overflow-hidden rounded-2xl border border-[#AF6D7B]/20 bg-white shadow-xs">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-[#FBF6F3] text-[#27232B] font-semibold uppercase tracking-wider text-[11px] border-b border-[#AF6D7B]/15">
                        <tr>
                          <th className="py-3 px-4">Barber</th>
                          <th className="py-3 px-4">Working Hours</th>
                          <th className="py-3 px-4">Services</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AF6D7B]/10 bg-white text-[#553B4B]">
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Daniel</td>
                          <td className="py-3 px-4 font-mono">9 AM–5 PM</td>
                          <td className="py-3 px-4">Haircuts, beard trims</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Emma</td>
                          <td className="py-3 px-4 font-mono">10 AM–6 PM</td>
                          <td className="py-3 px-4">Haircuts, styling</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Sarah</td>
                          <td className="py-3 px-4 font-mono">9 AM–3 PM</td>
                          <td className="py-3 px-4">Haircuts, fades</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-[#553B4B]/60 italic">Illustrative schedule.</p>

                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed pt-1">
                    If someone requests a beard trim at 4 PM, the system should check which qualified barber is available at that time. It shouldn&apos;t offer an appointment with a barber who doesn&apos;t perform that service or has already finished working.
                  </p>
                </div>

                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 space-y-3 shadow-xs">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    Can Two Customers Book the Same Time?
                  </h3>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    Yes, if different eligible barbers are available.
                  </p>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    For example, Daniel can provide a haircut at 10 AM while Emma handles a beard trim at 10 AM. Those are two legitimate appointments, not a double booking. The real conflict happens when two appointments require the same barber during overlapping times.
                  </p>
                  <p className="text-sm sm:text-base text-[#27232B] font-semibold">
                    A reliable booking system must check staff availability rather than simply counting how many appointments exist at a particular hour.
                  </p>
                </div>
              </div>

              {/* Right Column: Specific Barber Requests & Buffer Table */}
              <div className="lg:col-span-6 space-y-8">
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 space-y-3 shadow-xs">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    What If a Customer Requests a Specific Barber?
                  </h3>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    Customers often have a favorite barber.
                  </p>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    If Daniel is booked at 10 AM but Emma is available, the shop may still have capacity for another appointment. However, the system shouldn&apos;t silently replace Daniel with Emma when a customer specifically requested Daniel.
                  </p>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    Instead, it should explain that Daniel is unavailable and offer another time or an alternative barber. This distinction matters for customer trust.
                  </p>
                </div>

                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    Account for Service Duration and Cleanup Time
                  </h3>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    Not every service takes the same amount of time. A 15-minute beard trim and a 50-minute grooming treatment use different portions of a barber&apos;s schedule.
                  </p>
                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                    Consider a 30-minute haircut with a five-minute cleanup buffer:
                  </p>

                  {/* Cleanup buffer table */}
                  <div className="overflow-hidden rounded-2xl border border-[#AF6D7B]/20 bg-white shadow-xs">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-[#FBF6F3] text-[#27232B] font-semibold uppercase tracking-wider text-[11px] border-b border-[#AF6D7B]/15">
                        <tr>
                          <th className="py-3 px-4">Appointment</th>
                          <th className="py-3 px-4">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AF6D7B]/10 bg-white text-[#553B4B] font-mono">
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-2.5 px-4 font-sans text-[#27232B]">Haircut starts</td>
                          <td className="py-2.5 px-4 font-semibold text-[#27232B]">10:00 AM</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-2.5 px-4 font-sans text-[#27232B]">Haircut ends</td>
                          <td className="py-2.5 px-4 font-semibold text-[#27232B]">10:30 AM</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-2.5 px-4 font-sans text-[#27232B]">Cleanup ends</td>
                          <td className="py-2.5 px-4 font-semibold text-[#27232B]">10:35 AM</td>
                        </tr>
                        <tr className="bg-[#FBF6F3] hover:bg-[#FBF6F3]/80 transition-colors">
                          <td className="py-2.5 px-4 font-sans font-semibold text-[#AF6D7B]">Next appointment</td>
                          <td className="py-2.5 px-4 font-bold text-[#AF6D7B]">10:35 AM or later</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-[#553B4B]/60 italic">Illustrative example.</p>

                  <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed pt-1">
                    If the booking system ignores the cleanup buffer, it may offer appointments too close together. Proper duration and buffer settings help the shop maintain a realistic daily schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5: DAILY APPOINTMENTS DASHBOARD                   */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                OWNER DASHBOARD
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Manage Today&apos;s Barber Appointments in One Dashboard
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                For a busy barbershop owner, the most useful part of booking software is often the daily appointments view. After signing in, you should be able to answer a few questions immediately:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: 6 questions summary card */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-7 space-y-3 shadow-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AF6D7B] mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Daily Schedule Overview</span>
                  </h3>
                  <ul className="space-y-2.5 text-sm text-[#553B4B]">
                    <li className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0" />
                      <span>How many appointments do we have today?</span>
                    </li>
                    <li className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0" />
                      <span>Which customers are coming next?</span>
                    </li>
                    <li className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0" />
                      <span>What services have they booked?</span>
                    </li>
                    <li className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0" />
                      <span>Which barber is assigned?</span>
                    </li>
                    <li className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0" />
                      <span>Which appointments are confirmed or canceled?</span>
                    </li>
                    <li className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-[#AF6D7B] shrink-0" />
                      <span>How much scheduled service revenue is on the calendar?</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 shadow-xs space-y-2">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    Access Your Schedule on Mobile
                  </h3>
                  <p className="text-sm text-[#553B4B] leading-relaxed">
                    Shop owners aren&apos;t always sitting at a computer. A mobile-friendly dashboard makes it easier to review appointments, check staff schedules, and find booking information from a phone.
                  </p>
                  <p className="text-sm text-[#553B4B] leading-relaxed">
                    Look for readable appointment cards, accessible navigation, and clear customer contact actions.
                  </p>
                </div>
              </div>

              {/* Right Column: Detailed Table */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-[#27232B]">
                      See Appointment Details at a Glance
                    </h3>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      A clear dashboard should make this information easy to find without requiring you to open every appointment individually.
                    </p>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      A useful daily appointment list includes:
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#AF6D7B]/20 bg-white shadow-xs">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-[#FBF6F3] text-[#27232B] font-semibold uppercase tracking-wider text-[11px] border-b border-[#AF6D7B]/15">
                        <tr>
                          <th className="py-3 px-4">Information</th>
                          <th className="py-3 px-4">Why It Matters</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AF6D7B]/10 bg-white text-[#553B4B]">
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Customer name</td>
                          <td className="py-3 px-4 text-[#553B4B]/80">Identify who&apos;s arriving</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Appointment time</td>
                          <td className="py-3 px-4 text-[#553B4B]/80">Prepare for the next customer</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Service</td>
                          <td className="py-3 px-4 text-[#553B4B]/80">Know what work is scheduled</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Assigned barber</td>
                          <td className="py-3 px-4 text-[#553B4B]/80">Coordinate your team</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Status</td>
                          <td className="py-3 px-4 text-[#553B4B]/80">Distinguish confirmed and canceled bookings</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Price</td>
                          <td className="py-3 px-4 text-[#553B4B]/80">Understand scheduled service value</td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#27232B]">Contact details</td>
                          <td className="py-3 px-4 text-[#553B4B]/80">Reach the customer when necessary</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-sm text-[#553B4B] leading-relaxed pt-1">
                    For a shop handling 10–20 appointments a day, a readable, time-ordered list can be more practical than a large calendar full of overlapping appointment blocks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6: AI RECEPTIONIST INTEGRATION                    */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                AI RECEPTIONIST
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Use an AI Receptionist for Barber Appointment Booking
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                An AI receptionist can help customers ask booking questions through a website chat interface. For example, a visitor might ask:
              </p>
            </div>

            {/* Quote block */}
            <div className="rounded-3xl border-l-4 border-[#AF6D7B] bg-white p-6 sm:p-7 text-base sm:text-lg font-medium text-[#27232B] italic shadow-xs max-w-3xl mx-auto">
              &ldquo;Can I book a haircut with Daniel tomorrow afternoon?&rdquo;
            </div>

            <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed text-center max-w-3xl mx-auto">
              Instead of requiring the visitor to browse every time slot manually, an AI-assisted booking flow can help identify the service, understand the requested time, and check appointment availability.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
                <h3 className="text-xl font-semibold text-[#27232B]">
                  Answer Common Booking Questions
                </h3>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  A website AI receptionist can help visitors find information about:
                </p>
                <ul className="grid grid-cols-2 gap-2.5 text-xs font-medium text-[#27232B]">
                  <li className="rounded-xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-2.5">Available services</li>
                  <li className="rounded-xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-2.5">Service prices</li>
                  <li className="rounded-xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-2.5">Appointment durations</li>
                  <li className="rounded-xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-2.5">Working hours</li>
                  <li className="rounded-xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-2.5">Available booking times</li>
                  <li className="rounded-xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-2.5">Booking &amp; cancellation rules</li>
                </ul>
                <p className="text-xs text-[#553B4B]/80 italic pt-1">
                  It should use the shop&apos;s configured information rather than inventing prices, schedules, or availability.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
                <h3 className="text-xl font-semibold text-[#27232B]">
                  Connect AI Booking to the Same Calendar
                </h3>
                <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                  An important question to ask any AI booking provider is whether the AI uses the same scheduling information as the online booking page.
                </p>
                <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed">
                  If a customer books a slot through the website, the AI should recognize that the appointment is no longer available for the assigned barber. Otherwise, two booking channels could provide contradictory information.
                </p>
                <p className="text-sm sm:text-base text-[#27232B] font-semibold border-l-4 border-[#AF6D7B] pl-3.5 py-1 bg-[#FBF6F3] rounded-r-xl">
                  Bookzello is designed around a shared appointment system for its public booking page and website AI receptionist.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 7: TESTING INSIGHTS & RIGOR                       */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-20 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                VERIFIED LOGIC
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                What We Learned While Testing Bookzello
              </h2>
            </div>
            <div className="rounded-3xl border border-[#AF6D7B]/25 bg-[#FBF6F3] p-6 sm:p-8 space-y-4 shadow-xs">
              <p className="text-[#553B4B] leading-relaxed text-sm sm:text-base">
                During Bookzello&apos;s booking-system testing, we created two confirmed appointments at the same time for different staff members. Both appointments appeared in the salon dashboard, demonstrating how simultaneous bookings can be valid when separate barbers are assigned.
              </p>
              <p className="text-[#553B4B] leading-relaxed text-sm sm:text-base">
                We also identified an availability inconsistency during testing: the AI receptionist initially offered a time already occupied by a specifically requested staff member. That finding led to additional staff-specific availability checks, draft validation, and regression tests.
              </p>
              <p className="text-[#27232B] leading-relaxed text-sm sm:text-base font-semibold border-t border-[#AF6D7B]/15 pt-3">
                The practical lesson is simple: an AI receptionist should not promise an appointment based only on a conversational response. It needs reliable scheduling data and a final availability check before confirmation.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 8: HOW TO CHOOSE THE BEST SOFTWARE                */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                BUYER&apos;S EVALUATION FRAMEWORK
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                How to Choose the Best Barbershop Booking Software
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                The best barbershop booking software isn&apos;t necessarily the platform with the most features. It is the one that supports your shop&apos;s everyday workflow without adding unnecessary complexity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 space-y-2 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-[#27232B]">
                  1. Check the Customer Booking Experience
                </h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Open the booking page as if you were a customer. Can you select a service, find a suitable time, and understand the next step without assistance? A complicated booking process can create more work for the shop instead of reducing it.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 space-y-2 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-[#27232B]">
                  2. Test Staff Availability
                </h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Add at least two barbers with different schedules. Check whether the system respects working hours, service qualifications, existing bookings, buffers, and blocks overlapping slots for the same barber. This is one of the most important operational tests.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 space-y-2 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-[#27232B]">
                  3. Evaluate the Daily Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Don&apos;t judge software only by its customer-facing booking page. The owner dashboard is where you&apos;ll spend time managing appointments. Make sure you can quickly find customer names, scheduled services, staff assignments, and appointment statuses.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 space-y-2 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-[#27232B]">
                  4. Review Cancellation and Rescheduling Options
                </h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Customers sometimes need to change appointments. Look for clear cancellation rules and a manageable rescheduling process. Check whether a canceled appointment releases the relevant time so another customer can book it.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 space-y-2 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-[#27232B]">
                  5. Understand the Full Monthly Cost
                </h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Some platforms charge per location. Others charge per staff member or add separate fees for particular services. Before choosing a system, compare the total cost for your actual team size.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 space-y-2 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <h3 className="text-base font-semibold text-[#27232B]">
                  6. Check What Is Included
                </h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Booking software, salon management software, and point-of-sale software are not always the same thing. If you need retail inventory, payment terminals, payroll, chair rental management, or walk-in queues, verify that the platform actually includes those tools. Don&apos;t assume every scheduling product provides a complete barbershop management suite.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 9: PRICING COMPARISON CHECKLIST                   */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                TRANSPARENT VALUE
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Barbershop Booking Software Pricing: What Should You Compare?
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                The advertised monthly subscription is only one part of the total cost. For a shop with several barbers, additional staff licenses and optional services may change the final amount. Use this checklist when comparing plans:
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#AF6D7B]/20 bg-white shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-[#FBF6F3] text-[#27232B] font-semibold uppercase tracking-wider text-[11px] border-b border-[#AF6D7B]/15">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Cost Factor</th>
                    <th className="py-3.5 px-4 sm:px-6">What to Ask</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#AF6D7B]/10 bg-white text-[#553B4B]">
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Base subscription</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">What is the monthly price?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Barber accounts</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">Is there a charge for each additional barber?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Online appointments</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">Are there booking limits or extra fees?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Payment processing</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">Are card transaction fees separate?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">AI features</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">Is the AI receptionist included or an add-on?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Notifications</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">Are email or SMS messages included?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Website integration</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">Can the booking system be embedded?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Cancellation terms</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/80">Can you change or cancel the subscription?</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-[#553B4B] leading-relaxed text-center">
              <p>
                For example, a low monthly starting price may become less attractive when every additional barber requires a paid seat. Compare the actual cost for a two-person, five-person, or ten-person shop rather than choosing solely by the advertised starting price.
              </p>
              <p>
                You can review Bookzello&apos;s available plans on the{" "}
                <Link href="/pricing" className="text-[#AF6D7B] font-semibold underline hover:text-[#553B4B]">
                  pricing page
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 10: PAPER DIARY VS ONLINE BOOKING                 */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                SYSTEM COMPARISON
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Barbershop Booking Software vs. a Paper Appointment Book
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                A paper diary can work for a solo barber with a small number of regular customers. But it becomes more difficult to maintain when bookings arrive from several channels or multiple staff members share the shop.
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#AF6D7B]/20 bg-white shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-[#FBF6F3] text-[#27232B] font-semibold uppercase tracking-wider text-[11px] border-b border-[#AF6D7B]/15">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Feature</th>
                    <th className="py-3.5 px-4 sm:px-6">Paper Diary</th>
                    <th className="py-3.5 px-4 sm:px-6 text-[#AF6D7B]">Online Booking System</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#AF6D7B]/10 bg-white text-[#553B4B]">
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Customer self-booking</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/60">No</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-emerald-600">Yes</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Booking outside shop hours</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/60">Requires manual coordination</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-[#27232B]">Available through booking link</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Staff availability</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/60">Checked manually</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-[#27232B]">Calculated from configured schedules</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Appointment search</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/60">Manual</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-[#27232B]">Searchable records</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Multiple booking channels</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/60">Difficult to coordinate</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-[#27232B]">Can share one system</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Appointment changes</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/60">Updated by hand</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-[#27232B]">Managed digitally</td>
                  </tr>
                  <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B]">Daily overview</td>
                    <td className="py-3.5 px-4 sm:px-6 text-[#553B4B]/60">Handwritten</td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-[#27232B]">Organized dashboard</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm sm:text-base text-[#553B4B] leading-relaxed pt-1 text-center">
              An online system still needs correct setup and maintenance. If staff hours, service durations, or availability rules are inaccurate, digital scheduling can also produce poor results. Software works best when the information behind it reflects how the barbershop actually operates.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 11: AUDIENCE PERSONAS                             */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                WHO IT&apos;S FOR
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Is Bookzello Suitable for Your Barbershop?
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                Bookzello focuses on online appointment booking, staff availability, website AI assistance, and a shared booking dashboard. It can be relevant to several types of barber businesses:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-[#FBF6F3] flex items-center justify-center text-[#AF6D7B] border border-[#AF6D7B]/20">
                  <Scissors className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B]">
                  Independent Barbers
                </h3>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  A solo barber can use a booking link to let customers select services and available appointments. This reduces dependence on manual scheduling calls.
                </p>
              </div>

              <div className="rounded-3xl border-2 border-[#AF6D7B]/35 bg-gradient-to-b from-white to-[#FBF6F3]/50 p-7 shadow-sm hover:border-[#AF6D7B] hover:shadow-md transition-all space-y-3 relative">
                <span className="absolute -top-3 right-6 bg-[#27232B] text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  Most Popular
                </span>
                <div className="h-11 w-11 rounded-2xl bg-[#FBF6F3] flex items-center justify-center text-[#AF6D7B] border border-[#AF6D7B]/20">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B]">
                  Small Barbershops With Multiple Employees
                </h3>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  For shops with several barbers, individual staff schedules and service assignments help coordinate bookings. The owner can review appointments through a shared management dashboard.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all space-y-3">
                <div className="h-11 w-11 rounded-2xl bg-[#FBF6F3] flex items-center justify-center text-[#AF6D7B] border border-[#AF6D7B]/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#27232B]">
                  Men&apos;s Grooming Studios
                </h3>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  Studios offering haircuts, beard trims, hair styling, and treatments can configure services with different durations and prices. The booking system can then use those settings when determining appointment availability.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#553B4B]/70 italic text-center">
              Before adopting any platform, verify that its current features cover your specific operational needs.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 12: GETTING STARTED ROADMAP                       */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                ONBOARDING
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                How to Get Started With Bookzello
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base sm:text-lg">
                Setting up a barber shop booking system should begin with the information you already use to run your business.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 space-y-2.5 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] uppercase tracking-wider">Step 1</div>
                <h3 className="text-base font-semibold text-[#27232B]">Create Your Profile</h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Add shop details, operating timezone, and currency. Use the timezone where your shop physically operates so clients see correct local times.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 space-y-2.5 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] uppercase tracking-wider">Step 2</div>
                <h3 className="text-base font-semibold text-[#27232B]">Add Services &amp; Prices</h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Create your haircut and grooming services. Enter accurate prices, durations, and any required buffer time.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 space-y-2.5 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] uppercase tracking-wider">Step 3</div>
                <h3 className="text-base font-semibold text-[#27232B]">Add Your Barbers</h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Set up staff members, assign services, and configure working hours. Review availability carefully before opening appointments to clients.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 space-y-2.5 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] uppercase tracking-wider">Step 4</div>
                <h3 className="text-base font-semibold text-[#27232B]">Set Booking Policies</h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Choose booking notice rules, advance horizons, and cancellation policies to keep appointments manageable for clients and staff.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 space-y-2.5 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] uppercase tracking-wider">Step 5</div>
                <h3 className="text-base font-semibold text-[#27232B]">Share Your Booking Link</h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Share the public booking link with clients or embed it on your website. If using the AI chatbot, confirm availability matches the booking page.
                </p>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 space-y-2.5 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="text-xs font-semibold text-[#AF6D7B] uppercase tracking-wider">Step 6</div>
                <h3 className="text-base font-semibold text-[#27232B]">Review Daily Bookings</h3>
                <p className="text-xs sm:text-sm text-[#553B4B] leading-relaxed">
                  Open your dashboard to monitor today&apos;s appointments, specialist assignments, and statuses. Complete controlled test bookings first.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 13: FREQUENTLY ASKED QUESTIONS                    */}
        {/* ========================================================= */}
        <section id="faq" className="w-full py-16 sm:py-24 bg-white border-t border-[#AF6D7B]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Frequently Asked Questions About Barbershop Booking Software
              </h2>
              <p className="text-[#553B4B] leading-relaxed text-base">
                Clear answers to common questions about barber appointment scheduling, multi-barber capacity, and online booking workflows.
              </p>
            </div>

            <FaqAccordion items={faqData} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 14: CONCLUSION & FINAL CONVERSION BANNER          */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#FBF6F3]">
          <div className="mx-auto max-w-5xl space-y-10">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#27232B]">
                Conclusion: Choose a Booking System That Works During a Busy Day
              </h2>
              <div className="space-y-4 text-[#553B4B] leading-relaxed text-base sm:text-lg">
                <p>
                  Choosing the right barbershop booking software isn&apos;t about finding the platform with the longest feature list. It&apos;s about helping customers book easily while keeping your staff schedules accurate and your daily appointments organized. In our Bookzello testing, two appointments at the same time were valid because different staff members were assigned. We also found that AI-assisted booking requires careful staff-specific availability checks. That experience reinforced an important lesson: reliable scheduling depends on accurate information and consistent booking rules, not just a polished interface.
                </p>
                <p>
                  Before choosing software, test it with real-world scenarios from your own shop. Try booking two appointments with different barbers, request an already-occupied slot, and check how quickly you can find customer information in the dashboard. With Bookzello, our goal is to bring online booking, website AI assistance, and barber schedules together in one manageable system. Explore the{" "}
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="text-[#AF6D7B] font-semibold underline hover:text-[#553B4B]"
                  >
                    Bookzello booking experience
                  </Link>{" "}
                  and see whether the workflow fits your shop.
                </p>
              </div>
            </div>

            {/* Bottom Luxury SaaS Conversion Card */}
            <div className="rounded-[2.5rem] bg-gradient-to-br from-[#27232B] via-[#3E2B3A] to-[#553B4B] p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 text-white shadow-xl shadow-[#553B4B]/20">
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-semibold text-white">
                  Ready to test barbershop scheduling?
                </h3>
                <p className="text-sm text-[#FBF6F3]/80">
                  Explore the live booking demo or view flexible subscription plans.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#FBF6F3] px-6 py-3 text-xs font-semibold text-[#27232B] shadow-xs transition-all active:scale-[0.99]"
                >
                  <span>Explore Demo</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#AF6D7B]" />
                </Link>
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#AF6D7B]/40 bg-white/10 hover:bg-white/20 px-6 py-3 text-xs font-semibold text-white transition-all shadow-xs active:scale-[0.99]"
                >
                  <span>View Pricing</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
