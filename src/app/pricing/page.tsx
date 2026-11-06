import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Pricing & Plans",
  description:
    "Early Access — Pricing to Be Announced. Explore Bookzello salon booking software and AI receptionist capabilities.",
  alternates: {
    canonical: "https://bookzello.com/pricing",
  },
  openGraph: {
    title: "Pricing & Plans | Bookzello",
    description:
      "Early Access — Pricing to Be Announced. Explore Bookzello's modern salon booking software and deterministic AI receptionist.",
    url: "https://bookzello.com/pricing",
    siteName: "Bookzello",
    locale: "en_GB",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const earlyAccessFeatures = [
  "24/7 AI Receptionist website chat widget",
  "Universal 4-step mobile booking wizard",
  "Multi-staff calendar & shift management",
  "Deterministic collision prevention engine",
  "Automated email confirmations & receipts",
  "Self-service customer rescheduling & cancellations",
  "Booking policies: buffers, lead times, policies",
  "Unlimited salon services & categories",
  "Hosted public booking page with QR code",
];

const upcomingCommercialFeatures = [
  "Custom domain routing for booking pages",
  "Official WhatsApp Business Cloud API integration",
  "Multi-location organization management",
  "Advanced retention analytics & staff performance",
  "Optional external calendar two-way synchronization",
];

const pricingFaq = [
  {
    q: "What is Bookzello's current pricing?",
    a: "Early Access — Pricing to Be Announced. Bookzello is currently running an active evaluation pilot. Pricing details will be announced prior to general commercial release.",
  },
  {
    q: "How can my salon evaluate Bookzello?",
    a: "You can test-drive our interactive demo salon or request an early access walkthrough to see our collision-free booking wizard and AI receptionist in action.",
  },
  {
    q: "What happens when commercial subscriptions launch?",
    a: "When paid plans become commercially available, existing pilot salons will receive at least 30 days of advance notice with transparent pricing options. No automatic charges will ever occur.",
  },
  {
    q: "How does Bookzello differ from generic chat tools?",
    a: "Bookzello features a deterministic backend engine. The AI receptionist cannot guess availability, alter pricing, or double-book your calendar; every slot is verified against your live database.",
  },
];

export default function PricingPage() {
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
        "publisher": {
          "@id": "https://bookzello.com/#organization"
        }
      },
      {
        "@type": "WebPage",
        "@id": "https://bookzello.com/pricing#webpage",
        "url": "https://bookzello.com/pricing",
        "name": "Bookzello Pricing & Plans",
        "description": "Early Access — Pricing to Be Announced. Explore Bookzello salon booking software and AI receptionist capabilities.",
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
          "@id": "https://bookzello.com/pricing#breadcrumb"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://bookzello.com/pricing#breadcrumb",
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
            "name": "Pricing & Plans",
            "item": "https://bookzello.com/pricing"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://bookzello.com/pricing#faq",
        "mainEntity": pricingFaq.map((faq) => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
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

      <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-700">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-100 bg-gradient-to-b from-blue-50/40 via-white to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1852E8] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#1852E8]" />
              <span>EARLY ACCESS PROGRAM</span>
            </div>

            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950">
              Modern Booking &amp; AI Reception <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#1852E8] to-[#00D2FF] bg-clip-text text-transparent">
                Built for Independent Salons
              </span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Bookzello helps you fill empty chairs and eliminate double-bookings with a deterministic booking core and 24/7 AI receptionist.
            </p>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="py-16 sm:py-20 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Early Access Pilot Tier (Active) */}
              <div className="relative rounded-3xl border-2 border-blue-600 bg-white p-8 sm:p-10 shadow-xl shadow-blue-500/10 flex flex-col justify-between">
                <div className="absolute -top-4 left-8">
                  <Badge className="bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-3 py-1 shadow-sm">
                    Currently In Pilot
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-950">Early Access</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        For independent barbershops, hair studios, and solo stylists.
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                      <Zap className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-950">
                      Early Access — Pricing to Be Announced
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Commercial pricing structure will be published prior to general release.
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Full access to core scheduling capabilities during pilot
                  </p>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
                      Everything Included in Early Access:
                    </p>
                    <ul className="space-y-3 text-sm text-slate-600">
                      {earlyAccessFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                  <Link
                    href="/booking/bookpilot-qa-salon"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-[#1852E8] to-[#0091FF] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] transition-all"
                  >
                    <span>Explore Live Salon Demo</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <p className="text-center text-[11px] text-slate-400">
                    Interact directly with our live booking flow and AI chat receptionist.
                  </p>
                </div>
              </div>

              {/* Commercial Pro Plan (Pending) */}
              <div className="relative rounded-3xl border border-slate-200 bg-white/80 p-8 sm:p-10 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-950">Commercial Tiers</h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Upcoming plans for growing multi-chair salons and multi-location groups.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold py-1">
                      Pending Launch
                    </Badge>
                  </div>

                  <div className="mt-6 flex flex-col gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-700">Commercial Release</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Tiered subscription pricing will be announced with 30 days notice to pilot salons.
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Commercial checkout and billing collection are currently locked.
                  </p>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
                      Planned Commercial Capabilities:
                    </p>
                    <ul className="space-y-3 text-sm text-slate-600">
                      {upcomingCommercialFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="h-3 w-3" />
                          </div>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-600">
                      Subscriptions and checkout functionality are not active. Salons interested in evaluating Bookzello can explore our interactive demo or request an early access walkthrough.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing FAQ Section */}
        <section className="py-16 sm:py-24 border-t border-slate-100">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs uppercase tracking-wider font-bold text-[#1852E8] bg-blue-50 px-3.5 py-1 rounded-full">
                COMMON QUESTIONS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
                Frequently Asked Pricing Questions
              </h2>
            </div>

            <div className="grid gap-6">
              {pricingFaq.map((item, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                  <h3 className="text-base font-bold text-slate-900">{item.q}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
