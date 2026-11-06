import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Heart,
  Check,
} from "lucide-react";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { SpaHeroVisual } from "@/components/marketing/spa-hero-visual";

export const metadata: Metadata = {
  title: {
    absolute: "Online Spa Booking Software for Easy Scheduling | Bookzello",
  },
  description:
    "Let clients book spa treatments online. Manage therapist schedules, appointment availability, and daily bookings with Bookzello spa booking software.",
  alternates: {
    canonical: "https://bookzello.com/spa-booking-software",
  },
  openGraph: {
    title: "Online Spa Booking Software for Easy Scheduling | Bookzello",
    description:
      "Let clients book spa treatments online. Manage therapist schedules, appointment availability, and daily bookings with Bookzello spa booking software.",
    url: "https://bookzello.com/spa-booking-software",
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
    id: "best-spa-booking-small-business",
    question: "What is the best spa booking software for a small business?",
    answer:
      "The best option depends on your team size and required features. Small spas should prioritize easy online booking, accurate therapist availability, manageable pricing, and a clear appointment dashboard. Test these features before committing to a plan.",
  },
  {
    id: "can-clients-book-online",
    question: "Can clients book spa appointments online?",
    answer:
      "Yes. Spa booking software allows clients to choose treatments and available appointment times through a booking page. The reservation is then recorded in the business's scheduling system after confirmation.",
  },
  {
    id: "separate-therapist-schedules",
    question: "Can each massage therapist have a separate schedule?",
    answer:
      "Many spa scheduling platforms support individual therapist schedules. Staff members can have different working hours, service assignments, and existing appointments.",
  },
  {
    id: "prevent-double-bookings",
    question: "How does spa booking software prevent double bookings?",
    answer:
      "Reliable software checks whether the required therapist is available for the entire treatment interval before confirming a reservation. It should also consider configured buffers and validate the appointment again during final confirmation.",
  },
  {
    id: "multiple-treatments",
    question: "Can clients book multiple spa treatments together?",
    answer:
      "Some platforms support multi-service reservations or treatment packages. Others require separate appointments. Confirm whether the provider supports your specific booking workflow.",
  },
  {
    id: "treatment-room-management",
    question: "Does spa booking software manage treatment rooms?",
    answer:
      "Some advanced spa management platforms include room and equipment scheduling. Others only manage staff availability. If your spa has limited treatment rooms, verify resource scheduling before purchasing.",
  },
  {
    id: "add-booking-to-website",
    question: "Can I add spa appointment booking to my website?",
    answer:
      "Yes. Depending on the provider, you can use a booking link, embedded booking interface, or website booking assistant.",
  },
  {
    id: "payment-processing",
    question: "Does spa booking software include payment processing?",
    answer:
      "Not always. Some platforms combine scheduling with integrated payments, deposits, and cancellation fees. Others focus on appointment booking. Verify which capabilities are included in your chosen plan.",
  },
  {
    id: "free-spa-booking-software",
    question: "Is there free spa booking software?",
    answer:
      "Some platforms offer free plans or trial periods. However, these may limit staff accounts, advanced features, or bookings. Compare the total cost and restrictions before deciding.",
  },
  {
    id: "ai-receptionist-booking",
    question: "Can an AI receptionist book spa appointments?",
    answer:
      "An AI booking assistant can help customers ask about treatments and available times. It should use the business's actual calendar and booking rules rather than inventing availability or confirming an occupied slot.",
  },
];

