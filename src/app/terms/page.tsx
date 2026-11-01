import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout, type TocItem } from "@/components/legal/legal-page-layout";
import { CheckCircle2, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Conditions | Bookzello",
  description:
    "Read the terms, conditions, and operational policies governing the use of Bookzello's salon booking engine, AI receptionist, and software platform.",
  alternates: {
    canonical: "https://bookzello.com/terms",
  },
  openGraph: {
    title: "Terms and Conditions | Bookzello",
    description:
      "Clear, transparent SaaS terms and conditions for Bookzello salon booking and AI receptionist software.",
    url: "https://bookzello.com/terms",
    siteName: "Bookzello",
    locale: "en_GB",
    type: "article",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const tableOfContents: TocItem[] = [
  { id: "acceptance", title: "Acceptance of Terms & Eligibility" },
  { id: "service-description", title: "Description of the Bookzello Service" },
  { id: "accounts-security", title: "Salon Accounts & Administrative Security" },
  { id: "salon-responsibilities", title: "Salon Responsibilities & Content Accuracy" },
  { id: "booking-rules", title: "Customer Booking, Rescheduling & Cancellation" },
  { id: "ai-limitations", title: "AI Receptionist Capabilities & Limitations" },
  { id: "whatsapp-terms", title: "WhatsApp Business Platform Messaging Terms" },
  { id: "data-ownership", title: "Salon Data Ownership & Platform License" },
  { id: "prohibited-activities", title: "Prohibited Uses & System Abuse" },
  { id: "fees-subscriptions", title: "Fees, Subscriptions & Commercial Evaluation" },
  { id: "third-party-services", title: "Third-Party Services & Platform Dependencies" },
  { id: "intellectual-property", title: "Bookzello Intellectual Property" },
  { id: "modifications-suspension", title: "Service Modifications, Suspension & Termination" },
  { id: "disclaimers", title: "Disclaimer of Warranties" },
  { id: "limitation-liability", title: "Limitation of Liability" },
  { id: "governing-law", title: "Governing Law & Legal Review Marker" },
  { id: "contact-terms", title: "Inquiries & Notices" },
];

export default function TermsAndConditionsPage() {
  return (
    <LegalPageLayout
      title="Bookzello Terms and Conditions"
      badge="Service Agreement"
      effectiveDate="October 31, 2026"
      lastUpdated="October 31, 2026"
      tableOfContents={tableOfContents}
      summary={
        <div className="space-y-2">
          <p>
            These Terms and Conditions govern access to and use of <strong>Bookzello</strong>, an AI-powered salon booking and appointment management software platform.
          </p>
          <p>
            <strong>Key takeaway:</strong> Bookzello provides technical infrastructure for salons to manage appointments and automate client inquiries. Salons remain entirely responsible for their services, accurate pricing, client relationships, and compliance with local business laws.
          </p>
        </div>
      }
    >
      {/* 1. Acceptance */}
      <section id="acceptance" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">1.</span> Acceptance of Terms &amp; Eligibility
        </h2>
        <p>
          By creating a Bookzello account, embedding our booking widget on a website, scheduling an appointment through our public booking interface, or sending messages to an automated receptionist powered by Bookzello, you agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;) and our{" "}
          <Link href="/privacy" className="text-[#1852E8] underline hover:opacity-85 font-medium">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          To create an administrative salon account or manage an organization workspace, you must be at least 18 years of age and possess the legal authority to bind the salon or commercial enterprise you represent. If you do not agree to these Terms, you must not access or use Bookzello.
        </p>
      </section>

      {/* 2. Service Description */}
      <section id="service-description" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">2.</span> Description of the Bookzello Service
        </h2>
        <p>
          Bookzello provides multi-tenant cloud software for independent service businesses, with a focus on hair salons, barbershops, and beauty studios. The platform includes:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Deterministic Booking Engine:</strong> Real-time scheduling that validates salon working hours, staff shifts, service durations, buffer times, and prevents concurrent double-booking conflicts via atomic database constraints.</li>
          <li><strong>Public Salon Booking Pages:</strong> Mobile-responsive online booking portals where clients can select services, view open slots, and confirm appointments.</li>
          <li><strong>Embeddable Website Chat Receptionist:</strong> An embeddable iframe widget allowing salon website visitors to ask questions, explore services, and draft appointments via conversational AI.</li>
          <li><strong>WhatsApp Business Platform Gateway (Pilot):</strong> Integration capabilities connecting salon numbers to the Meta WhatsApp Cloud API for automated booking support.</li>
          <li><strong>Transactional Notifications:</strong> Automated email confirmations, management links, and rescheduling receipts.</li>
        </ul>
      </section>

      {/* 3. Accounts & Security */}
      <section id="accounts-security" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">3.</span> Salon Accounts &amp; Administrative Security
        </h2>
        <p>
          When registering a salon organization, you agree to:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li>Provide accurate, current, and complete registration information.</li>
          <li>Maintain the confidentiality of administrative credentials and passwords.</li>
          <li>Restrict dashboard access to authorized personnel and ensure staff roles reflect genuine organizational permissions.</li>
          <li>Promptly notify Bookzello at <a href="mailto:support@bookzello.com" className="text-[#1852E8] underline">support@bookzello.com</a> if you discover any unauthorized use of your account or security breach.</li>
        </ul>
        <p className="text-sm text-slate-600">
          Bookzello is not liable for any loss or damage arising from your failure to maintain account security or unauthorized actions taken using your administrative credentials.
        </p>
      </section>

      {/* 4. Salon Responsibilities */}
      <section id="salon-responsibilities" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">4.</span> Salon Responsibilities &amp; Content Accuracy
        </h2>
        <p>
          Each salon operates as an independent business. The salon owner retains sole responsibility for:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
          <li>
            <strong>Accurate Service Details &amp; Pricing:</strong> Ensuring that all service descriptions, durations, and prices displayed in Bookzello accurately reflect what the salon charges clients.
          </li>
          <li>
            <strong>Staff Availability &amp; Operating Hours:</strong> Keeping staff shifts, working hours, break schedules, and holiday closures up to date to prevent scheduling clients during unavailable times.
          </li>
          <li>
            <strong>Fulfillment of Booked Services:</strong> Providing the booked beauty or grooming services to clients at the scheduled appointment time. Bookzello is not an employer, contractor, or agent of any salon or service provider.
          </li>
          <li>
            <strong>Lawful Client Communications:</strong> Ensuring that contact information collected from clients is utilized strictly in compliance with applicable consumer protection and privacy laws.
          </li>
        </ul>
      </section>

      {/* 5. Customer Booking Rules */}
      <section id="booking-rules" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">5.</span> Customer Booking, Rescheduling &amp; Cancellation
        </h2>
        <p>
          Clients booking appointments through Bookzello agree to provide authentic contact information (valid name, phone number, and/or email address) and to attend scheduled appointments on time:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
          <li>
            <strong>Secure Management Tokens:</strong> Bookzello issues an unguessable booking token with each confirmed appointment. This token allows the customer to view, reschedule, or cancel their appointment directly through the online portal up to the salon&rsquo;s cutoff window.
          </li>
          <li>
            <strong>Salon Cancellation Policies:</strong> Cancellation windows, late-arrival rules, and any applicable no-show fees are determined exclusively by the respective salon. Bookzello does not collect cancellation fees or manage client deposit refunds.
          </li>
          <li>
            <strong>Immediate Availability Recalculation:</strong> When an appointment is rescheduled or cancelled, the released time slot is immediately returned to real-time inventory and made available for other clients.
          </li>
        </ul>
      </section>

      {/* 6. AI Receptionist Limitations */}
      <section id="ai-limitations" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">6.</span> AI Receptionist Capabilities &amp; Limitations
        </h2>
        <p>
          Bookzello features an automated AI receptionist designed to streamline customer communication and booking intake. Salon operators and clients acknowledge the following operational boundaries:
        </p>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs sm:text-sm text-slate-700 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#040F28]">
            <CheckCircle2 className="h-4 w-4 text-[#1852E8]" /> Core AI Safety Guarantees:
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm">
            <li>The AI assistant does not invent availability, prices, or policies; all operational data is queried from deterministic server tools.</li>
            <li>The AI assistant cannot unilaterally commit an appointment without explicit customer confirmation of the booking summary.</li>
            <li>Final reservation commits occur through atomic server-side transactions with real-time concurrency re-checks.</li>
          </ul>
        </div>
        <p className="text-sm text-slate-600">
          <strong>Natural Language Caveats:</strong> While designed for high accuracy, automated conversational systems may occasionally misinterpret ambiguous phrasing, colloquialisms, or complex special requests. Salon owners must review automated drafts and maintain oversight of their booking records.
        </p>
      </section>

      {/* 7. WhatsApp Terms */}
      <section id="whatsapp-terms" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">7.</span> WhatsApp Business Platform Messaging Terms
        </h2>
        <p>
          When utilizing Bookzello&rsquo;s WhatsApp Business integration features (where activated):
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
          <li>
            <strong>Meta Policy Compliance:</strong> Salons must strictly adhere to Meta&rsquo;s WhatsApp Business Messaging Policies, Commerce Policy, and Terms of Service.
          </li>
          <li>
            <strong>Opt-In &amp; Unsolicited Messaging:</strong> Salons must never use Bookzello to send unsolicited promotional spam, cold messages, or harassment. Outbound automated messages are permitted only for transactional appointment updates or in direct response to user-initiated inquiries within Meta&rsquo;s customer service window.
          </li>
          <li>
            <strong>Controlled Pilot Restrictions:</strong> During developer evaluation and pilot validation, WhatsApp features operate under restricted safety toggles (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">WHATSAPP_ENABLED=false</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">WHATSAPP_OUTBOUND_ENABLED=false</code>) and test allowlists.
          </li>
        </ul>
      </section>

      {/* 8. Data Ownership */}
      <section id="data-ownership" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">8.</span> Salon Data Ownership &amp; Platform License
        </h2>
        <p>
          <strong>Your Data:</strong> As between Bookzello and the salon, the salon retains all rights, title, and interest in and to its salon profile, staff records, service catalog, and customer appointment directory (&ldquo;Salon Data&rdquo;).
        </p>
        <p>
          <strong>License to Bookzello:</strong> The salon grants Bookzello a non-exclusive, worldwide, royalty-free license to host, copy, process, and transmit Salon Data solely as necessary to operate, maintain, and provide the Bookzello platform, deliver client notifications, and execute AI receptionist tools. Bookzello does not sell Salon Data or customer contact details to third parties.
        </p>
      </section>

      {/* 9. Prohibited Activities */}
      <section id="prohibited-activities" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">9.</span> Prohibited Uses &amp; System Abuse
        </h2>
        <p>You agree not to engage in any of the following prohibited activities:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li>Attempting to bypass, manipulate, or violate multi-tenant isolation, database Row Level Security policies, or authentication barriers.</li>
          <li>Attempting prompt-injection attacks, jailbreaks, or adversarial inputs against the AI receptionist.</li>
          <li>Submitting fraudulent, automated, or scripted bookings intended to block salon calendar availability or exhaust staff schedules.</li>
          <li>Scraping, crawling, or extracting platform data, competitor pricing, or customer directories via automated scripts without written consent.</li>
          <li>Reverse engineering, decompiling, or creating derivative works based on the Bookzello software or proprietary scheduling algorithms.</li>
          <li>Transmitting malicious software, viruses, or disruptive network traffic.</li>
        </ul>
      </section>

      {/* 10. Fees & Subscriptions */}
      <section id="fees-subscriptions" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">10.</span> Fees, Subscriptions &amp; Commercial Evaluation
        </h2>
        <p>
          <strong>Current Development &amp; Evaluation Stage:</strong> As of the Effective Date of these Terms, Bookzello is operating in controlled release, university capstone demonstration, and sandbox evaluation. Access during this phase is provided under pilot terms.
        </p>
        <p>
          <strong>Future Commercial Subscriptions:</strong> Upon general commercial availability, Bookzello will offer subscription plans with transparent recurring software fees. Existing pilot participants will receive clear advance notice of pricing structures and billing terms prior to any chargeable billing activation.
        </p>
        <p className="text-xs text-slate-500 italic">
          *Client Deposits Notice: Customer payments for salon services and appointment deposits are independent transactions between the salon and client. Bookzello does not currently operate as a payment merchant of record or hold client funds.
        </p>
      </section>

      {/* 11. Third-Party Services */}
      <section id="third-party-services" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">11.</span> Third-Party Services &amp; Platform Dependencies
        </h2>
        <p>
          Bookzello relies on reputable cloud infrastructure providers, including Supabase (database &amp; auth), Vercel (hosting), OpenAI (language processing), Meta Platforms (WhatsApp messaging), Resend (transactional email), and Upstash (job queuing).
        </p>
        <p>
          While we architect our platform with fault-tolerant fallbacks (such as transactional outbox queuing and exponential backoff retry logic), Bookzello is not liable for service interruptions, delivery delays, or network failures caused directly by upstream third-party provider outages, internet service disruptions, or telecommunication carrier blocks.
        </p>
      </section>

      {/* 12. Intellectual Property */}
      <section id="intellectual-property" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">12.</span> Bookzello Intellectual Property
        </h2>
        <p>
          The Bookzello platform, including its source code, database architecture, user interface designs, logo, visual branding, domain name, and documentation, is the exclusive intellectual property of Bookzello and its licensors. Except for the limited right to access and use the platform in accordance with these Terms, nothing herein transfers or assigns any proprietary rights to any salon, user, or third party.
        </p>
      </section>

      {/* 13. Modifications & Termination */}
      <section id="modifications-suspension" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">13.</span> Service Modifications, Suspension &amp; Termination
        </h2>
        <p>
          We continually enhance the Bookzello software. We reserve the right to update, modify, or temporarily suspend features with reasonable notice where practical.
        </p>
        <p>
          Bookzello reserves the right to immediately suspend or terminate access to any account that violates these Terms, engages in fraudulent scheduling, abuses AI tools, or threatens platform security or the rights of other users.
        </p>
        <p>
          Salon owners may close their workspace and terminate their account at any time by contacting our support team or initiating a verified data deletion request.
        </p>
      </section>

      {/* 14. Disclaimers */}
      <section id="disclaimers" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">14.</span> Disclaimer of Warranties
        </h2>
        <p className="uppercase text-xs font-semibold text-slate-500 tracking-wider">
          Please read this section carefully as it limits our legal warranties.
        </p>
        <p className="text-slate-600 text-sm leading-relaxed">
          The Bookzello platform is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis, without warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, non-infringement, or uninterrupted operation.
        </p>
        <p className="text-slate-600 text-sm leading-relaxed">
          While we employ collision-resistant concurrency guards and high-availability architecture, Bookzello does not warrant that the service will be entirely error-free, that scheduling conflicts caused by manual external overrides will never occur, or that notifications sent via third-party telecom carriers will always arrive without delay.
        </p>
      </section>

      {/* 15. Limitation of Liability */}
      <section id="limitation-liability" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">15.</span> Limitation of Liability
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          To the maximum extent permitted by applicable law, in no event shall Bookzello, its creators, directors, employees, or infrastructure partners be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, loss of salon revenue, loss of business goodwill, data loss, or client no-show costs, arising out of or related to your use of or inability to use the platform.
        </p>
        <p className="text-slate-600 text-sm leading-relaxed">
          To the extent permitted by law, Bookzello&rsquo;s total aggregate liability for all claims arising out of these Terms or the software shall not exceed the greater of: (a) fifty pounds sterling (£50.00 GBP), or (b) the total fees paid by the salon to Bookzello during the twelve (12) months immediately preceding the event giving rise to liability.
        </p>
      </section>

      {/* 16. Governing Law */}
      <section id="governing-law" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">16.</span> Governing Law &amp; Legal Review Marker
        </h2>
        <p>
          These Terms are governed by and construed in accordance with the laws applicable to modern online software operations. If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of the remaining provisions.
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Legal Review Placeholder for Platform Operator:</p>
          <p className="mt-1 leading-relaxed">
            Specific governing jurisdiction, choice of law courts, and formal arbitration options will be finalized upon corporate incorporation by the platform owner. In the interim, disputes shall be addressed through good-faith informal consultation.
          </p>
        </div>
      </section>

      {/* 17. Contact Information */}
      <section id="contact-terms" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">17.</span> Inquiries &amp; Notices
        </h2>
        <p>
          For any questions regarding these Terms, salon service agreements, or platform policies, please contact:
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Mail className="h-4 w-4 text-[#1852E8]" /> Bookzello Legal &amp; Support Team
          </div>
          <p className="text-slate-600">
            <strong>Email:</strong>{" "}
            <a href="mailto:support@bookzello.com" className="text-[#1852E8] underline hover:opacity-85">
              support@bookzello.com
            </a>
          </p>
          <p className="text-slate-600">
            <strong>Website:</strong>{" "}
            <Link href="https://bookzello.com" className="text-[#1852E8] underline hover:opacity-85">
              https://bookzello.com
            </Link>
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
