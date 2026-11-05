import type { Metadata } from "next";
import Link from "next/link";
import { 
  Clock, 
  Users, 
  Scissors, 
  ChevronRight, 
  Layers, 
  Calendar, 
  Check,
  ShieldCheck,
  Sparkles,
  ArrowDown,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  Bot
} from "lucide-react";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { ProductIllustration } from "@/components/marketing/product-illustration";
import { SalonHeroVisual } from "@/components/marketing/salon-hero-visual";
import { 
  SalonHeroCta, 
  SalonInlineCta, 
  SalonBannerCta 
} from "@/components/marketing/salon-management-cta";

export const metadata: Metadata = {
  title: {
    absolute: "Hair Salon Management Software for Small Teams | Bookzello",
  },
  description:
    "Manage salon bookings, staff availability, services and customer appointments with Bookzello hair salon management software. Request a guided demo.",
  alternates: {
    canonical: "https://bookzello.com/salon-management-software",
  },
  openGraph: {
    title: "Hair Salon Management Software | Bookzello",
    description:
      "Spend more time with clients and less time organizing appointments. Easy online booking, staff availability, and salon scheduling in one place.",
    url: "https://bookzello.com/salon-management-software",
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
    id: "what-is-hair-salon-management-software",
    question: "What is hair salon management software?",
    answer:
      "Hair salon management software helps salon businesses organize activities such as customer appointments, staff schedules, services, and booking records. Some platforms also include payments, inventory, payroll, and reporting, depending on the provider.",
  },
  {
    id: "booking-vs-management-software",
    question: "What is the difference between salon booking software and salon management software?",
    answer:
      "Salon booking software primarily handles appointment scheduling and reservations. Salon management software can cover wider business operations such as customer management, staff administration, inventory, and reporting. The exact features vary between products.",
  },
  {
    id: "can-small-salons-use-it",
    question: "Can small hair salons use management software?",
    answer:
      "Yes. Small salons and independent stylists can use software to keep appointments, services, and availability organized. The right system should match the size and actual needs of the business.",
  },
  {
    id: "can-customers-book-online",
    question: "Can customers book hair appointments online with Bookzello?",
    answer:
      "Bookzello includes a customer-facing booking flow where clients can select services and available appointment times. The booking options depend on the salon's configured services, staff, and working schedule.",
  },
  {
    id: "how-does-it-handle-staff-availability",
    question: "How does salon scheduling software handle staff availability?",
    answer:
      "Scheduling software uses working hours, existing bookings, service durations, and other configured rules to calculate appointment availability. Bookzello uses this information to prevent overlapping reservations within its booking workflow.",
  },
  {
    id: "can-i-manage-from-phone",
    question: "Can I manage salon appointments from my phone?",
    answer:
      "Bookzello's customer booking experience is designed for mobile use. Salon owners should review the current dashboard experience on their own devices to confirm it meets their everyday management needs.",
  },
  {
    id: "does-it-support-ai-booking",
    question: "Does Bookzello support AI-assisted booking?",
    answer:
      "Bookzello is developing an AI receptionist that can assist with service questions, availability, and conversational booking. The feature is undergoing controlled validation and is not being advertised here as generally available.",
  },
  {
    id: "how-much-does-it-cost",
    question: "How much does salon management software cost?",
    answer:
      "Pricing varies depending on the provider, included features, team size, and billing arrangement. Some platforms charge monthly subscriptions, while others offer different fee structures. Contact Bookzello for current pricing and availability; no fixed public price is stated on this page.",
  },
];

