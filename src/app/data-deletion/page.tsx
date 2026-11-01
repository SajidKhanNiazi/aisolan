import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout, type TocItem } from "@/components/legal/legal-page-layout";
import { Trash2, UserCheck, ShieldAlert, Mail, Phone, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | Bookzello",
  description:
    "Step-by-step instructions for salon owners, clients, and WhatsApp users to request deletion of personal or booking data from Bookzello.",
  alternates: {
    canonical: "https://bookzello.com/data-deletion",
  },
  openGraph: {
    title: "Data Deletion Instructions | Bookzello",
    description:
      "Clear, verified instructions for requesting user and business data deletion from Bookzello.",
    url: "https://bookzello.com/data-deletion",
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
  { id: "overview", title: "Overview & Meta Compliance Commitment" },
  { id: "user-categories", title: "Who Can Request Deletion" },
  { id: "step-by-step", title: "Step-by-Step Deletion Process" },
  { id: "required-info", title: "Information Required for Verification" },
  { id: "security-warning", title: "Security Notice (What NOT to Send)" },
  { id: "processing-lifecycle", title: "How Requests Are Processed & Timelines" },
  { id: "whatsapp-specific", title: "WhatsApp & Meta Data Clarification" },
  { id: "retention-exceptions", title: "Operational & Statutory Retention Exceptions" },
  { id: "opt-out-alternatives", title: "Opt-Out Alternatives (Stop Reminders)" },
  { id: "contact-deletion", title: "Data Deletion Contact & Support" },
];

export default function DataDeletionPage() {
  return (
    <LegalPageLayout
      title="User Data Deletion Instructions"
      badge="Data Subject Rights"
      effectiveDate="October 31, 2026"
      lastUpdated="October 31, 2026"
      tableOfContents={tableOfContents}
      summary={
        <div className="space-y-2">
          <p>
            In compliance with international data privacy laws and the <strong>Meta Developer Platform Policies</strong> (App ID: 1761678114892387), this page provides clear, publicly accessible instructions on how salon owners, clients, and WhatsApp users can request the permanent erasure of their data from Bookzello.
          </p>
          <p>
            <strong>Transparent process:</strong> Bookzello processes data deletion requests through a verified administrative manual procedure. To protect against malicious account destruction, requests are validated before database erasure.
          </p>
        </div>
      }
    >
      {/* 1. Overview */}
      <section id="overview" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">1.</span> Overview &amp; Meta Compliance Commitment
        </h2>
        <p>
          Bookzello respects individual privacy rights and provides a simple, direct mechanism to request the deletion of personal information, salon business records, customer booking histories, and WhatsApp conversational transcripts stored in our databases.
        </p>
        <p>
          If you have interacted with Bookzello via our web application (<Link href="https://bookzello.com" className="text-[#1852E8] underline">https://bookzello.com</Link>), an embeddable website widget on a salon&rsquo;s website, or a connected salon WhatsApp business number, you have the right to request deletion of your records at any time.
        </p>
      </section>

      {/* 2. Who Can Request */}
      <section id="user-categories" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">2.</span> Who Can Request Deletion
        </h2>
        <p>We handle deletion requests across four main user categories:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#1852E8]" /> Category A: Salon Clients &amp; Customers
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm">
              Any client who booked an appointment online, submitted contact details, or interacted with an automated receptionist can request removal of their customer profile, appointment history, notes, and contact phone/email.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#1852E8]" /> Category B: WhatsApp Users
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm">
              Any individual who messaged a Bookzello-powered salon via WhatsApp can request that their WhatsApp ID (phone number), message logs, and conversational session history be purged from our cloud database.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[#1852E8]" /> Category C: Salon Owners &amp; Businesses
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm">
              A salon owner may request the complete decommissioning of their organization workspace, including salon profile, service catalog, staff profiles, working schedules, and connected integration credentials.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#1852E8]" /> Category D: Notification Opt-Out Users
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm">
              Users who do not wish to receive automated appointment reminders or confirmation emails can request cessation of transactional notifications while preserving future self-service booking options.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Step-by-Step Instructions */}
      <section id="step-by-step" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">3.</span> Step-by-Step Deletion Process
        </h2>
        <p>
          To ensure genuine authorization and prevent unauthorized sabotage of another user&rsquo;s or salon&rsquo;s appointments, requests are submitted and verified via email:
        </p>

        <div className="space-y-4 text-sm">
          <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-[#1852E8]">
              1
            </span>
            <div>
              <p className="font-semibold text-slate-900">Send an Email to our Dedicated Data Privacy Address</p>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                Send your deletion request to{" "}
                <a href="mailto:privacy@bookzello.com" className="text-[#1852E8] font-semibold underline">
                  privacy@bookzello.com
                </a>{" "}
                (or <a href="mailto:support@bookzello.com" className="text-[#1852E8] underline">support@bookzello.com</a>). Use the subject line:{" "}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">
                  Data Deletion Request - [Your Name or Phone Number]
                </code>
                .
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-[#1852E8]">
              2
            </span>
            <div>
              <p className="font-semibold text-slate-900">Provide Identifying Information</p>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                Include the reasonable identifying details specified in Section 4 below so our team can locate your records within our multi-tenant database.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-[#1852E8]">
              3
            </span>
            <div>
              <p className="font-semibold text-slate-900">Verification &amp; Confirmation Response</p>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                Our privacy team will acknowledge receipt within 48 business hours and verify ownership (e.g. by confirming access to the email or phone number on record).
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-[#1852E8]">
              4
            </span>
            <div>
              <p className="font-semibold text-slate-900">Database Erasure &amp; Completion Notice</p>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                Upon verified authorization, our database administrators execute the deletion across active tables, cascading to related conversational drafts, and issue a completion confirmation to your email.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Required Information */}
      <section id="required-info" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">4.</span> Information Required for Verification
        </h2>
        <p>
          To locate your records accurately without capturing unnecessary data, please include the following details corresponding to your use:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>For Salon Clients:</strong> Your full name, the email address and/or mobile phone number used during booking, and the name of the salon where you booked an appointment.</li>
          <li><strong>For WhatsApp Users:</strong> The mobile phone number (in international E.164 format, e.g. <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">+447700900000</code>) used to message the salon, and the name of the salon messaged.</li>
          <li><strong>For Salon Owners:</strong> Your registered account email address, salon business name, salon URL slug (e.g. <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">bookzello.com/booking/[slug]</code>), and confirmation that you wish to decommission the entire organization workspace.</li>
        </ul>
      </section>

      {/* 5. Security Warning */}
      <section id="security-warning" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">5.</span> Security Notice (What NOT to Send)
        </h2>
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-5 text-sm text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-red-950">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" /> Never Send Sensitive Security Credentials
          </div>
          <p className="text-xs sm:text-sm text-red-800 leading-relaxed">
            For your security, <strong>NEVER</strong> send passwords, account tokens, credit or debit card numbers, copies of government identity cards (such as passports or driving licenses), or banking information in your email request.
          </p>
          <p className="text-xs text-red-700">
            Bookzello will never ask you for your account password or payment card credentials to process a data deletion request.
          </p>
        </div>
      </section>

      {/* 6. Processing Lifecycle */}
      <section id="processing-lifecycle" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">6.</span> How Requests Are Processed &amp; Timelines
        </h2>
        <p>
          Once your request is received, Bookzello follows a structured lifecycle to ensure thorough removal while preserving system integrity:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
          <li><strong>Intake Acknowledgment:</strong> Within <strong>48 business hours</strong> of receiving your email.</li>
          <li><strong>Identity &amp; Ownership Verification:</strong> We confirm that the request originates from the legitimate owner of the contact details or salon organization.</li>
          <li><strong>Database Purge Execution:</strong> Within <strong>30 calendar days</strong> of completed verification:
            <ul className="list-circle pl-5 mt-1 space-y-1 text-xs text-slate-500">
              <li>Customer contact records and associated appointment history are removed or irrevocably anonymized.</li>
              <li>WhatsApp conversation threads, message logs, and webhook events linked to the phone identifier are deleted.</li>
              <li>For salon workspace deletions, foreign key cascading safely removes associated staff profiles, service catalogs, and draft records.</li>
            </ul>
          </li>
          <li><strong>Confirmation Receipt:</strong> You will receive a final confirmation email stating that your data has been successfully erased.</li>
        </ul>
      </section>

      {/* 7. WhatsApp & Meta Data */}
      <section id="whatsapp-specific" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">7.</span> WhatsApp &amp; Meta Data Clarification
        </h2>
        <p>
          It is important to understand the boundary between Bookzello and Meta Platforms:
        </p>
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <p className="font-semibold text-slate-900">What Bookzello Deletes:</p>
            <p className="text-slate-600 mt-1">
              All records stored on Bookzello&rsquo;s cloud servers (hosted on Supabase / PostgreSQL), including your phone number mapping, inbound/outbound text transcripts, and booking draft states.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <p className="font-semibold text-slate-900">What is Controlled on Your Personal Device:</p>
            <p className="text-slate-600 mt-1">
              The conversation thread stored inside your personal WhatsApp application on your smartphone. To remove the chat from your phone, open WhatsApp, swipe left or long-press on the conversation with the salon, and select <strong>&ldquo;Delete Chat&rdquo;</strong>.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <p className="font-semibold text-slate-900">Meta&rsquo;s Platform Servers:</p>
            <p className="text-slate-600 mt-1">
              Messages transiting Meta&rsquo;s WhatsApp Cloud API infrastructure are subject to Meta&rsquo;s own data retention and privacy policies. For inquiries regarding Meta&rsquo;s platform logs, please consult Meta&rsquo;s WhatsApp Privacy Policy.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Retention Exceptions */}
      <section id="retention-exceptions" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">8.</span> Operational &amp; Statutory Retention Exceptions
        </h2>
        <p>
          In limited situations permitted or required by law, certain data cannot be immediately erased:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Statutory Accounting &amp; Tax Obligations:</strong> Where a salon or Bookzello is required by commercial law to retain financial audit records or completed invoice receipts for statutory minimum periods (e.g. 6–7 years).</li>
          <li><strong>Dispute Resolution &amp; Fraud Prevention:</strong> Information strictly necessary to resolve active disputes, enforce terms of service, or prevent malicious abuse of booking systems.</li>
          <li><strong>Encrypted Backup Rotation:</strong> Data deleted from live operational databases will automatically age out and be permanently overwritten in encrypted disaster-recovery backups within standard cloud backup retention cycles (typically 30 days).</li>
        </ul>
      </section>

      {/* 9. Opt-Out Alternatives */}
      <section id="opt-out-alternatives" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">9.</span> Opt-Out Alternatives (Stop Reminders)
        </h2>
        <p>
          If you simply wish to stop receiving automated appointment notifications without deleting your appointment history:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>WhatsApp Opt-Out:</strong> Reply with the word <strong>&ldquo;STOP&rdquo;</strong> to any WhatsApp message received from a salon. The system will mark your conversation as opted out.</li>
          <li><strong>Email Notifications:</strong> You can manage communication preferences directly by contacting the salon or clicking the management link provided in your booking confirmation email.</li>
        </ul>
      </section>

      {/* 10. Contact */}
      <section id="contact-deletion" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">10.</span> Data Deletion Contact &amp; Support
        </h2>
        <p>
          To submit a data deletion request or check the status of an existing request, contact our privacy team:
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Mail className="h-4 w-4 text-[#1852E8]" /> Bookzello Data Privacy Officer / Support
          </div>
          <p className="text-slate-600">
            <strong>Dedicated Deletion Email:</strong>{" "}
            <a href="mailto:privacy@bookzello.com" className="text-[#1852E8] font-semibold underline hover:opacity-85">
              privacy@bookzello.com
            </a>
          </p>
          <p className="text-slate-600">
            <strong>General Support:</strong>{" "}
            <a href="mailto:support@bookzello.com" className="text-[#1852E8] underline hover:opacity-85">
              support@bookzello.com
            </a>
          </p>
          <p className="text-slate-600">
            <strong>Response SLA:</strong> Intake acknowledgment within 48 business hours; complete processing within 30 calendar days.
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
