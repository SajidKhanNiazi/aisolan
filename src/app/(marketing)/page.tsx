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
  Smartphone
} from "lucide-react";
import { ProductIllustration } from "@/components/marketing/product-illustration";
import { HeroCta, ActionBannerCta, AiReceptionistCta } from "@/components/marketing/cta-buttons";
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
    id: "what-is-salon-booking-software",
    question: "What is salon booking software?",
    answer: "Salon booking software helps appointment-based businesses offer online booking and organize reservations. Depending on the product, it may also manage staff availability, service duration, client details and appointment changes."
  },
  {
    id: "how-does-online-salon-booking-work",
    question: "How does online salon booking work with Bookzello?",
    answer: "A client selects a service, chooses an available staff member or time and completes the booking flow. The appointment is then recorded in the salon's booking system for staff to manage."
  },
  {
    id: "can-salon-manage-more-than-one-staff",
    question: "Can a salon manage more than one staff member?",
    answer: "Bookzello supports staff-specific schedules and availability, which helps teams coordinate appointments without treating every stylist's calendar as identical."
  },
  {
    id: "does-bookzello-prevent-double-bookings",
    question: "Does Bookzello help prevent double bookings?",
    answer: "Its booking engine checks appointment time conflicts during confirmation so overlapping reservations are not intentionally accepted for the same occupied resource. Actual configuration and service rules still matter."
  },
  {
    id: "is-bookzello-only-for-hair-salons",
    question: "Is Bookzello only for hair salons?",
    answer: "No. The booking workflow can be relevant to barbershops and other beauty businesses that schedule services by time and staff availability. Industry-specific requirements should be confirmed before adopting it."
  },
  {
    id: "does-bookzello-offer-ai-receptionist",
    question: "Does Bookzello offer an AI receptionist?",
    answer: "Bookzello is developing an AI receptionist connected to its scheduling and availability tools. Broader availability is pending final provider and production validation. The standard online booking flow is the currently validated booking path."
  },
  {
    id: "can-i-see-system-before-deciding",
    question: "Can I see how the system works before deciding?",
    answer: "Yes. Explore the available booking demonstration, or request a guided walkthrough of the salon dashboard."
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
        "description": "Salon booking software for hair and beauty businesses.",
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

      <div className="flex flex-col items-center justify-center w-full bg-[#FBFAF8] text-[#142B43] selection:bg-[#E6F5F4] selection:text-[#0A8F87]">
        {/* HERO SECTION */}
        <section className="w-full py-12 sm:py-16 lg:py-24 border-b border-[#E8E6DF] bg-gradient-to-b from-[#FBFAF8] via-white to-[#FBFAF8]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-left">
                {/* Top eyebrow */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0A8F87]/25 bg-[#E6F5F4] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#0A8F87]">
                  <Scissors className="h-3.5 w-3.5" />
                  <span>ONLINE BOOKING FOR SALONS &amp; BARBERSHOPS</span>
                </div>

                {/* Primary SEO H1 */}
                <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-[#142B43] leading-[1.12]">
                  Salon Booking Software That Makes Every Appointment Easier
                </h1>

                {/* Body paragraph */}
                <p className="text-base sm:text-lg text-[#334E68] leading-relaxed max-w-2xl">
                  Give clients a simple way to book online while you keep services, staff availability and appointments organized in one clear calendar. Bookzello helps hair and beauty businesses spend less time coordinating bookings and more time looking after clients.
                </p>

                {/* Primary & Secondary CTAs */}
                <HeroCta 
                  primaryLabel="Explore the Booking Demo" 
                  secondaryLabel="Request a Demo" 
                  demoUrl="/booking/bookpilot-qa-salon" 
                />

                {/* Microcopy */}
                <p className="text-xs text-[#627D98] pt-1">
                  Built for independent salon owners and growing teams. No complicated setup to understand the basics.
                </p>
              </div>

              {/* Right Column: Hero Product Preview */}
              <div className="lg:col-span-5 w-full">
                <ProductIllustration
                  variant="hero-dashboard"
                  caption="Your salon schedule, at a glance. See staff availability, upcoming bookings and appointment details in one place."
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: PAIN POINTS & VALUE */}
        <section id="features" className="w-full py-16 sm:py-20 lg:py-24 bg-white border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                Tired of Managing Appointments Across Calls, Messages and Notes?
              </h2>
              <p className="mt-4 text-base text-[#334E68] leading-relaxed">
                A full day at the salon is busy enough. When appointment requests arrive from several places, it is easy to lose track of who is booked, which stylist is free and how much time a service needs.
              </p>
              <p className="mt-2 text-base font-semibold text-[#0A8F87]">
                Bookzello gives your team a shared booking workflow instead of another messy list.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-7 soft-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F5F4] text-[#0A8F87] mb-5">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#142B43] mb-2.5">
                  Give Clients a Clear Way to Book
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Clients can choose a service, select a team member when applicable, pick an available time and submit their booking using a guided online flow.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-7 soft-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F5F4] text-[#0A8F87] mb-5">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#142B43] mb-2.5">
                  Keep Your Calendar Up to Date
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  See appointments in the business dashboard so you can prepare for the day and find the right booking without searching through messages.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-7 soft-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F5F4] text-[#0A8F87] mb-5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#142B43] mb-2.5">
                  Let Availability Do the Checking
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Services, staff schedules and booked time are checked by the booking system to help prevent overlapping confirmed appointments.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: STEP-BY-STEP CUSTOMER & STAFF FLOW */}
        <section id="how-it-works" className="w-full py-16 sm:py-20 lg:py-24 bg-[#FBFAF8] border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                Online Salon Booking Software for Clients and Staff
              </h2>
              <p className="mt-4 text-base text-[#334E68] leading-relaxed">
                Your clients want an easy booking experience. Your team needs accurate details. Bookzello connects the two through the same appointment system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 soft-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A8F87] text-white text-xs font-bold">1</span>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">Service</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#142B43] mb-2">
                    Step 1: Choose a Service
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    Clients see the services offered by your salon, with the information you provide for each appointment.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 soft-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A8F87] text-white text-xs font-bold">2</span>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">Availability</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#142B43] mb-2">
                    Step 2: Pick a Staff Member and Time
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    Available appointment times reflect the selected service and the working schedule of the chosen team member.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 soft-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A8F87] text-white text-xs font-bold">3</span>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">Reservation</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#142B43] mb-2">
                    Step 3: Complete the Booking
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    The booking flow records the customer and appointment details, then shows the reservation outcome.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 soft-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A8F87] text-white text-xs font-bold">4</span>
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">Dashboard</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#142B43] mb-2">
                    Step 4: Manage the Appointment
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    Your salon team can view the booking in the dashboard and manage the schedule from a central workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/booking/bookpilot-qa-salon"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0A8F87] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#086F69] focus:outline-none focus:ring-2 focus:ring-[#0A8F87] transition-all"
              >
                <span>See How Online Booking Works</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 4: SCHEDULING ENGINE THAT FITS YOUR TEAM */}
        <section className="w-full py-16 sm:py-20 lg:py-24 bg-white border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">
                    Staff &amp; Service Scheduling
                  </span>
                  <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                    Salon Appointment Scheduling Software That Fits Your Team
                  </h2>
                </div>

                <p className="text-base text-[#334E68] leading-relaxed">
                  Whether you work alone or coordinate multiple stylists, a reliable calendar makes the day easier to plan. Set up your services and team schedules, then review appointments from one workspace.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="rounded-xl border border-[#E8E6DF] bg-[#FBFAF8] p-5">
                    <h3 className="text-base font-bold text-[#142B43] mb-1.5 flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#0A8F87]" />
                      <span>Organize Staff Availability</span>
                    </h3>
                    <p className="text-sm text-[#334E68] leading-relaxed">
                      Work with staff-specific schedules, breaks and availability so your booking flow reflects who can perform a service and when.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E8E6DF] bg-[#FBFAF8] p-5">
                    <h3 className="text-base font-bold text-[#142B43] mb-1.5 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#0A8F87]" />
                      <span>Plan for Service Duration</span>
                    </h3>
                    <p className="text-sm text-[#334E68] leading-relaxed">
                      Set the time needed for different services. The booking system accounts for duration and configured buffers when presenting available slots.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E8E6DF] bg-[#FBFAF8] p-5">
                    <h3 className="text-base font-bold text-[#142B43] mb-1.5 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#0A8F87]" />
                      <span>Reduce Scheduling Conflicts</span>
                    </h3>
                    <p className="text-sm text-[#334E68] leading-relaxed">
                      A booking should not occupy a time another confirmed appointment already needs. Bookzello&apos;s appointment engine checks conflicting time windows during confirmation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 w-full space-y-4">
                <ProductIllustration
                  variant="staff-calendar"
                  caption="Configure stylist shifts, break periods and service capabilities directly in the team schedule."
                />
                <ProductIllustration
                  variant="service-selection"
                  caption="Define appointment durations and cleanup buffers so appointments never collide."
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: ONE SALON BOOKING DASHBOARD */}
        <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#FBFAF8] border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">
                Unified Workspace
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                One Salon Booking Dashboard, Less Guesswork
              </h2>
              <p className="mt-4 text-base text-[#334E68] leading-relaxed">
                Stop switching between separate lists to answer everyday questions: Who is booked next? Which service is scheduled? What does the team need to prepare?
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 soft-card">
                  <h3 className="text-lg font-bold text-[#142B43] mb-2">
                    See Today&apos;s Appointments
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    Review appointment times, customer names, services and assigned staff from the schedule.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 soft-card">
                  <h3 className="text-lg font-bold text-[#142B43] mb-2">
                    Keep Customer Details Connected
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    Access customer details associated with appointments without relying on handwritten notes or scattered chat threads.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6 soft-card">
                  <h3 className="text-lg font-bold text-[#142B43] mb-2">
                    Handle Changes in One Place
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    Use the available appointment-management actions in the dashboard to keep the schedule consistent when plans change.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-8 w-full">
                <ProductIllustration
                  variant="customer-booking"
                  caption="Bookzello appointment dashboard showing real service, staff and calendar information from a safe demo account."
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: WHO IT'S FOR */}
        <section id="who-its-for" className="w-full py-16 sm:py-20 lg:py-24 bg-white border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">
                Appointment-Based Services
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                Built for Hair Salons, Barbershops and Beauty Teams
              </h2>
              <p className="mt-4 text-base text-[#334E68] leading-relaxed">
                Bookzello is designed around a simple need shared by appointment-led businesses: make it easy to reserve time and easy for staff to manage it.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-7 soft-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6F5F4] text-[#0A8F87] mb-5">
                  <Scissors className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[#142B43] mb-2.5">
                  Hair Salons
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Organize haircuts, styling and other time-based services with the right team member and appointment duration.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-7 soft-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6F5F4] text-[#0A8F87] mb-5">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[#142B43] mb-2.5">
                  Barbershops
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Let customers choose a grooming service and available barber while keeping the daily shop schedule clear.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-7 soft-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6F5F4] text-[#0A8F87] mb-5">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[#142B43] mb-2.5">
                  Nail and Beauty Studios
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Create bookable treatments and manage available time for individual practitioners or small teams.
                </p>
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-[#627D98] max-w-2xl mx-auto italic">
              These are workflow examples, not claims of fully customized vertical integrations. Link each industry only once its dedicated page exists.
            </p>
          </div>
        </section>

        {/* SECTION 7: AI RECEPTIONIST (HONEST SUPPORTING SECTION) */}
        <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#F4F2EC]/60 border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 sm:p-12 soft-card-elevated">
              <div className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0A8F87]/25 bg-[#E6F5F4] px-3 py-1 text-xs font-semibold text-[#0A8F87] mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Conversational Booking Technology</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                  An AI-Ready Salon Booking System, Built Around Real Availability
                </h2>
                <p className="mt-4 text-base text-[#334E68] leading-relaxed">
                  AI can make asking about appointments feel more natural. Accuracy still matters most: a booking assistant should use the salon&apos;s actual services, prices, staff and available times—not invent an opening.
                </p>
                <p className="mt-3 text-base text-[#334E68] leading-relaxed">
                  Bookzello&apos;s conversational booking workflow has been tested against its booking engine. <strong className="text-[#142B43] font-semibold">Real-model AI receptionist access is being prepared for rollout</strong> and is not yet presented as a generally available feature.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="rounded-xl border border-[#E8E6DF] bg-[#FBFAF8] p-5">
                  <h3 className="text-base font-bold text-[#142B43] mb-2">
                    A Conversational Way to Ask About Bookings
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    The AI receptionist is being developed to help customers ask about services and appointment times in everyday language.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E8E6DF] bg-[#FBFAF8] p-5">
                  <h3 className="text-base font-bold text-[#142B43] mb-2">
                    The Booking Engine Remains in Control
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    Appointment availability and final booking rules come from Bookzello&apos;s backend rather than the assistant making guesses.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E8E6DF] bg-[#FBFAF8] p-5">
                  <h3 className="text-base font-bold text-[#142B43] mb-2">
                    Introduced Carefully, Not Overpromised
                  </h3>
                  <p className="text-sm text-[#334E68] leading-relaxed">
                    AI-assisted booking will become available to customers when provider, usability and production safety testing is complete.
                  </p>
                </div>
              </div>

              <div>
                <AiReceptionistCta label="Ask About AI Receptionist Availability" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: BUYER GUIDE */}
        <section className="w-full py-16 sm:py-20 lg:py-24 bg-white border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">
                Evaluation Guide
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                What to Look for in Salon Booking Software
              </h2>
              <p className="mt-4 text-base text-[#334E68] leading-relaxed">
                If you are comparing salon software, start with the everyday tasks that matter to your business. A useful booking system should be easy for clients and dependable for the people managing your calendar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-6 sm:p-7 soft-card">
                <h3 className="text-lg font-bold text-[#142B43] mb-2.5">
                  Can Clients Find an Available Time Easily?
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Look for a clear booking flow that shows real availability without making customers contact the salon to ask about each opening.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-6 sm:p-7 soft-card">
                <h3 className="text-lg font-bold text-[#142B43] mb-2.5">
                  Does It Support Your Staff and Services?
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Check whether the software can represent different service lengths, staff assignments, opening hours and schedule changes.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-6 sm:p-7 soft-card">
                <h3 className="text-lg font-bold text-[#142B43] mb-2.5">
                  Can Your Team Manage Confirmed Bookings?
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  Make sure there is a practical place to review appointments and identify the details needed to welcome each client.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E6DF] bg-[#FBFAF8] p-6 sm:p-7 soft-card">
                <h3 className="text-lg font-bold text-[#142B43] mb-2.5">
                  Can You Try the Booking Experience?
                </h3>
                <p className="text-sm text-[#334E68] leading-relaxed">
                  A realistic demonstration is more useful than a long features list. Try the client journey and see how an appointment appears in the business dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: SEE BOOKZELLO IN ACTION */}
        <section className="w-full py-16 sm:py-20 bg-[#FBFAF8] border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="rounded-3xl border border-[#E8E6DF] bg-white p-8 sm:p-12 soft-card">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">
                Live Product Demo
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                See Bookzello in Action
              </h2>
              <p className="mt-4 text-base text-[#334E68] leading-relaxed max-w-2xl mx-auto mb-8">
                The easiest way to understand the booking process is to walk through it yourself. Explore the guided customer booking flow or request a walkthrough of the business dashboard.
              </p>
              <ActionBannerCta
                primaryLabel="Explore the Booking Demo"
                secondaryLabel="Request a Demo"
                demoUrl="/booking/bookpilot-qa-salon"
              />
            </div>
          </div>
        </section>

        {/* SECTION 10: FAQ */}
        <section id="faq" className="w-full py-16 sm:py-20 lg:py-24 bg-white border-b border-[#E8E6DF]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#0A8F87]">
                Answers &amp; Details
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
                Frequently Asked Questions About Salon Booking Software
              </h2>
            </div>

            <FaqAccordion items={faqData} />
          </div>
        </section>

        {/* SECTION 11: FINAL CTA BANNER */}
        <section className="w-full py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#FBFAF8] via-[#F4F2EC]/50 to-[#FBFAF8]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#142B43]">
              Make Your Next Booking Simpler
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#334E68] leading-relaxed max-w-2xl mx-auto mb-8">
              Give customers a clearer way to reserve an appointment and give your team a calmer place to manage the day. Start by exploring how Bookzello&apos;s salon booking software works.
            </p>
            <ActionBannerCta
              primaryLabel="Explore the Booking Demo"
              secondaryLabel="Request a Demo"
              demoUrl="/booking/bookpilot-qa-salon"
            />
          </div>
        </section>
      </div>
    </>
  );
}