export default function SalonManagementSoftwarePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://bookzello.com/#website",
        "url": "https://bookzello.com/",
        "name": "Bookzello",
        "description": "Hair salon management software and booking system for salon businesses.",
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
        "@id": "https://bookzello.com/salon-management-software#software",
        "name": "Bookzello Hair Salon Management Software",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://bookzello.com/salon-management-software#breadcrumb",
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
            "name": "Hair Salon Management Software",
            "item": "https://bookzello.com/salon-management-software",
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col items-center justify-center w-full bg-[#FBF6F3] text-[#27232B] selection:bg-[#EBC9C5] selection:text-[#553B4B] font-body">
        
        {/* ========================================================= */}
        {/* SECTION 1 — HERO SECTION                                  */}
        {/* ========================================================= */}
        <section className="relative w-full overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-18 lg:pb-28">
          {/* Ambient Multi-Layer Beauty Radial Mesh Backdrop with Soft Glow */}
          <div 
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[720px] bg-gradient-to-b from-[#EBC9C5]/30 via-[#AF6D7B]/10 to-transparent blur-3xl -z-10 pointer-events-none" 
            aria-hidden="true"
          />
          <div 
            className="absolute top-16 right-10 w-96 h-96 bg-[#EBC9C5]/20 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse-glow" 
            aria-hidden="true" 
          />
          <div 
            className="absolute top-36 left-10 w-96 h-96 bg-[#AF6D7B]/15 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse-glow" 
            aria-hidden="true" 
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              
              {/* Left Column: Hero Copy & Conversion Actions */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* Eyebrow badge with refined beauty styling */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-[#AF6D7B]/25 bg-white/80 backdrop-blur-xs px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#AF6D7B] shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#AF6D7B] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#AF6D7B]"></span>
                  </span>
                  <span>HAIR SALON MANAGEMENT SOFTWARE FOR SMALL TEAMS</span>
                </div>

                {/* Primary SEO H1 */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B] leading-[1.15]">
                  Hair Salon Management Software That Makes Your Day Easier
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl font-semibold text-[#27232B] leading-snug">
                  Spend more time with your clients and less time organizing appointments.
                </p>

                {/* Description */}
                <p className="text-base sm:text-lg text-[#553B4B] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Bookzello brings online booking, staff availability, service details, and customer appointments into one easy-to-use system. Whether you work independently or manage a small hair salon team, you can keep your booking day organized without relying on scattered messages and paper calendars.
                </p>

                {/* Visual Feature Highlights Strip (Modern Pills) */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/25 px-3.5 py-1 text-xs font-medium text-[#553B4B] shadow-2xs">
                    <Calendar className="h-3.5 w-3.5 text-[#AF6D7B]" />
                    <span>Centralized Calendar</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/25 px-3.5 py-1 text-xs font-medium text-[#553B4B] shadow-2xs">
                    <Users className="h-3.5 w-3.5 text-[#AF6D7B]" />
                    <span>Staff Availability</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#AF6D7B]/25 px-3.5 py-1 text-xs font-medium text-[#553B4B] shadow-2xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#AF6D7B]" />
                    <span>Zero Double Bookings</span>
                  </span>
                </div>

                {/* Primary CTA + Interactive Tour Link */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                  <SalonHeroCta label="Request a Demo" />
                  <a
                    href="#product-tour"
                    className="inline-flex items-center gap-2 rounded-full border border-[#AF6D7B]/30 bg-white hover:bg-[#FBF6F3] text-[#27232B] px-6 py-3.5 text-sm font-semibold shadow-xs hover:border-[#AF6D7B]/50 transition-all active:scale-[0.99]"
                  >
                    <span>Explore Workflow Tour</span>
                    <ArrowDown className="h-4 w-4 text-[#AF6D7B]" />
                  </a>
                </div>

                {/* Microcopy & caption footnote */}
                <div className="pt-1 flex flex-col items-center lg:items-start gap-1">
                  <p className="text-xs text-[#553B4B]/80 font-medium italic">
                    Built for hair salons, independent stylists, and growing beauty teams.
                  </p>
                  <p className="text-[11px] text-[#553B4B]/60">
                    A clearer view of your salon appointments, services, and staff schedules.
                  </p>
                </div>
              </div>

              {/* Right Column: Hero Visual with Real Stylist & Glassmorphic UI Cards */}
              <div className="lg:col-span-5 w-full">
                <SalonHeroVisual />
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* QUICK BENEFIT STRIP (Matches Homepage Modern SaaS Style)  */}
        {/* ========================================================= */}
        <section className="w-full py-8 bg-white/80 border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] border border-[#AF6D7B]/15">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">Unified Calendar</h3>
                  <p className="text-xs text-[#553B4B]/80 mt-0.5">All visits in one view</p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] border border-[#AF6D7B]/15">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">Staff Shifts</h3>
                  <p className="text-xs text-[#553B4B]/80 mt-0.5">Individual availability</p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] border border-[#AF6D7B]/15">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">Collision Safe</h3>
                  <p className="text-xs text-[#553B4B]/80 mt-0.5">Buffers &amp; durations</p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all shadow-xs">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] border border-[#AF6D7B]/15">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#27232B]">Mobile Booking</h3>
                  <p className="text-xs text-[#553B4B]/80 mt-0.5">Easy client self-booking</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2 — WHAT IS HAIR SALON MANAGEMENT SOFTWARE?       */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                DEFINING SALON SOFTWARE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                What Is Hair Salon Management Software?
              </h2>
            </div>

            {/* Paragraphs in polished modern cards with visual before/after comparison */}
            <div className="space-y-6 text-base sm:text-lg text-[#553B4B] leading-relaxed bg-white rounded-3xl p-6 sm:p-10 border border-[#AF6D7B]/20 shadow-xs">
              <p>
                Hair salon management software helps salon owners organize the everyday tasks involved in running an appointment-based business.
              </p>
              <p>
                Instead of switching between customer messages, a paper diary, and individual staff calendars, you can use one system to manage appointments, services, and availability.
              </p>
              <p>
                For small hair salons, that means knowing who is booked, which stylist is assigned, and when the next available appointment can begin.
              </p>
              <div className="font-semibold text-[#27232B] border-l-4 border-[#AF6D7B] pl-4 py-2 bg-[#FBF6F3] rounded-r-2xl">
                Bookzello focuses on these essential booking and scheduling workflows, giving salon owners a practical way to organize their day.
              </div>
            </div>

            {/* Sub-section: Salon Management Software vs. Salon Booking Software */}
            <div className="mt-12 rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-10 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] border border-[#AF6D7B]/20 shadow-2xs">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-[#27232B]">
                  Salon Management Software vs. Salon Booking Software
                </h3>
              </div>

              <div className="space-y-4 text-[#553B4B] text-base leading-relaxed">
                <p>
                  The two terms are closely related, but they describe different levels of functionality.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                  {/* Card 1: Salon Booking Software (with natural homepage link) */}
                  <div className="rounded-3xl border border-[#AF6D7B]/25 bg-[#FBF6F3]/50 p-6 shadow-xs hover:border-[#AF6D7B] transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-[#AF6D7B]" />
                      <h4 className="font-semibold text-[#27232B] text-lg">
                        <Link 
                          href="/" 
                          className="text-[#AF6D7B] hover:text-[#553B4B] underline inline-flex items-center gap-1 font-semibold"
                          title="Return to Bookzello salon booking software homepage"
                        >
                          <span>salon booking software</span>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </h4>
                    </div>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      Focuses on helping customers select and reserve appointments.
                    </p>
                  </div>

                  {/* Card 2: Salon Management Software */}
                  <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 shadow-xs hover:border-[#AF6D7B]/35 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Scissors className="h-5 w-5 text-[#553B4B]" />
                      <h4 className="font-semibold text-[#27232B] text-lg">
                        Salon management software
                      </h4>
                    </div>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      Can cover a wider range of daily operations, including staff schedules, service settings, customer records, and appointment administration.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#553B4B] bg-[#FBF6F3] p-4 rounded-2xl border border-[#AF6D7B]/15">
                  Some salon management platforms also include inventory, payroll, payments, and accounting tools. These are separate capabilities, and not every booking-focused system includes them.
                </p>
                <p className="font-semibold text-[#27232B] text-base pt-1">
                  Bookzello combines online appointment booking with essential scheduling and customer management features.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3 — MANAGE APPOINTMENTS IN ONE PLACE              */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                CENTRALIZED CALENDAR
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                Manage Hair Salon Appointments in One Place
              </h2>
              <div className="mt-4 space-y-2 text-base sm:text-lg text-[#553B4B] leading-relaxed">
                <p>
                  A busy salon can receive appointment requests while stylists are working with clients, answering calls, or preparing for their next service.
                </p>
                <p>
                  Without an organized schedule, it becomes harder to keep track of every request.
                </p>
                <p className="font-semibold text-[#27232B]">
                  Bookzello gives your team a central place to review appointments and important booking details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Subsections & Everyday Questions Styled as Live Cards */}
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    See Upcoming Appointments
                  </h3>
                  <p className="text-[#553B4B] leading-relaxed mb-3">
                    Open your appointment dashboard to check scheduled visits, assigned staff, and services.
                  </p>
                  <p className="text-[#553B4B] leading-relaxed mb-4">
                    Instead of searching through old messages to remember a booking, your team can see the appointment information in one place.
                  </p>

                  <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 shadow-xs">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#AF6D7B] mb-3.5 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#AF6D7B]" />
                      <span>This helps with everyday questions such as:</span>
                    </p>
                    <ul className="space-y-2.5 text-sm text-[#553B4B]">
                      <li className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                        <div className="h-5 w-5 rounded-full bg-[#FBF6F3] text-[#AF6D7B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="font-semibold text-[#27232B]">Who is booked next?</span>
                      </li>
                      <li className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                        <div className="h-5 w-5 rounded-full bg-[#FBF6F3] text-[#AF6D7B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="font-semibold text-[#27232B]">Which stylist is assigned?</span>
                      </li>
                      <li className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                        <div className="h-5 w-5 rounded-full bg-[#FBF6F3] text-[#AF6D7B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="font-semibold text-[#27232B]">What service has the customer selected?</span>
                      </li>
                      <li className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                        <div className="h-5 w-5 rounded-full bg-[#FBF6F3] text-[#AF6D7B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="font-semibold text-[#27232B]">How much time is reserved for the appointment?</span>
                      </li>
                      <li className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                        <div className="h-5 w-5 rounded-full bg-[#FBF6F3] text-[#AF6D7B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="font-semibold text-[#27232B]">Has the appointment been confirmed or cancelled?</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    Keep Track of Cancellations and Schedule Changes
                  </h3>
                  <div className="space-y-3 text-[#553B4B] leading-relaxed">
                    <p>
                      Plans change. A customer may need a different time, or a stylist&apos;s schedule may change.
                    </p>
                    <p>
                      An organized appointment system makes it easier to review a booking and understand which parts of the schedule are affected.
                    </p>
                    <p>
                      With Bookzello, your team can view appointment records and their current status. Supported cancellation and rescheduling actions should be used through the appropriate booking or management flow.
                    </p>
                    <p className="font-semibold text-[#27232B] border-l-4 border-[#AF6D7B] pl-3.5 py-1 bg-[#FBF6F3] rounded-r-xl">
                      The goal is simple: keep your calendar clear and reduce confusion when plans change.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Screenshot Illustration Slot */}
              <div className="lg:col-span-6 w-full">
                <ProductIllustration
                  variant="appointment-review"
                  caption="See your salon's upcoming appointments with service, customer, and staff details."
                />
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4 — SALON APPOINTMENT SCHEDULING SOFTWARE         */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                SMART ENGINE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                Salon Appointment Scheduling Software for Your Team
              </h2>
              <div className="mt-4 space-y-2 text-base sm:text-lg text-[#553B4B] leading-relaxed">
                <p>
                  Your salon schedule is more than a list of times.
                </p>
                <p>
                  Different stylists have different working hours. A haircut may take less time than a color appointment. Some services also need a short gap before the next customer arrives.
                </p>
                <p className="font-semibold text-[#27232B]">
                  Bookzello uses staff availability, service duration, and booking rules to help determine which appointment times can be offered.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Staff Calendar Illustration Slot */}
              <div className="lg:col-span-6 order-2 lg:order-1 w-full">
                <ProductIllustration
                  variant="staff-calendar"
                  caption="Check available appointment times against staff schedules and service durations."
                />
              </div>

              {/* Right Column: Features and Practical Example */}
              <div className="lg:col-span-6 order-1 lg:order-2 space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    Set Staff Availability and Working Hours
                  </h3>
                  <p className="text-[#553B4B] leading-relaxed mb-3">
                    Organize the availability of individual team members so customers can choose suitable appointment times.
                  </p>
                  <p className="text-[#553B4B] leading-relaxed mb-3">
                    For example, a stylist who works mornings should not appear available for an evening appointment outside their configured schedule.
                  </p>
                  <p className="text-[#27232B] leading-relaxed font-semibold">
                    This is especially useful when you have multiple stylists sharing one salon calendar.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    Help Prevent Overlapping Bookings
                  </h3>
                  <p className="text-[#553B4B] leading-relaxed mb-3">
                    Double bookings can disrupt the whole day.
                  </p>
                  <p className="text-[#553B4B] leading-relaxed mb-4">
                    A booking system needs to consider more than the selected appointment start time. It must also account for how long the service takes and any configured booking buffers.
                  </p>
                  <p className="text-[#27232B] leading-relaxed mb-5 font-semibold">
                    Bookzello&apos;s booking engine checks availability before confirming an appointment and reserves the occupied time for the selected staff member.
                  </p>

                  {/* Practical Example Interactive Visual Card */}
                  <div className="rounded-3xl border border-[#AF6D7B]/25 bg-white p-6 sm:p-7 shadow-xs">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#AF6D7B]/15">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#AF6D7B] flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>Practical example</span>
                      </p>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 shadow-2xs">
                        Zero Collisions
                      </span>
                    </div>

                    <p className="text-sm text-[#27232B] leading-relaxed mb-2 font-medium">
                      A classic haircut takes 35 minutes and includes a five-minute buffer afterward.
                    </p>
                    <p className="text-sm text-[#27232B] leading-relaxed mb-4 font-semibold">
                      If it starts at 2:00 PM, the occupied window runs until 2:40 PM. The system should not offer another overlapping appointment to the same stylist.
                    </p>

                    {/* Timeline visualization bar */}
                    <div className="space-y-2 my-4 bg-[#FBF6F3] p-3.5 rounded-2xl border border-[#AF6D7B]/15 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#553B4B]">
                        <span className="font-semibold text-[#27232B]">2:00 PM (Start)</span>
                        <span className="text-[#553B4B]">2:35 PM (Service Ends)</span>
                        <span className="font-semibold text-emerald-600">2:40 PM (Slot Clear)</span>
                      </div>
                      <div className="h-5 w-full rounded-full bg-white flex overflow-hidden p-0.5 border border-[#AF6D7B]/20">
                        <div className="h-full w-[85%] rounded-l-full bg-[#27232B] text-[9.5px] text-white flex items-center justify-center font-medium">
                          Classic Haircut (35 min)
                        </div>
                        <div className="h-full w-[15%] rounded-r-full bg-[#EBC9C5] text-[9px] text-[#27232B] flex items-center justify-center font-semibold">
                          5m Buffer
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#553B4B]/70 pt-1">
                        <span>Stylist: Elena Vance</span>
                        <span className="text-rose-600 font-semibold">Overlapping 2:15 PM Blocked</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#553B4B]/80 italic">
                      This kind of time-aware scheduling makes a meaningful difference when multiple customers book online.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5 — ORGANIZE SERVICES, PRICES, AND DURATIONS      */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                SERVICE CATALOG
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                Organize Salon Services, Prices, and Appointment Durations
              </h2>
              <div className="mt-4 space-y-2 text-base sm:text-lg text-[#553B4B] leading-relaxed">
                <p>
                  Not every salon service takes the same amount of time.
                </p>
                <p>
                  A quick trim, haircut, styling appointment, and longer treatment may all require different booking durations.
                </p>
                <p>
                  Bookzello lets your business organize its service information so the booking flow can present relevant options to customers.
                </p>
                <p className="font-semibold text-[#27232B]">
                  Service details can include the service name, duration, and price.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Duration Table & Explanation */}
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    Give Each Service the Right Amount of Time
                  </h3>
                  <p className="text-[#553B4B] leading-relaxed mb-4">
                    Setting appropriate durations helps your team plan appointments around the actual work involved.
                  </p>

                  <p className="text-sm font-semibold text-[#27232B] mb-2">
                    For example:
                  </p>

                  {/* Clean Accessible Service Duration Table with visual badges */}
                  <div className="overflow-hidden rounded-3xl border border-[#AF6D7B]/20 bg-white shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#FBF6F3] border-b border-[#AF6D7B]/15 text-xs font-semibold uppercase tracking-wider text-[#27232B]">
                          <th scope="col" className="py-3.5 px-4 sm:px-6">Service example</th>
                          <th scope="col" className="py-3.5 px-4 sm:px-6">Illustrative duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AF6D7B]/10 text-sm text-[#553B4B] bg-white">
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B] flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#AF6D7B]" />
                            <span>Beard trim</span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#AF6D7B] bg-[#FBF6F3] px-3 py-1 rounded-full text-xs border border-[#AF6D7B]/20">
                              <Clock className="h-3 w-3 text-[#AF6D7B]" />
                              <span>20 minutes</span>
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B] flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#27232B]" />
                            <span>Classic haircut</span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#AF6D7B] bg-[#FBF6F3] px-3 py-1 rounded-full text-xs border border-[#AF6D7B]/20">
                              <Clock className="h-3 w-3 text-[#AF6D7B]" />
                              <span>35 minutes</span>
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B] flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#553B4B]" />
                            <span>Hair styling</span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#AF6D7B] bg-[#FBF6F3] px-3 py-1 rounded-full text-xs border border-[#AF6D7B]/20">
                              <Clock className="h-3 w-3 text-[#AF6D7B]" />
                              <span>45 minutes</span>
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-[#FBF6F3]/50 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#27232B] flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#AF6D7B]" />
                            <span>Hair color consultation</span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#AF6D7B] bg-[#FBF6F3] px-3 py-1 rounded-full text-xs border border-[#AF6D7B]/20">
                              <Clock className="h-3 w-3 text-[#AF6D7B]" />
                              <span>30 minutes</span>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-[#553B4B]/80 italic mt-3">
                    *These are examples, not default Bookzello service settings. Each salon should configure its own services and durations.
                  </p>
                </div>

                <div className="pt-2">
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    Show Customers Their Booking Details
                  </h3>
                  <div className="space-y-3 text-[#553B4B] leading-relaxed">
                    <p>
                      Before confirming an appointment, customers should be able to review the service they selected, the assigned specialist, the appointment time, and relevant pricing information.
                    </p>
                    <p className="font-semibold text-[#27232B] border-l-4 border-[#AF6D7B] pl-3.5 py-1 bg-[#FBF6F3] rounded-r-xl">
                      A clear booking journey reduces uncertainty and gives customers a chance to review their choice.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Service Selection Illustration Slot */}
              <div className="lg:col-span-6 w-full">
                <ProductIllustration
                  variant="service-selection"
                  caption="Organize services with clear durations and prices before customers book."
                />
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6 — MAKE ONLINE BOOKING SIMPLER                   */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                CLIENT EXPERIENCE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                Make Online Booking Simpler for Your Salon Clients
              </h2>
              <div className="mt-4 space-y-2 text-base sm:text-lg text-[#553B4B] leading-relaxed">
                <p>
                  Customers often want to book an appointment without making a phone call or waiting for a message reply.
                </p>
                <p>
                  An online booking page gives them a straightforward way to choose a service and see suitable appointment times.
                </p>
                <p className="font-semibold text-[#27232B]">
                  Bookzello connects the customer booking experience with the salon&apos;s configured staff, services, and availability.
                </p>
              </div>
            </div>

            {/* How Online Salon Booking Works (4 Steps with connected visual cards) */}
            <div className="mb-14">
              <h3 className="text-2xl font-semibold text-center text-[#27232B] mb-8">
                How Online Salon Booking Works
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Step 1 */}
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-[#AF6D7B]/35 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="h-11 w-11 rounded-2xl bg-[#27232B] text-white flex items-center justify-center font-bold text-base mb-4 shadow-sm group-hover:bg-[#553B4B] transition-colors">
                      1
                    </div>
                    <h4 className="text-lg font-semibold text-[#27232B] mb-2">
                      Step 1 — Choose a service
                    </h4>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      The customer selects the haircut, styling service, or other appointment they need.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-[#AF6D7B]/35 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="h-11 w-11 rounded-2xl bg-[#27232B] text-white flex items-center justify-center font-bold text-base mb-4 shadow-sm group-hover:bg-[#553B4B] transition-colors">
                      2
                    </div>
                    <h4 className="text-lg font-semibold text-[#27232B] mb-2">
                      Step 2 — Select a stylist
                    </h4>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      Where staff selection is available, the customer can choose a preferred specialist.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-[#AF6D7B]/35 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="h-11 w-11 rounded-2xl bg-[#27232B] text-white flex items-center justify-center font-bold text-base mb-4 shadow-sm group-hover:bg-[#553B4B] transition-colors">
                      3
                    </div>
                    <h4 className="text-lg font-semibold text-[#27232B] mb-2">
                      Step 3 — Pick an available time
                    </h4>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      The booking system checks the salon schedule and presents available appointment options.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-[#AF6D7B]/35 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="h-11 w-11 rounded-2xl bg-[#27232B] text-white flex items-center justify-center font-bold text-base mb-4 shadow-sm group-hover:bg-[#553B4B] transition-colors">
                      4
                    </div>
                    <h4 className="text-lg font-semibold text-[#27232B] mb-2">
                      Step 4 — Review and confirm
                    </h4>
                    <p className="text-sm text-[#553B4B] leading-relaxed">
                      The customer enters the required details, reviews the appointment, and completes the booking.
                    </p>
                    <p className="text-sm text-[#553B4B] leading-relaxed pt-2 font-medium">
                      The confirmed appointment can then be managed through the salon&apos;s booking system.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Subsections */}
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    Let Clients Choose Their Preferred Stylist
                  </h3>
                  <div className="space-y-3 text-[#553B4B] leading-relaxed">
                    <p>
                      Many hair salon customers return to a stylist they already know.
                    </p>
                    <p className="font-semibold text-[#27232B] border-l-4 border-[#AF6D7B] pl-3.5 py-1 bg-white rounded-r-xl">
                      Staff selection makes it easier to book with a preferred team member while respecting that person&apos;s working schedule.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-[#27232B] mb-3">
                    Keep Customer Appointment Details Organized
                  </h3>
                  <div className="space-y-3 text-[#553B4B] leading-relaxed">
                    <p>
                      Customer information is useful when your team needs to identify an appointment or review a booking.
                    </p>
                    <p>
                      Bookzello stores customer and appointment records associated with the business, helping the team keep relevant booking information together.
                    </p>
                    <p className="font-semibold text-[#27232B] border-l-4 border-[#AF6D7B] pl-3.5 py-1 bg-white rounded-r-xl">
                      This is a practical starting point for appointment administration without relying entirely on informal chat histories.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Customer Booking Illustration Slot */}
              <div className="lg:col-span-6 w-full">
                <ProductIllustration
                  variant="customer-booking"
                  caption="A simple booking flow for customers, connected to the salon's appointment schedule."
                />
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 7 — SMALL BUSINESSES SECTION                      */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                BUILT FOR YOUR TEAM SIZE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                Salon Management Software for Small Businesses
              </h2>
              <div className="mt-4 space-y-2 text-base sm:text-lg text-[#553B4B] leading-relaxed">
                <p>
                  A small hair salon needs useful tools without unnecessary complexity.
                </p>
                <p className="font-semibold text-[#27232B]">
                  Whether you work alone or manage several stylists, the important thing is that your booking process matches the way your business actually operates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1: Independent Salon Owners */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-8 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] mb-5 border border-[#AF6D7B]/20 shadow-2xs">
                    <Scissors className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                    For Independent Salon Owners
                  </h3>
                  <div className="space-y-3 text-sm text-[#553B4B] leading-relaxed">
                    <p>
                      Running a salon on your own means managing appointments while also providing services.
                    </p>
                    <p>
                      Bookzello can give independent owners a dedicated online booking page and a central view of appointments.
                    </p>
                    <p className="font-semibold text-[#27232B] pt-1">
                      Instead of manually coordinating every request, customers can use the booking flow to choose available times.
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-[#AF6D7B]/15 mt-6">
                  <span className="text-xs font-semibold text-[#AF6D7B]">Single Stylist Workflow</span>
                </div>
              </div>

              {/* Card 2: Small Hair Salon Teams */}
              <div className="rounded-3xl border-2 border-[#AF6D7B]/35 bg-gradient-to-b from-white to-[#FBF6F3]/50 p-7 sm:p-8 shadow-sm hover:border-[#AF6D7B] hover:shadow-md transition-all flex flex-col justify-between relative">
                <span className="absolute -top-3 right-6 bg-[#27232B] text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  Most Popular
                </span>
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] mb-5 border border-[#AF6D7B]/20 shadow-2xs">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                    For Small Hair Salon Teams
                  </h3>
                  <div className="space-y-3 text-sm text-[#553B4B] leading-relaxed">
                    <p>
                      When several people share a salon, staff availability becomes more important.
                    </p>
                    <p>
                      A centralized schedule helps keep appointments associated with the right specialist, service, and time.
                    </p>
                    <p className="font-semibold text-[#27232B] pt-1">
                      For a team of three stylists, this could mean each person having their own availability while the business maintains a shared overview.
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-[#AF6D7B]/15 mt-6">
                  <span className="text-xs font-semibold text-[#AF6D7B]">2–10 Stylists &amp; Barbers</span>
                </div>
              </div>

              {/* Card 3: Growing Salons */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-7 sm:p-8 shadow-xs hover:border-[#AF6D7B]/35 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6F3] text-[#AF6D7B] mb-5 border border-[#AF6D7B]/20 shadow-2xs">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#27232B] mb-3">
                    For Growing Salons
                  </h3>
                  <div className="space-y-3 text-sm text-[#553B4B] leading-relaxed">
                    <p>
                      As your appointment volume increases, organizing bookings through scattered messages becomes less practical.
                    </p>
                    <p>
                      A structured booking system gives you a clearer foundation for managing schedules, adding services, and organizing customer appointments.
                    </p>
                    <p className="font-semibold text-[#27232B] pt-1">
                      Bookzello is designed around these day-to-day needs rather than requiring every salon to operate like a large chain.
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-[#AF6D7B]/15 mt-6">
                  <span className="text-xs font-semibold text-[#AF6D7B]">Scalable Capacity</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 8 — SEE HOW BOOKZELLO WORKS IN A WORKFLOW         */}
        {/* ========================================================= */}
        <section id="product-tour" className="w-full py-16 sm:py-24 bg-[#FBF6F3]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                PRODUCT TOUR
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                See How Bookzello Works in a Salon Workflow
              </h2>
              <div className="mt-4 space-y-1 text-base sm:text-lg text-[#553B4B] leading-relaxed">
                <p>Software is easier to evaluate when you can see how it works.</p>
                <p className="font-semibold text-[#27232B]">
                  Here are the core parts of the Bookzello booking experience worth exploring.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* Item 1 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    1. Appointment Dashboard
                  </h3>
                  <span className="text-xs font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-2.5 py-1 rounded-full">
                    Unified Hub
                  </span>
                </div>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  View booking records, services, customers, assigned staff, and appointment status.
                </p>
                <ProductIllustration
                  variant="hero-dashboard"
                  caption="Keep your daily appointments visible in one organized place."
                />
              </div>

              {/* Item 2 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    2. Staff Schedule
                  </h3>
                  <span className="text-xs font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-2.5 py-1 rounded-full">
                    Team Availability
                  </span>
                </div>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  Review working schedules and the availability used to offer appointment times.
                </p>
                <ProductIllustration
                  variant="staff-calendar"
                  caption="Match appointment times to the stylist who will perform the service."
                />
              </div>

              {/* Item 3 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    3. Services and Pricing
                  </h3>
                  <span className="text-xs font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-2.5 py-1 rounded-full">
                    Service Catalog
                  </span>
                </div>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  View service information used throughout the booking process.
                </p>
                <ProductIllustration
                  variant="service-selection"
                  caption="Make service names, durations, and pricing easier to manage."
                />
              </div>

              {/* Item 4 */}
              <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#AF6D7B]/35 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#27232B]">
                    4. Customer Booking Page
                  </h3>
                  <span className="text-xs font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-2.5 py-1 rounded-full">
                    Client Experience
                  </span>
                </div>
                <p className="text-sm text-[#553B4B] leading-relaxed">
                  Follow the steps a customer uses to select a service, stylist, and available time.
                </p>
                <ProductIllustration
                  variant="customer-booking"
                  caption="Give customers a clear way to book from their phones."
                />
              </div>
            </div>

            {/* Section CTA: Replaced with safe Request a Demo flow */}
            <div className="text-center pt-2">
              <SalonInlineCta label="Request a Demo" topic="Salon Workflow Walkthrough" />
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 9 — HOW TO CHOOSE SALON MANAGEMENT SOFTWARE       */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-24 bg-white border-y border-[#AF6D7B]/15">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                BUYING GUIDE
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                How to Choose Salon Management Software
              </h2>
              <div className="mt-4 space-y-2 text-base sm:text-lg text-[#553B4B] leading-relaxed">
                <p>
                  The right software depends on the way your salon works.
                </p>
                <p>
                  A large salon chain may need advanced inventory, payroll, and reporting features. A small appointment-based salon may benefit most from accurate scheduling, clear services, and a booking page customers can use easily.
                </p>
                <p className="font-semibold text-[#27232B]">
                  Before choosing a system, consider the following questions.
                </p>
              </div>
            </div>

            {/* Checklist of features a small salon actually needs */}
            <div className="rounded-3xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-6 sm:p-10 mb-10 shadow-xs">
              <h3 className="text-2xl font-semibold text-[#27232B] mb-6 flex items-center gap-2.5">
                <CheckCircle2 className="h-6 w-6 text-[#AF6D7B]" />
                <span>What Features Does a Small Salon Actually Need?</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Online booking:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Can clients choose services and reserve available times without calling?
                  </p>
                </div>

                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Staff availability:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Does the software respect individual working hours and appointments?
                  </p>
                </div>

                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Service settings:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Can you specify accurate service durations and prices?
                  </p>
                </div>

                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Appointment management:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Can staff find and review booking details easily?
                  </p>
                </div>

                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Mobile usability:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Can customers comfortably book from a phone?
                  </p>
                </div>

                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Customer information:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Are the details needed to manage bookings stored in an organized way?
                  </p>
                </div>

                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Booking conflicts:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Does the system protect against overlapping appointments?
                  </p>
                </div>

                <div className="rounded-2xl border border-[#AF6D7B]/15 bg-white p-4.5 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
                  <p className="font-semibold text-[#27232B] text-sm mb-1">Pricing and support:</p>
                  <p className="text-xs text-[#553B4B] leading-relaxed">
                    Are costs, onboarding requirements, and available support clearly explained?
                  </p>
                </div>
              </div>
            </div>

            {/* Questions to ask */}
            <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-10 shadow-xs space-y-4 text-[#553B4B] leading-relaxed">
              <h3 className="text-2xl font-semibold text-[#27232B] mb-2 flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-[#AF6D7B]" />
                <span>Questions to Ask Before Choosing Software</span>
              </h3>
              <p>
                Before committing to a platform, ask for a working demonstration of the booking process.
              </p>
              <p>
                Try a typical service appointment, select a stylist, and check how the booking appears on the salon calendar.
              </p>
              <p>
                Also ask which advanced features are included today and which require separate tools.
              </p>
              <p className="font-semibold text-[#27232B] border-l-4 border-[#AF6D7B] pl-3.5 py-1 bg-[#FBF6F3] rounded-r-xl">
                A focused, dependable booking system may be a better fit for a small salon than a larger product with features the team will rarely use.
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 10 — WHAT ABOUT AI-POWERED SALON BOOKING?         */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-20 bg-[#FBF6F3]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-white border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                AI &amp; INNOVATION
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-[#27232B]">
                What About AI-Powered Salon Booking?
              </h2>
            </div>

            <div className="rounded-3xl border border-[#AF6D7B]/20 bg-white p-6 sm:p-10 shadow-xs space-y-5 text-base sm:text-lg text-[#553B4B] leading-relaxed">
              <p>
                AI can make salon booking conversations more natural.
              </p>
              <p>
                Instead of navigating a sequence of forms, a customer may want to ask about services, prices, available stylists, and appointment times in everyday language.
              </p>

              {/* Simulated Conversational Preview Card */}
              <div className="rounded-2xl border border-[#AF6D7B]/20 bg-[#FBF6F3] p-4.5 space-y-3 shadow-2xs my-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#AF6D7B]/15 text-xs font-semibold text-[#27232B]">
                  <Bot className="h-4 w-4 text-[#AF6D7B]" />
                  <span>Conversational Salon Assistant Preview</span>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-none bg-white border border-[#AF6D7B]/20 px-3.5 py-2 text-xs text-[#27232B] max-w-[80%] shadow-2xs">
                    Can I book a haircut with Elena tomorrow afternoon around 3:00 PM?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-[#27232B] text-white px-3.5 py-2 text-xs max-w-[85%] shadow-2xs">
                    Elena has an open slot at <strong>3:15 PM tomorrow</strong> for a Classic Haircut (35 mins). Would you like me to hold that for you?
                  </div>
                </div>
              </div>

              <p>
                Bookzello is developing an AI-assisted receptionist experience designed to work with the same salon information and booking rules as the standard booking system.
              </p>
              <p>
                The conversational booking workflow has been tested in a controlled environment. Wider availability is still being prepared.
              </p>
              <p className="font-semibold text-[#27232B] border-l-4 border-[#AF6D7B] pl-3.5 py-1 bg-[#FBF6F3] rounded-r-xl">
                For now, the standard booking experience remains the dependable way to explore Bookzello&apos;s appointment system.
              </p>

              {/* CTA: Replaced with safe Request a Demo flow */}
              <div className="pt-4 text-center">
                <SalonInlineCta label="Request a Demo" topic="AI Salon Receptionist Demo" />
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 11 — FREQUENTLY ASKED QUESTIONS                   */}
        {/* ========================================================= */}
        <section id="faq" className="w-full py-16 sm:py-24 bg-white border-t border-[#AF6D7B]/15">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/25 px-3.5 py-1 rounded-full shadow-2xs">
                COMMON QUESTIONS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#27232B]">
                Frequently Asked Questions About Hair Salon Management Software
              </h2>
            </div>

            <FaqAccordion items={faqData} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 12 — FINAL CONVERSION CTA BANNER                  */}
        {/* ========================================================= */}
        <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#FBF6F3]">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#27232B] via-[#3E2B3A] to-[#553B4B] p-8 sm:p-14 lg:p-16 text-center text-white shadow-xl shadow-[#553B4B]/20 relative">
            {/* Ambient pattern */}
            <div 
              className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#EBC9C5]/10 blur-2xl pointer-events-none" 
              aria-hidden="true" 
            />
            <div 
              className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#AF6D7B]/15 blur-2xl pointer-events-none" 
              aria-hidden="true" 
            />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-tight">
                Make Managing Your Salon Appointments Simpler
              </h2>

              <p className="text-base sm:text-lg text-[#FBF6F3]/90 max-w-2xl mx-auto leading-relaxed">
                Your team should be able to see what&apos;s booked, understand who&apos;s available, and keep appointment details organized without unnecessary confusion.
              </p>

              <p className="text-base text-[#FBF6F3]/90 max-w-2xl mx-auto leading-relaxed">
                Bookzello brings essential booking, scheduling, and customer appointment workflows together in a system built for salon businesses.
              </p>

              <p className="text-base text-[#FBF6F3]/90 max-w-2xl mx-auto leading-relaxed">
                Explore the booking experience and see whether it fits the way your salon works.
              </p>

              {/* CTAs: Primary replaced with Request a Demo flow */}
              <div className="pt-2 flex justify-center">
                <SalonBannerCta label="Request a Demo" topic="Salon Management System Consultation" />
              </div>

              {/* Microcopy footnote */}
              <p className="text-xs text-[#EBC9C5]/80 italic pt-2">
                Bookzello — simpler booking for busy salon teams.
              </p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
