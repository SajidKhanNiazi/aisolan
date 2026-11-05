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
        "@type": "WebSite",
        "@id": "https://bookzello.com/#website",
        "url": "https://bookzello.com/",
        "name": "Bookzello",
        "description": "Barbershop booking software and appointment scheduling system.",
        "publisher": {
          "@id": "https://bookzello.com/#organization",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://bookzello.com/#organization",
        "name": "Bookzello",
        "url": "https://bookzello.com/",
        "logo": "https://bookzello.com/favicon.ico",
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://bookzello.com/barbershop-booking-software#software",
        "name": "Bookzello Barbershop Booking Software",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://bookzello.com/barbershop-booking-software#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://bookzello.com/",
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Barbershop Booking Software",
            "item": "https://bookzello.com/barbershop-booking-software",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://bookzello.com/barbershop-booking-software#faq",
        "mainEntity": faqData.map((faq) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col items-center justify-center w-full bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-700">
        {/* ========================================================= */}
        {/* HERO SECTION                                              */}
        {/* ========================================================= */}
        <section className="relative w-full overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-18 lg:pb-28">
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[720px] bg-gradient-to-b from-blue-100/50 via-sky-50/30 to-transparent blur-3xl -z-10 pointer-events-none"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1D64EC] shadow-xs mb-6">
              <Scissors className="h-3.5 w-3.5 text-[#1D64EC]" />
              <span>Barbershop Booking Software &amp; AI Scheduling</span>
            </div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 leading-[1.15]">
              Barbershop Booking Software That Keeps Your Schedule Under Control
            </h1>

            {/* Problem / Agitation / Solution Intro */}
            <div className="mt-6 space-y-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto text-left sm:text-center">
              <p>
                You&apos;re halfway through a haircut when your phone rings. Another customer wants a fade, someone needs to reschedule, and two clients are asking for the same barber at 10 AM. Managing appointments through phone calls, text messages, and a paper calendar can quickly become stressful. One scheduling mistake can leave a chair empty, frustrate a regular customer, or disrupt your entire day.
              </p>
              <p>
                That&apos;s where barbershop booking software can help. The right system lets clients book appointments online, checks each barber&apos;s availability, and keeps your schedule organized in one place. Whether you work alone or manage several barbers, this guide explains which features matter, how online booking works, what software costs to consider, and how to choose a reliable booking system for your shop.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3.5 py-1 text-xs font-semibold text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>Zero Double Bookings</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200/80 px-3.5 py-1 text-xs font-semibold text-sky-700">
                <Users className="h-3.5 w-3.5 text-sky-600" />
                <span>Multi-Barber Schedules</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 text-xs font-semibold text-emerald-700">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>24/7 Online Booking</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-3.5 py-1 text-xs font-semibold text-purple-700">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>AI Chatbot Receptionist</span>
              </span>
            </div>

            {/* Actions */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/booking/bookpilot-qa-salon"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors"
              >
                <span>View Bookzello&apos;s Booking Demo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <span>Compare Pricing &amp; Plans</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* MAIN EDITORIAL CONTENT                                    */}
        {/* ========================================================= */}
        <article className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-16">
          {/* SECTION 1: What Is Barbershop Booking Software? */}
          <section className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              What Is Barbershop Booking Software?
            </h2>
            <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
              Barbershop booking software is a digital system that helps barbers and shop owners schedule, organize, and manage customer appointments.
            </p>
            <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
              Instead of relying entirely on calls or handwritten bookings, customers can select a service, choose an available time, and submit an appointment request or confirmation online.
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 space-y-4 mt-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs">
                A typical barber booking system helps you:
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Accept online appointments outside business hours.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Organize individual barber schedules.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Display available haircut and grooming services.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Prevent overlapping appointments for the same barber.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Manage customer bookings from one dashboard.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Handle appointment cancellations and rescheduling.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:col-span-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Keep service durations, working hours, and booking rules consistent.</span>
                </li>
              </ul>
            </div>

            <p className="text-slate-600 leading-relaxed text-sm sm:text-base pt-2">
              Some platforms also include payment processing, marketing tools, point-of-sale systems, and client marketplaces. Others focus on scheduling and appointment management. The best choice depends on how your barbershop operates and which problems you need to solve first.
            </p>
          </section>

          {/* SECTION 2: Why Barbershops Need Online Booking Software */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Why Barbershops Need Online Booking Software
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed text-base sm:text-lg">
                A barbershop&apos;s schedule can change throughout the day. Customers arrive early, appointments run longer than expected, and staff members take breaks or finish shifts at different times. When bookings are managed manually, keeping everything accurate becomes harder as the business grows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <Scissors className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Reduce Interruptions During Haircuts
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every appointment call takes attention away from the customer sitting in your chair. With online booking for barbers, clients can view services and available appointments without waiting for someone to answer the phone. This is especially useful for owner-operated shops where the person managing appointments is also cutting hair.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Let Clients Book After Business Hours
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Customers don&apos;t always look for appointments while your shop is open. A 24/7 booking page lets them check available times in the evening, early morning, or during their lunch break. The shop doesn&apos;t need to be staffed for customers to browse available appointments.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 mb-3">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Keep Multiple Barber Schedules Organized
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  When several barbers work in one location, each may have different working hours, days off, and service specialties. Barbershop scheduling software helps separate those schedules while keeping them visible to the owner. This makes it easier to see who is working, which appointments are coming up, and where free time remains.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: Online Booking Software for Barbershops: How It Works */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Online Booking Software for Barbershops: How It Works
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                Online booking should be simple for customers and easy for the shop owner to manage. A typical booking experience involves three steps.
              </p>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-3">
                <div className="inline-flex items-center gap-2 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                  Step 1
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Step 1: Choose a Haircut or Grooming Service
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Customers open the booking page and select the service they need. For example:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold text-slate-700 pt-1">
                  <span className="rounded-lg bg-slate-100 p-2.5 text-center">Classic Haircut</span>
                  <span className="rounded-lg bg-slate-100 p-2.5 text-center">Skin Fade</span>
                  <span className="rounded-lg bg-slate-100 p-2.5 text-center">Beard Trim</span>
                  <span className="rounded-lg bg-slate-100 p-2.5 text-center">Haircut &amp; Beard Trim</span>
                  <span className="rounded-lg bg-slate-100 p-2.5 text-center">Hair Styling</span>
                  <span className="rounded-lg bg-slate-100 p-2.5 text-center">Scalp Treatment</span>
                </div>
                <p className="text-sm text-slate-500 italic pt-1">
                  Each service should have a clear description, price, and estimated duration. This helps clients understand what they&apos;re booking before choosing a time.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-3">
                <div className="inline-flex items-center gap-2 rounded-md bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                  Step 2
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Step 2: Select an Available Appointment
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  The booking system checks the shop&apos;s schedule and displays eligible appointment times. Availability should account for:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Shop opening hours.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Individual barber working hours.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Staff assigned to the selected service.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Existing appointments.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Service duration.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Cleanup or preparation time.</span>
                  </li>
                  <li className="flex items-center gap-2 sm:col-span-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    <span>Booking notice requirements.</span>
                  </li>
                </ul>
                <p className="text-sm text-slate-500 italic pt-1">
                  When properly configured, customers see appointment options that match the shop&apos;s actual availability.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-3">
                <div className="inline-flex items-center gap-2 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  Step 3
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Step 3: Confirm the Appointment
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  The customer enters the required contact details and completes the booking. The appointment then appears in the shop&apos;s management calendar with its service, time, assigned barber, and confirmation status.
                </p>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Bookzello provides a public booking link that a shop can share with clients or place on its website.
                </p>

                {/* Demo Callout */}
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Live Experience Demo
                    </p>
                    <p className="text-sm text-blue-950 font-medium">
                      Try the customer booking experience in a real sandbox:
                    </p>
                  </div>
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 shrink-0 transition-colors"
                  >
                    <span>View Bookzello&apos;s Booking Demo</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: Barbershop Scheduling Software for Multiple Barbers */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Barbershop Scheduling Software for Multiple Barbers
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                Managing several barbers requires more than a calendar containing appointment times. The system must understand which staff member is performing each service.
              </p>
            </div>

            {/* Subsection: Give Every Barber Their Own Schedule */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">
                Give Every Barber Their Own Schedule
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Consider a barbershop with three employees:
              </p>

              {/* Staff Schedule Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Barber</th>
                      <th className="py-3 px-4">Working Hours</th>
                      <th className="py-3 px-4">Services</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Daniel</td>
                      <td className="py-3 px-4 font-mono">9 AM–5 PM</td>
                      <td className="py-3 px-4">Haircuts, beard trims</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Emma</td>
                      <td className="py-3 px-4 font-mono">10 AM–6 PM</td>
                      <td className="py-3 px-4">Haircuts, styling</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Sarah</td>
                      <td className="py-3 px-4 font-mono">9 AM–3 PM</td>
                      <td className="py-3 px-4">Haircuts, fades</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 italic">Illustrative schedule.</p>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-1">
                If someone requests a beard trim at 4 PM, the system should check which qualified barber is available at that time. It shouldn&apos;t offer an appointment with a barber who doesn&apos;t perform that service or has already finished working.
              </p>
            </div>

            {/* Subsection: Can Two Customers Book the Same Time? */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-slate-900">
                Can Two Customers Book the Same Time?
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Yes, if different eligible barbers are available.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                For example, Daniel can provide a haircut at 10 AM while Emma handles a beard trim at 10 AM. Those are two legitimate appointments, not a double booking. The real conflict happens when two appointments require the same barber during overlapping times.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                A reliable booking system must check staff availability rather than simply counting how many appointments exist at a particular hour.
              </p>
            </div>

            {/* Subsection: What If a Customer Requests a Specific Barber? */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-slate-900">
                What If a Customer Requests a Specific Barber?
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Customers often have a favorite barber.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                If Daniel is booked at 10 AM but Emma is available, the shop may still have capacity for another appointment. However, the system shouldn&apos;t silently replace Daniel with Emma when a customer specifically requested Daniel.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Instead, it should explain that Daniel is unavailable and offer another time or an alternative barber. This distinction matters for customer trust.
              </p>
            </div>

            {/* Subsection: Account for Service Duration and Cleanup Time */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-slate-900">
                Account for Service Duration and Cleanup Time
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Not every service takes the same amount of time. A 15-minute beard trim and a 50-minute grooming treatment use different portions of a barber&apos;s schedule.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Consider a 30-minute haircut with a five-minute cleanup buffer:
              </p>

              {/* Cleanup buffer table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs max-w-lg">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Appointment</th>
                      <th className="py-3 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700 font-mono">
                    <tr>
                      <td className="py-2.5 px-4 font-sans text-slate-800">Haircut starts</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">10:00 AM</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans text-slate-800">Haircut ends</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">10:30 AM</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-sans text-slate-800">Cleanup ends</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">10:35 AM</td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="py-2.5 px-4 font-sans font-semibold text-emerald-800">Next appointment</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">10:35 AM or later</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 italic">Illustrative example.</p>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-1">
                If the booking system ignores the cleanup buffer, it may offer appointments too close together. Proper duration and buffer settings help the shop maintain a realistic daily schedule.
              </p>
            </div>
          </section>

          {/* SECTION 5: Manage Today's Barber Appointments in One Dashboard */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Manage Today&apos;s Barber Appointments in One Dashboard
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                For a busy barbershop owner, the most useful part of booking software is often the daily appointments view. After signing in, you should be able to answer a few questions immediately:
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-7 space-y-3">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>How many appointments do we have today?</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Which customers are coming next?</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>What services have they booked?</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Which barber is assigned?</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Which appointments are confirmed or canceled?</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>How much scheduled service revenue is on the calendar?</span>
                </li>
              </ul>
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              A clear dashboard should make this information easy to find without requiring you to open every appointment individually.
            </p>

            {/* Subsection: See Appointment Details at a Glance */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-slate-900">
                See Appointment Details at a Glance
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                A useful daily appointment list includes:
              </p>

              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Information</th>
                      <th className="py-3 px-4">Why It Matters</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Customer name</td>
                      <td className="py-3 px-4 text-slate-600">Identify who&apos;s arriving</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Appointment time</td>
                      <td className="py-3 px-4 text-slate-600">Prepare for the next customer</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Service</td>
                      <td className="py-3 px-4 text-slate-600">Know what work is scheduled</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Assigned barber</td>
                      <td className="py-3 px-4 text-slate-600">Coordinate your team</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Status</td>
                      <td className="py-3 px-4 text-slate-600">Distinguish confirmed and canceled bookings</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Price</td>
                      <td className="py-3 px-4 text-slate-600">Understand scheduled service value</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Contact details</td>
                      <td className="py-3 px-4 text-slate-600">Reach the customer when necessary</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-1">
                For a shop handling 10–20 appointments a day, a readable, time-ordered list can be more practical than a large calendar full of overlapping appointment blocks.
              </p>
            </div>

            {/* Subsection: Access Your Schedule on Mobile */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-slate-900">
                Access Your Schedule on Mobile
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Shop owners aren&apos;t always sitting at a computer. A mobile-friendly dashboard makes it easier to review appointments, check staff schedules, and find booking information from a phone.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Look for readable appointment cards, accessible navigation, and clear customer contact actions.
              </p>
            </div>
          </section>

          {/* SECTION 6: Use an AI Receptionist for Barber Appointment Booking */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Use an AI Receptionist for Barber Appointment Booking
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                An AI receptionist can help customers ask booking questions through a website chat interface. For example, a visitor might ask:
              </p>
            </div>

            {/* Quote block */}
            <div className="rounded-2xl border-l-4 border-blue-600 bg-blue-50/60 p-5 pl-6 text-base sm:text-lg font-medium text-slate-900 italic">
              &ldquo;Can I book a haircut with Daniel tomorrow afternoon?&rdquo;
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Instead of requiring the visitor to browse every time slot manually, an AI-assisted booking flow can help identify the service, understand the requested time, and check appointment availability.
            </p>

            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-slate-900">
                Answer Common Booking Questions
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                A website AI receptionist can help visitors find information about:
              </p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm text-slate-700">
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">Available services</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">Service prices</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">Appointment durations</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">Working hours</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">Available booking times</li>
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">Booking &amp; cancellation rules</li>
              </ul>
              <p className="text-sm text-slate-500 italic pt-1">
                It should use the shop&apos;s configured information rather than inventing prices, schedules, or availability.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-slate-900">
                Connect AI Booking to the Same Calendar
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                An important question to ask any AI booking provider is whether the AI uses the same scheduling information as the online booking page.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                If a customer books a slot through the website, the AI should recognize that the appointment is no longer available for the assigned barber. Otherwise, two booking channels could provide contradictory information.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium text-slate-900">
                Bookzello is designed around a shared appointment system for its public booking page and website AI receptionist.
              </p>
            </div>
          </section>

          {/* SECTION 7: What We Learned While Testing Bookzello */}
          <section className="space-y-4 border-t border-slate-100 pt-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              What We Learned While Testing Bookzello
            </h2>
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-white p-6 sm:p-8 space-y-4">
              <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                During Bookzello&apos;s booking-system testing, we created two confirmed appointments at the same time for different staff members. Both appointments appeared in the salon dashboard, demonstrating how simultaneous bookings can be valid when separate barbers are assigned.
              </p>
              <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                We also identified an availability inconsistency during testing: the AI receptionist initially offered a time already occupied by a specifically requested staff member. That finding led to additional staff-specific availability checks, draft validation, and regression tests.
              </p>
              <p className="text-slate-800 leading-relaxed text-sm sm:text-base font-semibold border-t border-blue-100 pt-3">
                The practical lesson is simple: an AI receptionist should not promise an appointment based only on a conversational response. It needs reliable scheduling data and a final availability check before confirmation.
              </p>
            </div>
          </section>

          {/* SECTION 8: How to Choose the Best Barbershop Booking Software */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                How to Choose the Best Barbershop Booking Software
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                The best barbershop booking software isn&apos;t necessarily the platform with the most features. It is the one that supports your shop&apos;s everyday workflow without adding unnecessary complexity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  1. Check the Customer Booking Experience
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Open the booking page as if you were a customer. Can you select a service, find a suitable time, and understand the next step without assistance? A complicated booking process can create more work for the shop instead of reducing it.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  2. Test Staff Availability
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Add at least two barbers with different schedules. Check whether the system respects working hours, service qualifications, existing bookings, buffers, and blocks overlapping slots for the same barber. This is one of the most important operational tests.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  3. Evaluate the Daily Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Don&apos;t judge software only by its customer-facing booking page. The owner dashboard is where you&apos;ll spend time managing appointments. Make sure you can quickly find customer names, scheduled services, staff assignments, and appointment statuses.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  4. Review Cancellation and Rescheduling Options
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Customers sometimes need to change appointments. Look for clear cancellation rules and a manageable rescheduling process. Check whether a canceled appointment releases the relevant time so another customer can book it.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  5. Understand the Full Monthly Cost
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Some platforms charge per location. Others charge per staff member or add separate fees for particular services. Before choosing a system, compare the total cost for your actual team size.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  6. Check What Is Included
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Booking software, salon management software, and point-of-sale software are not always the same thing. If you need retail inventory, payment terminals, payroll, chair rental management, or walk-in queues, verify that the platform actually includes those tools. Don&apos;t assume every scheduling product provides a complete barbershop management suite.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 9: Barbershop Booking Software Pricing: What Should You Compare? */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Barbershop Booking Software Pricing: What Should You Compare?
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                The advertised monthly subscription is only one part of the total cost. For a shop with several barbers, additional staff licenses and optional services may change the final amount. Use this checklist when comparing plans:
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Cost Factor</th>
                    <th className="py-3 px-4">What to Ask</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Base subscription</td>
                    <td className="py-3 px-4 text-slate-600">What is the monthly price?</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Barber accounts</td>
                    <td className="py-3 px-4 text-slate-600">Is there a charge for each additional barber?</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Online appointments</td>
                    <td className="py-3 px-4 text-slate-600">Are there booking limits or extra fees?</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Payment processing</td>
                    <td className="py-3 px-4 text-slate-600">Are card transaction fees separate?</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">AI features</td>
                    <td className="py-3 px-4 text-slate-600">Is the AI receptionist included or an add-on?</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Notifications</td>
                    <td className="py-3 px-4 text-slate-600">Are email or SMS messages included?</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Website integration</td>
                    <td className="py-3 px-4 text-slate-600">Can the booking system be embedded?</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Cancellation terms</td>
                    <td className="py-3 px-4 text-slate-600">Can you change or cancel the subscription?</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-1">
              For example, a low monthly starting price may become less attractive when every additional barber requires a paid seat. Compare the actual cost for a two-person, five-person, or ten-person shop rather than choosing solely by the advertised starting price.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              You can review Bookzello&apos;s available plans on the{" "}
              <Link href="/pricing" className="text-blue-600 font-semibold underline hover:text-blue-700">
                pricing page
              </Link>
              .
            </p>
          </section>

          {/* SECTION 10: Barbershop Booking Software vs. a Paper Appointment Book */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Barbershop Booking Software vs. a Paper Appointment Book
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                A paper diary can work for a solo barber with a small number of regular customers. But it becomes more difficult to maintain when bookings arrive from several channels or multiple staff members share the shop.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Feature</th>
                    <th className="py-3 px-4">Paper Diary</th>
                    <th className="py-3 px-4 text-blue-700">Online Booking System</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Customer self-booking</td>
                    <td className="py-3 px-4 text-slate-500">No</td>
                    <td className="py-3 px-4 font-medium text-emerald-600">Yes</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Booking outside shop hours</td>
                    <td className="py-3 px-4 text-slate-500">Requires manual coordination</td>
                    <td className="py-3 px-4 font-medium text-slate-900">Available through booking link</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Staff availability</td>
                    <td className="py-3 px-4 text-slate-500">Checked manually</td>
                    <td className="py-3 px-4 font-medium text-slate-900">Calculated from configured schedules</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Appointment search</td>
                    <td className="py-3 px-4 text-slate-500">Manual</td>
                    <td className="py-3 px-4 font-medium text-slate-900">Searchable records</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Multiple booking channels</td>
                    <td className="py-3 px-4 text-slate-500">Difficult to coordinate</td>
                    <td className="py-3 px-4 font-medium text-slate-900">Can share one system</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Appointment changes</td>
                    <td className="py-3 px-4 text-slate-500">Updated by hand</td>
                    <td className="py-3 px-4 font-medium text-slate-900">Managed digitally</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">Daily overview</td>
                    <td className="py-3 px-4 text-slate-500">Handwritten</td>
                    <td className="py-3 px-4 font-medium text-slate-900">Organized dashboard</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-1">
              An online system still needs correct setup and maintenance. If staff hours, service durations, or availability rules are inaccurate, digital scheduling can also produce poor results. Software works best when the information behind it reflects how the barbershop actually operates.
            </p>
          </section>

          {/* SECTION 11: Is Bookzello Suitable for Your Barbershop? */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Is Bookzello Suitable for Your Barbershop?
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                Bookzello focuses on online appointment booking, staff availability, website AI assistance, and a shared booking dashboard. It can be relevant to several types of barber businesses:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-2.5">
                <h3 className="text-lg font-bold text-slate-900">
                  Independent Barbers
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A solo barber can use a booking link to let customers select services and available appointments. This reduces dependence on manual scheduling calls.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-2.5">
                <h3 className="text-lg font-bold text-slate-900">
                  Small Barbershops With Multiple Employees
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  For shops with several barbers, individual staff schedules and service assignments help coordinate bookings. The owner can review appointments through a shared management dashboard.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-2.5">
                <h3 className="text-lg font-bold text-slate-900">
                  Men&apos;s Grooming Studios
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Studios offering haircuts, beard trims, hair styling, and treatments can configure services with different durations and prices. The booking system can then use those settings when determining appointment availability.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 italic">
              Before adopting any platform, verify that its current features cover your specific operational needs.
            </p>
          </section>

          {/* SECTION 12: How to Get Started With Bookzello */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                How to Get Started With Bookzello
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base sm:text-lg">
                Setting up a barber shop booking system should begin with the information you already use to run your business.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 1</div>
                <h3 className="text-base font-bold text-slate-900">Create Your Profile</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Add shop details, operating timezone, and currency. Use the timezone where your shop physically operates so clients see correct local times.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 2</div>
                <h3 className="text-base font-bold text-slate-900">Add Services &amp; Prices</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Create your haircut and grooming services. Enter accurate prices, durations, and any required buffer time.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 3</div>
                <h3 className="text-base font-bold text-slate-900">Add Your Barbers</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Set up staff members, assign services, and configure working hours. Review availability carefully before opening appointments to clients.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 4</div>
                <h3 className="text-base font-bold text-slate-900">Set Booking Policies</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Choose booking notice rules, advance horizons, and cancellation policies to keep appointments manageable for clients and staff.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 5</div>
                <h3 className="text-base font-bold text-slate-900">Share Your Booking Link</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Share the public booking link with clients or embed it on your website. If using the AI chatbot, confirm availability matches the booking page.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-2">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 6</div>
                <h3 className="text-base font-bold text-slate-900">Review Daily Bookings</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Open your dashboard to monitor today&apos;s appointments, specialist assignments, and statuses. Complete controlled test bookings first.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 13: Frequently Asked Questions */}
          <section className="space-y-6 border-t border-slate-100 pt-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Frequently Asked Questions About Barbershop Booking Software
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed text-base">
                Clear answers to common questions about barber appointment scheduling, multi-barber capacity, and online booking workflows.
              </p>
            </div>

            <FaqAccordion items={faqData} />
          </section>

          {/* SECTION 14: Conclusion */}
          <section className="space-y-6 border-t border-slate-100 pt-12 pb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Conclusion: Choose a Booking System That Works During a Busy Day
            </h2>

            <div className="space-y-4 text-slate-600 leading-relaxed text-base sm:text-lg">
              <p>
                Choosing the right barbershop booking software isn&apos;t about finding the platform with the longest feature list. It&apos;s about helping customers book easily while keeping your staff schedules accurate and your daily appointments organized. In our Bookzello testing, two appointments at the same time were valid because different staff members were assigned. We also found that AI-assisted booking requires careful staff-specific availability checks. That experience reinforced an important lesson: reliable scheduling depends on accurate information and consistent booking rules, not just a polished interface.
              </p>
              <p>
                Before choosing software, test it with real-world scenarios from your own shop. Try booking two appointments with different barbers, request an already-occupied slot, and check how quickly you can find customer information in the dashboard. With Bookzello, our goal is to bring online booking, website AI assistance, and barber schedules together in one manageable system. Explore the{" "}
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="text-blue-600 font-semibold underline hover:text-blue-700"
                >
                  Bookzello booking experience
                </Link>{" "}
                and see whether the workflow fits your shop.
              </p>
            </div>

            {/* Bottom Conversion Card */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-sky-50/50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Ready to test barbershop scheduling?
                </h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  Explore the live booking demo or view flexible subscription plans.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/booking/bookpilot-qa-salon"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors"
                >
                  <span>Explore Demo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <span>View Pricing</span>
                </Link>
              </div>
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