export default function SpaBookingSoftwarePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://bookzello.com/#website",
        "url": "https://bookzello.com/",
        "name": "Bookzello",
        "description": "Spa booking software and appointment scheduling system.",
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
        "@id": "https://bookzello.com/spa-booking-software#software",
        "name": "Bookzello Spa Booking Software",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://bookzello.com/spa-booking-software#breadcrumb",
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
            "name": "Spa Booking Software",
            "item": "https://bookzello.com/spa-booking-software",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://bookzello.com/spa-booking-software#faq",
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

      <div className="flex flex-col items-center justify-center w-full bg-[#FBF7F4] text-[#29262B] selection:bg-[#EBCFCB] selection:text-[#594250] font-body">
        
        {/* ========================================================= */}
        {/* HERO SECTION — EDITORIAL WELLNESS 2-COLUMN PRODUCT HERO   */}
        {/* ========================================================= */}
        <section className="relative w-full overflow-hidden pt-4 pb-6 sm:pt-6 sm:pb-10 lg:pt-8 lg:pb-12">
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[720px] bg-gradient-to-b from-[#EBCFCB]/30 via-[#B87D89]/10 to-transparent blur-3xl -z-10 pointer-events-none"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              
              {/* Left Column: Product Positioning, Value Prop & Immediate CTAs */}
              <div className="lg:col-span-7 space-y-2.5 sm:space-y-3 text-center lg:text-left">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#B87D89]/25 bg-white/80 backdrop-blur-xs px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#B87D89] shadow-2xs">
                  <Sparkles className="h-3 w-3 text-[#B87D89]" />
                  <span>SPA BOOKING &amp; APPOINTMENT SCHEDULING</span>
                </div>

                {/* H1 Headline */}
                <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-semibold tracking-tight text-[#29262B] leading-[1.14]">
                  Spa Booking Software That Keeps Every Appointment Organized
                </h1>

                {/* Concise, High-Value Value Proposition */}
                <p className="text-sm sm:text-base text-[#594250] leading-relaxed max-w-lg mx-auto lg:mx-0 font-normal">
                  Let clients book treatments online while keeping therapist availability and daily schedules organized. Prevent overlapping bookings, protect treatment buffer times, and manage your day from one calm dashboard.
                </p>

                {/* Conversion Actions Visible in Initial Viewport */}
                <div className="pt-0.5 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5">
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#29262B] hover:bg-[#594250] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <span>Explore Booking Demo</span>
                    <ArrowRight className="h-4 w-4 text-[#EBCFCB]" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#B87D89]/30 bg-white hover:bg-[#FBF7F4] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#29262B] hover:border-[#B87D89]/50 transition-all shadow-xs active:scale-[0.99]"
                  >
                    <span>View Pricing</span>
                  </Link>
                </div>

                {/* Feature Chips */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#B87D89]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#594250] shadow-2xs">
                    <ShieldCheck className="h-3 w-3 text-[#B87D89]" />
                    <span>Real-time availability</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#B87D89]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#594250] shadow-2xs">
                    <Users className="h-3 w-3 text-[#B87D89]" />
                    <span>Multi-therapist calendar</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#B87D89]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#594250] shadow-2xs">
                    <Clock className="h-3 w-3 text-[#B87D89]" />
                    <span>No double bookings</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Interactive SaaS Visual */}
              <div className="lg:col-span-5 w-full flex justify-center">
                <SpaHeroVisual />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* NARRATIVE INTRO SECTION — PAS STORYTELLING & PROBLEM       */}
        {/* ========================================================= */}
        <section className="w-full py-10 sm:py-14 bg-white border-y border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="space-y-4 text-base sm:text-lg text-[#594250] leading-relaxed">
              <p>
                You&apos;re preparing for a client&apos;s facial when your phone rings. Another customer wants to book a massage, someone needs to reschedule, and two clients are requesting the same therapist at 10 AM. Suddenly, you&apos;re juggling appointments instead of focusing on the customer in front of you. One missed message or overlapping booking can disrupt your schedule, leave a treatment slot unused, and turn a relaxing spa visit into a frustrating experience.
              </p>
              <p>
                That&apos;s where spa booking software can make a difference. Instead of managing appointments through calls, texts, and spreadsheets, you can let clients book treatments online while keeping therapist availability and daily schedules organized. Whether you run a solo skincare studio or a small day spa, this guide explains how online spa booking works, which features matter, and how to choose a reliable system without paying for tools your business doesn&apos;t need.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION A: What Is Spa Booking Software?                  */}
        {/* ========================================================= */}
        <section id="what-is-spa-booking-software" className="w-full py-12 sm:py-16 bg-[#FBF7F4] border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-white border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                SYSTEM OVERVIEW
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                What Is Spa Booking Software?
              </h2>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-[#594250] leading-relaxed">
              <p>
                Spa booking software is a digital scheduling system that helps spa owners accept treatment appointments, manage therapist availability, and organize customer reservations.
              </p>
              <p>
                Rather than coordinating every booking manually, customers can choose a treatment, view available appointment times, and complete a reservation online.
              </p>
              <p>
                Depending on the provider, spa booking software may help you:
              </p>
            </div>

            {/* Feature Bullets Card */}
            <div className="rounded-2xl border border-[#B87D89]/20 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-[#B87D89]">
                A TYPICAL SPA BOOKING SYSTEM HELPS YOU:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Accept appointments through an online booking page.",
                  "Display treatments, prices, and service durations.",
                  "Manage individual therapist schedules.",
                  "Check appointment availability before confirmation.",
                  "Avoid overlapping appointments for the same therapist.",
                  "Review upcoming customers and treatments.",
                  "Manage cancellations and rescheduling.",
                  "Apply booking notice and cancellation policies.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#B87D89] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#29262B]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
              <p>
                Some platforms also offer payments, memberships, intake forms, inventory, and treatment-room scheduling.
              </p>
              <p className="text-xs sm:text-sm text-[#594250]/80 italic">
                These are additional capabilities, not features every spa booking system automatically includes.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION B: Online Spa Booking Software                    */}
        {/* ========================================================= */}
        <section id="online-spa-booking" className="w-full py-12 sm:py-16 bg-white border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-[#FBF7F4] border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                CLIENT EXPERIENCE
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                Online Spa Booking Software: Let Clients Book Treatments Anytime
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Your spa may close at 6 PM, but customers don&apos;t always search for appointments during business hours.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Online spa booking software gives clients a way to check available treatments and appointment times without waiting for someone to answer the phone.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A good customer booking experience should be straightforward from start to finish.
              </p>
            </div>

            {/* Subsection: Let Clients Choose the Right Spa Treatment */}
            <div className="space-y-4 pt-2">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Let Clients Choose the Right Spa Treatment
              </h3>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Start by displaying your spa&apos;s available services with clear prices and durations.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                For example:
              </p>

              {/* Treatment Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#B87D89]/20 bg-white shadow-xs">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#B87D89]/15 bg-[#FBF7F4]">
                      <th className="px-5 py-3 font-semibold text-[#594250]">Spa Treatment</th>
                      <th className="px-5 py-3 font-semibold text-[#594250]">Example Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B87D89]/10">
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Classic Facial</td>
                      <td className="px-5 py-3 text-[#594250]">30 minutes</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Hydrating Facial</td>
                      <td className="px-5 py-3 text-[#594250]">60 minutes</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Swedish Massage</td>
                      <td className="px-5 py-3 text-[#594250]">60 minutes</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Deep Tissue Massage</td>
                      <td className="px-5 py-3 text-[#594250]">90 minutes</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Scalp Treatment</td>
                      <td className="px-5 py-3 text-[#594250]">30 minutes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#594250]/80 italic">
                Illustrative durations. Actual treatment lengths should follow your spa&apos;s service menu.
              </p>

              <div className="space-y-2 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
                <p>
                  When clients understand how long a treatment takes, they can choose an appointment that fits their schedule.
                </p>
                <p>
                  Clear service descriptions also reduce unnecessary questions before booking.
                </p>
              </div>
            </div>

            {/* Subsection: Show Appointment Times Based on Real Availability */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Show Appointment Times Based on Real Availability
              </h3>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                After selecting a treatment, customers should see available appointment times.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                The software needs to consider:
              </p>

              <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4] p-5 sm:p-6 space-y-2.5">
                {[
                  "Business opening hours.",
                  "Individual therapist schedules.",
                  "Staff assigned to the selected treatment.",
                  "Existing confirmed appointments.",
                  "Treatment duration.",
                  "Preparation and cleanup buffers.",
                  "Booking notice and advance-booking rules.",
                ].map((rule) => (
                  <div key={rule} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-[#B87D89] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#29262B]">{rule}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
                <p>
                  For example, a 90-minute massage should not appear as available when the assigned therapist has only 45 minutes free.
                </p>
                <p>
                  Availability should reflect the complete appointment duration, not just an open starting time.
                </p>
              </div>
            </div>

            {/* Subsection: Make Appointment Confirmation Simple */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Make Appointment Confirmation Simple
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Once a customer chooses a treatment and time, the booking process should clearly display the appointment details.
                </p>
                <p>
                  These generally include the treatment, date, time, price, and assigned therapist when applicable.
                </p>
                <p>
                  After successful confirmation, the appointment should appear in the spa&apos;s calendar.
                </p>
                <p>
                  Bookzello provides a public booking page that businesses can share with customers.
                </p>
                <p>
                  Want to see the booking process?{" "}
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="font-semibold text-[#B87D89] hover:text-[#594250] underline decoration-[#B87D89]/40 underline-offset-4 transition-colors"
                  >
                    Explore Bookzello&apos;s sample booking demo
                  </Link>
                  .
                </p>
                <p className="text-xs sm:text-sm text-[#594250]/80 italic">
                  This is a sample salon booking environment that demonstrates the customer flow, not a dedicated spa demo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION C: Therapist & Staff Scheduling                   */}
        {/* ========================================================= */}
        <section id="therapist-scheduling" className="w-full py-12 sm:py-16 bg-[#FBF7F4] border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-white border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                STAFF MANAGEMENT
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                Spa Appointment Scheduling Software for Therapists and Staff
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A spa with multiple therapists needs scheduling rules that account for individual working hours and service qualifications.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                For example, a skincare specialist may perform facials but not massage treatments.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A massage therapist may offer several types of massage but work only certain days.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Spa appointment booking software should help reflect these differences in the available appointment times.
              </p>
            </div>

            {/* Subsection: Give Each Therapist an Individual Schedule */}
            <div className="space-y-4 pt-2">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Give Each Therapist an Individual Schedule
              </h3>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Consider a small day spa with three employees.
              </p>

              {/* Staff Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#B87D89]/20 bg-white shadow-xs">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#B87D89]/15 bg-[#FBF7F4]">
                      <th className="px-5 py-3 font-semibold text-[#594250]">Therapist</th>
                      <th className="px-5 py-3 font-semibold text-[#594250]">Working Hours</th>
                      <th className="px-5 py-3 font-semibold text-[#594250]">Assigned Treatments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B87D89]/10">
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Emma</td>
                      <td className="px-5 py-3 text-[#594250]">9 AM–5 PM</td>
                      <td className="px-5 py-3 text-[#594250]">Facials, skincare</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Sarah</td>
                      <td className="px-5 py-3 text-[#594250]">10 AM–6 PM</td>
                      <td className="px-5 py-3 text-[#594250]">Facials, body treatments</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Daniel</td>
                      <td className="px-5 py-3 text-[#594250]">9 AM–4 PM</td>
                      <td className="px-5 py-3 text-[#594250]">Swedish and deep tissue massage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#594250]/80 italic">
                Illustrative staff schedule.
              </p>

              <div className="space-y-2 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
                <p>
                  If a customer requests a massage at 5 PM, the system shouldn&apos;t offer an appointment simply because the spa remains open until 6 PM.
                </p>
                <p>
                  It should check whether a qualified therapist is actually working at that time.
                </p>
              </div>
            </div>

            {/* Subsection: Prevent Overlapping Appointments */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Prevent Overlapping Appointments
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Two customers can have appointments at 10 AM when different therapists are available.
                </p>
                <p>
                  For example, Emma can perform a facial while Daniel provides a massage.
                </p>
                <p>
                  These are valid simultaneous bookings because they use separate staff schedules.
                </p>
                <p>
                  A conflict occurs when a new appointment overlaps an existing appointment for the same therapist.
                </p>
                <p>
                  The booking engine should check the full appointment interval before confirmation.
                </p>
              </div>
            </div>

            {/* Subsection: Include Treatment Preparation and Cleanup Time */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Include Treatment Preparation and Cleanup Time
              </h3>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Spa treatments often require preparation between clients.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A therapist may need time to clean equipment, replace linens, or prepare the treatment area.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Consider a 60-minute massage with a 15-minute cleanup buffer.
              </p>

              {/* Buffer Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#B87D89]/20 bg-white shadow-xs">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#B87D89]/15 bg-[#FBF7F4]">
                      <th className="px-5 py-3 font-semibold text-[#594250]">Activity</th>
                      <th className="px-5 py-3 font-semibold text-[#594250]">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B87D89]/10">
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Massage begins</td>
                      <td className="px-5 py-3 text-[#594250]">10:00 AM</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Massage ends</td>
                      <td className="px-5 py-3 text-[#594250]">11:00 AM</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Cleanup and preparation</td>
                      <td className="px-5 py-3 text-[#594250]">11:00–11:15 AM</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Next eligible appointment</td>
                      <td className="px-5 py-3 text-[#594250]">11:15 AM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#594250]/80 italic">
                This example assumes the buffer is configured after the treatment.
              </p>

              <div className="space-y-2 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
                <p>
                  Without the required buffer, the next customer could be scheduled before preparation is complete.
                </p>
                <p>
                  Set service durations and buffers based on how your spa actually operates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION D: Daily Appointment Dashboard                    */}
        {/* ========================================================= */}
        <section id="daily-dashboard" className="w-full py-12 sm:py-16 bg-white border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-[#FBF7F4] border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                DAILY OPERATIONS
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                Manage Every Spa Appointment From One Daily Dashboard
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A busy spa owner needs to understand the day&apos;s schedule without searching through multiple calendars and messages.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                An organized appointment dashboard should answer three questions quickly:
              </p>
              <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-around gap-3 text-center">
                <span className="text-sm font-semibold text-[#29262B]">Who is coming next?</span>
                <span className="hidden sm:inline text-[#B87D89]">•</span>
                <span className="text-sm font-semibold text-[#29262B]">Which treatment have they booked?</span>
                <span className="hidden sm:inline text-[#B87D89]">•</span>
                <span className="text-sm font-semibold text-[#29262B]">Which therapist is responsible?</span>
              </div>
            </div>

            {/* Subsection: See Today's Appointments at a Glance */}
            <div className="space-y-4 pt-2">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                See Today&apos;s Appointments at a Glance
              </h3>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A useful daily appointment list includes:
              </p>

              {/* Dashboard Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#B87D89]/20 bg-white shadow-xs">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#B87D89]/15 bg-[#FBF7F4]">
                      <th className="px-5 py-3 font-semibold text-[#594250]">Information</th>
                      <th className="px-5 py-3 font-semibold text-[#594250]">Why It Matters</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B87D89]/10">
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Customer name</td>
                      <td className="px-5 py-3 text-[#594250]">Identify the arriving client</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Appointment time</td>
                      <td className="px-5 py-3 text-[#594250]">Prepare for the next booking</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Treatment</td>
                      <td className="px-5 py-3 text-[#594250]">Know which service is scheduled</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Assigned therapist</td>
                      <td className="px-5 py-3 text-[#594250]">Coordinate staff availability</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Booking status</td>
                      <td className="px-5 py-3 text-[#594250]">Distinguish confirmed and canceled appointments</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Price</td>
                      <td className="px-5 py-3 text-[#594250]">Understand scheduled service value</td>
                    </tr>
                    <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-[#29262B]">Contact information</td>
                      <td className="px-5 py-3 text-[#594250]">Reach customers when needed</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
                A chronological appointment list can be especially useful when several therapists have bookings starting at similar times.
              </p>
            </div>

            {/* Subsection: Keep Customer and Treatment Details Together */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Keep Customer and Treatment Details Together
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  When appointment information is organized in one place, staff can prepare for the next booking more easily.
                </p>
                <p>
                  For example, the front desk can check whether the next customer has booked a facial or massage and confirm the assigned therapist.
                </p>
                <p>
                  This reduces the need to search through messages or separate handwritten schedules.
                </p>
              </div>
            </div>

            {/* Subsection: Review Appointments From Your Phone */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Review Appointments From Your Phone
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Spa owners may move between reception, treatment rooms, and staff areas throughout the day.
                </p>
                <p>
                  A mobile-friendly dashboard makes it easier to check bookings without returning to a desktop computer.
                </p>
                <p>
                  Bookzello offers a responsive appointment management interface for reviewing schedules and bookings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION E: AI Receptionist                                */}
        {/* ========================================================= */}
        <section id="ai-receptionist" className="w-full py-12 sm:py-16 bg-[#FBF7F4] border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-white border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                AUTOMATED INQUIRIES
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                How an AI Receptionist Can Help With Spa Appointments
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                An AI receptionist can help website visitors ask appointment questions in everyday language.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                For example, a customer might type:
              </p>
            </div>

            {/* Chat Illustration Card */}
            <div className="rounded-2xl border border-[#B87D89]/20 bg-white p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-[#EBCFCB] flex items-center justify-center shrink-0 text-xs font-semibold text-[#594250]">
                  C
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-[#FBF7F4] border border-[#B87D89]/20 px-4 py-2.5 text-sm text-[#29262B]">
                  &ldquo;Do you have a 60-minute massage available tomorrow afternoon?&rdquo;
                </div>
              </div>
              <div className="flex items-start gap-3 justify-end">
                <div className="rounded-2xl rounded-tr-xs bg-[#594250] px-4 py-2.5 text-sm text-white">
                  &ldquo;I found two available times for a 60-minute Swedish massage tomorrow: 2:00 PM with Daniel or 3:30 PM with Daniel. Would you like to reserve one?&rdquo;
                </div>
                <div className="h-8 w-8 rounded-full bg-[#594250] flex items-center justify-center shrink-0 text-xs font-semibold text-white">
                  AI
                </div>
              </div>
              <p className="text-[11px] text-[#594250]/70 text-center pt-2 italic">
                Illustrative conversational booking example. Real responses reflect live availability rules.
              </p>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
              <p>
                A booking assistant can interpret the requested service and time, then use the scheduling system to find suitable appointment options.
              </p>
              <p>
                However, an AI receptionist is only useful when its answers reflect accurate business information.
              </p>
            </div>

            {/* Subsection: Answer Common Treatment and Booking Questions */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Answer Common Treatment and Booking Questions
              </h3>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A website AI assistant can help customers find configured information about:
              </p>

              <div className="rounded-2xl border border-[#B87D89]/20 bg-white p-5 sm:p-6 space-y-2.5">
                {[
                  "Available treatments.",
                  "Appointment durations.",
                  "Service prices.",
                  "Spa operating hours.",
                  "Available booking times.",
                  "Booking and cancellation rules.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#B87D89] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#29262B]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
                <p>
                  It should not invent treatments, prices, or appointment slots.
                </p>
                <p>
                  For questions involving health conditions, treatment suitability, or medical risks, customers should be directed to an appropriately qualified professional.
                </p>
              </div>
            </div>

            {/* Subsection: Connect AI Booking to the Same Appointment Calendar */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Connect AI Booking to the Same Appointment Calendar
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  If a spa uses both a public booking page and an AI receptionist, those channels should reference the same appointment records.
                </p>
                <p>
                  Otherwise, an AI assistant could offer a time that someone has already booked through the website.
                </p>
                <p>
                  Bookzello&apos;s public booking and website AI workflows are designed around a shared scheduling engine.
                </p>
                <p>
                  Its booking confirmation flow includes availability validation rather than relying solely on the assistant&apos;s conversational response.
                </p>
                <p>
                  As with any booking platform, spa owners should test their specific scheduling rules before opening appointments to customers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION F: Spa Booking vs Spa Management Software         */}
        {/* ========================================================= */}
        <section id="booking-vs-management" className="w-full py-12 sm:py-16 bg-white border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-[#FBF7F4] border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                SOFTWARE COMPARISON
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                Spa Booking Software vs. Spa Management Software
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Spa booking software primarily focuses on appointments, therapist schedules, and customer reservations.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Spa management software may also include payments, memberships, inventory, intake forms, marketing tools, and treatment-room allocation.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                The distinction matters because a small facial studio may need fewer operational features than a spa offering multiple treatment rooms, memberships, and retail products.
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#B87D89]/20 bg-white shadow-xs">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#B87D89]/15 bg-[#FBF7F4]">
                    <th className="px-5 py-3 font-semibold text-[#594250]">Your Business Needs</th>
                    <th className="px-5 py-3 font-semibold text-[#594250]">What to Look For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B87D89]/10">
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Customers booking treatments online</td>
                    <td className="px-5 py-3 text-[#594250]">Online appointment scheduling</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Different therapists offering different services</td>
                    <td className="px-5 py-3 text-[#594250]">Staff-specific schedules</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Shared treatment rooms or equipment</td>
                    <td className="px-5 py-3 text-[#594250]">Resource scheduling</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Pre-treatment questionnaires</td>
                    <td className="px-5 py-3 text-[#594250]">Digital intake forms</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Prepaid packages and memberships</td>
                    <td className="px-5 py-3 text-[#594250]">Package and membership management</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Deposits or card payments</td>
                    <td className="px-5 py-3 text-[#594250]">Payment processing</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Daily appointment overview</td>
                    <td className="px-5 py-3 text-[#594250]">Booking dashboard</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Subsection: Therapist Availability Is Not the Same as Room Availability */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Therapist Availability Is Not the Same as Room Availability
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Imagine two massage therapists are available at 11 AM, but your spa has only one suitable massage room.
                </p>
                <p>
                  A staff-based booking system might consider both therapists available.
                </p>
                <p>
                  However, only one treatment can use that room at a time.
                </p>
                <p>
                  Spas that depend on shared rooms or specialized equipment should look for dedicated resource scheduling.
                </p>
                <p>
                  Bookzello&apos;s demonstrated booking functionality focuses on staff-based availability. Advanced treatment-room and equipment allocation should not be assumed to be included.
                </p>
                <p>
                  If your business needs a broader set of operational tools, read our{" "}
                  <Link
                    href="/salon-management-software"
                    className="font-semibold text-[#B87D89] hover:text-[#594250] underline decoration-[#B87D89]/40 underline-offset-4 transition-colors"
                  >
                    salon management software guide
                  </Link>{" "}
                  to understand the distinction between booking and management features.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION G: Cancellations and No-Shows                     */}
        {/* ========================================================= */}
        <section id="reduce-cancellations" className="w-full py-12 sm:py-16 bg-[#FBF7F4] border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-white border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                SCHEDULE PROTECTION
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                How to Reduce Booking Confusion, Cancellations, and No-Shows
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Missed appointments can create gaps in a spa&apos;s schedule.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Booking software can help organize reservations and provide clearer information, but it cannot guarantee that every customer will attend.
              </p>
            </div>

            {/* Subsection: Give Customers Clear Appointment Information */}
            <div className="space-y-4 pt-2">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Give Customers Clear Appointment Information
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Clients should receive or have access to accurate booking details, including the treatment, date, time, and location.
                </p>
                <p>
                  An unclear appointment time or incorrect service duration can create avoidable confusion.
                </p>
              </div>
            </div>

            {/* Subsection: Set Realistic Cancellation Policies */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Set Realistic Cancellation Policies
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Your booking rules should match your business.
                </p>
                <p>
                  For example, a spa may require customers to cancel at least 24 hours before an appointment.
                </p>
                <p>
                  If a customer cancels within the permitted period, the available time should be updated according to the system&apos;s booking rules.
                </p>
                <p>
                  Always test cancellation and rescheduling behavior before relying on it.
                </p>
              </div>
            </div>

            {/* Subsection: Compare Reminder and Deposit Features Separately */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Compare Reminder and Deposit Features Separately
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Some spa platforms provide automated reminders, cancellation fees, or appointment deposits.
                </p>
                <p>
                  These may help businesses manage attendance and protect revenue, but availability and additional charges differ between providers.
                </p>
                <p>
                  Before purchasing software, confirm whether reminders are delivered by email, SMS, or another channel and whether deposits or payment processing are included.
                </p>
                <p>
                  Don&apos;t assume these features come with every scheduling system.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION H: How to Choose the Best Spa Booking Software    */}
        {/* ========================================================= */}
        <section id="buying-guide" className="w-full py-12 sm:py-16 bg-white border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-[#FBF7F4] border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                BUYER&apos;S GUIDE
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                How to Choose the Best Spa Booking Software
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                The best spa booking software is the one that matches your services, staff, and booking requirements.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                An independent esthetician may need a straightforward online calendar, while a larger day spa may require advanced resource scheduling and payment features.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Start with the tasks your team performs every day.
              </p>
            </div>

            {/* Subsection: Check the Customer Booking Experience */}
            <div className="space-y-4 pt-2">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Check the Customer Booking Experience
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  Open the booking page as a customer.
                </p>
                <p>
                  Try selecting a treatment, finding an appointment, and completing a reservation.
                </p>
                <p>
                  The process should be easy to understand on both desktop and mobile.
                </p>
              </div>
            </div>

            {/* Subsection: Verify Staff and Service Availability */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Verify Staff and Service Availability
              </h3>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Check whether the platform supports:
              </p>

              <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4] p-5 sm:p-6 space-y-2.5">
                {[
                  "Individual therapist working hours.",
                  "Service assignments.",
                  "Different treatment durations.",
                  "Preparation and cleanup buffers.",
                  "Existing appointment conflicts.",
                  "Booking notice periods.",
                  "Cancellation and rescheduling rules.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#B87D89] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#29262B]">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
                These details matter more than a long list of marketing features.
              </p>
            </div>

            {/* Subsection: Understand What Is and Isn't Included */}
            <div className="space-y-4 pt-4 border-t border-[#B87D89]/10">
              <h3 className="text-lg sm:text-xl font-semibold text-[#29262B]">
                Understand What Is and Isn&apos;t Included
              </h3>
              <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed">
                <p>
                  If your spa needs digital intake forms, customer medical information, treatment-room booking, memberships, or integrated payments, verify each feature directly.
                </p>
                <p>
                  For specialized services that involve sensitive customer records, also review the provider&apos;s privacy, security, and data-handling arrangements.
                </p>
                <p>
                  A basic appointment scheduling product should not be treated as a complete spa management or medical records system.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION I: 10-Minute Booking Test                         */}
        {/* ========================================================= */}
        <section id="booking-test" className="w-full py-12 sm:py-16 bg-[#F3EDE8] border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-white border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                HANDS-ON VERIFICATION
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                A 10-Minute Test Before Choosing Spa Booking Software
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                A feature list tells you what a provider advertises. A simple test can show whether the system handles real scheduling situations correctly.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Configure a sample treatment and two therapists, then try the following:
              </p>
            </div>

            {/* Test Matrix Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#B87D89]/20 bg-white shadow-xs">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#B87D89]/15 bg-[#FBF7F4]">
                    <th className="px-5 py-3 font-semibold text-[#594250]">Test</th>
                    <th className="px-5 py-3 font-semibold text-[#594250]">Expected Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B87D89]/10">
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Book a facial with Therapist A at 10 AM</td>
                    <td className="px-5 py-3 text-[#594250]">Appointment appears in the calendar</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Request an overlapping time with Therapist A</td>
                    <td className="px-5 py-3 text-[#594250]">Conflict is blocked</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Request the same time with available Therapist B</td>
                    <td className="px-5 py-3 text-[#594250]">Booking can proceed if all requirements are met</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Add a 15-minute cleanup buffer</td>
                    <td className="px-5 py-3 text-[#594250]">Next available time respects the buffer</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Cancel an appointment</td>
                    <td className="px-5 py-3 text-[#594250]">Calendar updates according to policy</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Open the dashboard on mobile</td>
                    <td className="px-5 py-3 text-[#594250]">Appointment details remain accessible</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
              <p>
                If the provider offers multiple booking channels, repeat the availability tests through each one.
              </p>
              <p>
                The final confirmation step matters because another customer may book a time after someone first views it.
              </p>
              <p>
                Reliable software should recheck appointment availability before creating the reservation.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION J: Software Cost & Pricing                        */}
        {/* ========================================================= */}
        <section id="pricing" className="w-full py-12 sm:py-16 bg-white border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-[#FBF7F4] border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                TRANSPARENT COSTS
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                How Much Does Spa Booking Software Cost?
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Spa software pricing varies depending on the provider, team size, and included features.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Some platforms charge a monthly subscription per location. Others charge additional fees for staff accounts or advanced capabilities.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Free plans and trials may also have restrictions.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                When comparing prices, review the total cost rather than only the advertised starting rate.
              </p>
            </div>

            {/* Pricing Factor Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#B87D89]/20 bg-white shadow-xs">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#B87D89]/15 bg-[#FBF7F4]">
                    <th className="px-5 py-3 font-semibold text-[#594250]">Pricing Factor</th>
                    <th className="px-5 py-3 font-semibold text-[#594250]">Question to Ask</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B87D89]/10">
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Monthly subscription</td>
                    <td className="px-5 py-3 text-[#594250]">What is the regular cost?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Therapist accounts</td>
                    <td className="px-5 py-3 text-[#594250]">Are additional staff charged separately?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Online bookings</td>
                    <td className="px-5 py-3 text-[#594250]">Are there reservation limits or booking fees?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Payment processing</td>
                    <td className="px-5 py-3 text-[#594250]">Are transaction fees separate?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Email and SMS</td>
                    <td className="px-5 py-3 text-[#594250]">Are notifications included?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">AI receptionist</td>
                    <td className="px-5 py-3 text-[#594250]">Is AI booking included or an add-on?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Website integration</td>
                    <td className="px-5 py-3 text-[#594250]">Can clients book from an existing site?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Advanced spa features</td>
                    <td className="px-5 py-3 text-[#594250]">Are memberships, forms, or room scheduling extra?</td>
                  </tr>
                  <tr className="hover:bg-[#FBF7F4]/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#29262B]">Cancellation terms</td>
                    <td className="px-5 py-3 text-[#594250]">Can you change or cancel the subscription?</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-[#594250] leading-relaxed pt-2">
              <p>
                For example, a platform with a low starting price may become more expensive when additional therapists are added.
              </p>
              <p>
                Compare pricing based on your expected number of staff and actual business requirements.
              </p>
              <p>
                You can review Bookzello&apos;s current options on its{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-[#B87D89] hover:text-[#594250] underline decoration-[#B87D89]/40 underline-offset-4 transition-colors"
                >
                  pricing page
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION K: Is Bookzello Right for Your Spa?               */}
        {/* ========================================================= */}
        <section id="who-bookzello-is-for" className="w-full py-12 sm:py-16 bg-[#FBF7F4] border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-white border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                TARGET AUDIENCE
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                Is Bookzello Right for Your Spa?
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Bookzello focuses on online appointment booking, individual staff availability, service scheduling, and a shared appointment dashboard.
              </p>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                It may be a suitable option for appointment-based spas that want to organize customer bookings without starting with a complex enterprise management system.
              </p>
            </div>

            {/* Three Audience Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div className="rounded-2xl border border-[#B87D89]/20 bg-white p-5 sm:p-6 shadow-xs space-y-3">
                <div className="h-9 w-9 rounded-xl bg-[#EBCFCB]/60 flex items-center justify-center text-[#594250]">
                  <Sparkles className="h-5 w-5 text-[#B87D89]" />
                </div>
                <h3 className="text-base font-semibold text-[#29262B]">
                  Independent Estheticians
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-[#594250] leading-relaxed">
                  <p>
                    Solo estheticians can use a booking page to display available treatments and appointments.
                  </p>
                  <p>
                    A central calendar helps them review reservations without managing every request manually.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#B87D89]/20 bg-white p-5 sm:p-6 shadow-xs space-y-3">
                <div className="h-9 w-9 rounded-xl bg-[#EBCFCB]/60 flex items-center justify-center text-[#594250]">
                  <Users className="h-5 w-5 text-[#B87D89]" />
                </div>
                <h3 className="text-base font-semibold text-[#29262B]">
                  Small Day Spas
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-[#594250] leading-relaxed">
                  <p>
                    Spas with several therapists can configure individual schedules and assign different treatments to eligible team members.
                  </p>
                  <p>
                    This helps coordinate bookings when employees have different working hours or specialties.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#B87D89]/20 bg-white p-5 sm:p-6 shadow-xs space-y-3">
                <div className="h-9 w-9 rounded-xl bg-[#EBCFCB]/60 flex items-center justify-center text-[#594250]">
                  <Heart className="h-5 w-5 text-[#B87D89]" />
                </div>
                <h3 className="text-base font-semibold text-[#29262B]">
                  Boutique Wellness Studios
                </h3>
                <div className="space-y-2 text-xs sm:text-sm text-[#594250] leading-relaxed">
                  <p>
                    Wellness businesses offering scheduled treatments such as massages, facials, and scalp services may benefit from service-based online booking.
                  </p>
                  <p>
                    However, businesses requiring specialized treatment-room allocation, memberships, complex packages, or regulated medical workflows should verify those capabilities before choosing Bookzello.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION L: Setup Steps                                    */}
        {/* ========================================================= */}
        <section id="setup-steps" className="w-full py-12 sm:py-16 bg-white border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-[#FBF7F4] border border-[#B87D89]/25 px-3 py-0.5 rounded-full shadow-2xs">
                ONBOARDING GUIDE
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold text-[#29262B] tracking-tight">
                How to Set Up Spa Online Booking With Bookzello
              </h2>
              <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                Getting started with spa online booking software begins with your existing services and staff schedules.
              </p>
            </div>

            {/* 5 Steps List */}
            <div className="space-y-5 pt-2">
              {[
                {
                  step: "Step 1: Add Your Spa Treatments",
                  p1: "Create the treatments you offer.",
                  p2: "Enter the correct service names, prices, durations, and any necessary preparation or cleanup time.",
                },
                {
                  step: "Step 2: Configure Therapist Schedules",
                  p1: "Add your staff members and assign the treatments they can perform.",
                  p2: "Set their working hours and availability so the booking system can identify suitable appointments.",
                },
                {
                  step: "Step 3: Set Booking Rules",
                  p1: "Configure your advance-booking limits, notice periods, and cancellation or rescheduling policies.",
                  p2: "Choose the correct business timezone so appointments display at the intended local time.",
                },
                {
                  step: "Step 4: Share Your Booking Page",
                  p1: "Once your services and schedules are ready, share your public booking link with customers.",
                  p2: "You can also place the link on your existing spa website.",
                },
                {
                  step: "Step 5: Test the Booking Experience",
                  p1: "Before inviting real clients, make a sample reservation.",
                  p2: "Confirm that the appointment appears in the dashboard, uses the correct staff member, and respects your service duration and booking rules.",
                  p3: "Repeat the process for cancellations and overlapping time requests.",
                },
              ].map((item, idx) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4] p-5 sm:p-6 shadow-xs flex items-start gap-4"
                >
                  <div className="h-8 w-8 rounded-full bg-[#594250] text-white flex items-center justify-center font-semibold text-sm shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-semibold text-[#29262B]">
                      {item.step}
                    </h3>
                    <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                      {item.p1}
                    </p>
                    <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                      {item.p2}
                    </p>
                    {item.p3 && (
                      <p className="text-sm sm:text-base text-[#594250] leading-relaxed">
                        {item.p3}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION M: Frequently Asked Questions                     */}
        {/* ========================================================= */}
        <section id="faq" className="w-full py-16 sm:py-24 bg-white border-b border-[#B87D89]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#B87D89] bg-[#FBF7F4] border border-[#B87D89]/25 px-3.5 py-1 rounded-full shadow-2xs">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#29262B] tracking-tight">
                Frequently Asked Questions About Spa Booking Software
              </h2>
              <p className="text-sm sm:text-base text-[#594250] max-w-2xl mx-auto">
                Clear answers to common questions about spa appointment scheduling, online booking, and choosing the right software.
              </p>
            </div>

            <FaqAccordion items={faqData} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION N: Conclusion & Final Action Callout              */}
        {/* ========================================================= */}
        <section id="conclusion" className="w-full py-16 sm:py-20 bg-[#FBF7F4]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#29262B] via-[#3E2B3A] to-[#594250] px-6 sm:px-12 py-12 sm:py-16 text-center text-white shadow-2xl overflow-hidden">
              
              {/* Subtle ambient lighting */}
              <div
                className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#B87D89]/20 blur-3xl pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#EBCFCB]/15 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3.5 py-1 text-xs font-semibold text-[#EBCFCB] backdrop-blur-xs">
                  <Sparkles className="h-3.5 w-3.5 text-[#EBCFCB]" />
                  <span>SMART SCHEDULING</span>
                </span>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight">
                  Conclusion: Choose Spa Booking Software That Works for Your Business
                </h2>

                <div className="space-y-4 text-xs sm:text-sm sm:text-base text-white/90 leading-relaxed text-left sm:text-center font-normal">
                  <p>
                    The right spa booking software should make your day easier, not introduce another complicated system to manage. Focus on the essentials: accurate therapist availability, realistic treatment durations, straightforward online booking, and a dashboard that clearly shows upcoming appointments. Advanced features such as memberships, payments, and treatment-room management may be valuable, but only if your spa needs them. Before making a decision, test the booking process with situations your team handles every day.
                  </p>
                  <p>
                    While testing Bookzello&apos;s appointment system, we successfully confirmed two simultaneous bookings for different staff members. We also discovered that our AI booking assistant initially offered an occupied staff member&apos;s time slot, which led us to strengthen availability checks and booking validation. That firsthand experience reinforced an important lesson: reliable scheduling matters more than an impressive feature list. If you&apos;re comparing booking systems, test staff conflicts, appointment changes, and final confirmations yourself. You can{" "}
                    <Link
                      href="/booking/bookpilot-qa-salon"
                      className="font-semibold text-[#EBCFCB] hover:text-white underline decoration-[#EBCFCB]/60 underline-offset-4 transition-colors"
                    >
                      explore Bookzello&apos;s sample booking demo
                    </Link>{" "}
                    to see the customer booking workflow in action.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#FBF7F4] px-6 py-3 text-sm font-semibold text-[#29262B] shadow-md transition-all active:scale-[0.99]"
                  >
                    <span>Explore Booking Demo</span>
                    <ArrowRight className="h-4 w-4 text-[#B87D89]" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/30 hover:border-white/60 bg-white/10 hover:bg-white/15 px-6 py-3 text-sm font-semibold text-white transition-all backdrop-blur-xs"
                  >
                    <span>View Pricing</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
