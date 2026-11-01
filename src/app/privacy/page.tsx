import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout, type TocItem } from "@/components/legal/legal-page-layout";
import { ShieldCheck, Lock, Database, Bot, MessageSquare, AlertTriangle, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Bookzello",
  description:
    "Learn how Bookzello collects, processes, and protects personal and business data across our salon booking engine, AI receptionist, and messaging integrations.",
  alternates: {
    canonical: "https://bookzello.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Bookzello",
    description:
      "Comprehensive transparency on how Bookzello safeguards salon, customer, and AI conversational data.",
    url: "https://bookzello.com/privacy",
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
  { id: "introduction", title: "Introduction & Scope" },
  { id: "operator-identity", title: "Platform Operator & Business Model" },
  { id: "information-collected", title: "Information We Collect" },
  { id: "collection-methods", title: "How We Collect Information" },
  { id: "processing-purposes", title: "Purposes & Legal Grounds of Processing" },
  { id: "ai-processing", title: "AI Receptionist & Language Model Processing" },
  { id: "whatsapp-messaging", title: "WhatsApp Business Platform Integration" },
  { id: "third-party-providers", title: "Third-Party Service Providers (Subprocessors)" },
  { id: "tenant-isolation", title: "Tenant Isolation & Data Segregation" },
  { id: "cookies-analytics", title: "Cookies, Storage & Technical Telemetry" },
  { id: "security-measures", title: "Data Security & Storage Practices" },
  { id: "data-retention", title: "Data Retention & Lifecycle Management" },
  { id: "user-rights", title: "Individual Privacy Rights & Requests" },
  { id: "international-transfers", title: "International Data Processing" },
  { id: "childrens-privacy", title: "Children's Privacy" },
  { id: "policy-updates", title: "Policy Updates & Version History" },
  { id: "contact-information", title: "Contact Information & Inquiries" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Bookzello Privacy Policy"
      badge="Data Protection & Privacy"
      effectiveDate="October 31, 2026"
      lastUpdated="October 31, 2026"
      tableOfContents={tableOfContents}
      summary={
        <div className="space-y-2">
          <p>
            This Privacy Policy explains how <strong>Bookzello</strong> collects, uses, protects, and discloses personal data when salon businesses, staff, and clients interact with our appointment booking platform, web widgets, and AI conversational tools.
          </p>
          <p>
            <strong>Key takeaway:</strong> Bookzello provides multi-tenant booking infrastructure. Independent salons configure their own services and manage their client relationships. Data entered for one salon is cryptographically and logically isolated from all other salons.
          </p>
        </div>
      }
    >
      {/* 1. Introduction & Scope */}
      <section id="introduction" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">1.</span> Introduction &amp; Scope
        </h2>
        <p>
          Welcome to <strong>Bookzello</strong> (&ldquo;Bookzello&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), accessible online at{" "}
          <Link href="https://bookzello.com" className="text-[#1852E8] underline hover:opacity-80">
            https://bookzello.com
          </Link>
          . Bookzello is a cloud-based software-as-a-service (SaaS) platform providing multi-tenant appointment scheduling, staff calendar coordination, embeddable web booking widgets, and tool-using AI receptionist capabilities designed for independent hair salons, barbershops, and beauty studios.
        </p>
        <p>
          This Privacy Policy applies to all users of our platform, including:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Salon Owners &amp; Managers:</strong> Individuals who register an organization workspace, manage staff schedules, configure service menus, and view appointments.</li>
          <li><strong>Salon Staff Members:</strong> Service providers whose schedules, shifts, and assigned appointments are organized through the system.</li>
          <li><strong>Salon Clients &amp; Customers:</strong> Individuals who view public booking pages, schedule appointments, receive transactional reminders, or chat with our automated AI assistant.</li>
          <li><strong>Website Visitors:</strong> Individuals browsing our marketing website, public documentation, or testing interactive product demonstrations.</li>
        </ul>
      </section>

      {/* 2. Platform Operator */}
      <section id="operator-identity" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">2.</span> Platform Operator &amp; Business Model
        </h2>
        <p>
          Bookzello operates as a multi-tenant business software provider. Under standard data protection frameworks:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
          <li>
            <strong>Salon Client Booking Data:</strong> When clients book an appointment with a specific salon (e.g., booking a haircut or colour service), the respective salon owner determines what services they offer, sets working hours, and manages client records. Bookzello processes this booking information on behalf of the salon to facilitate the scheduling service.
          </li>
          <li>
            <strong>Salon Account &amp; Administrative Data:</strong> For salon owner accounts, billing configuration, authentication records, and direct communications with Bookzello, Bookzello processes personal information necessary to administer the software subscription and deliver system security.
          </li>
        </ul>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Notice for Salon Clients Regarding Salon Privacy Practices:</p>
            <p className="mt-1 text-amber-800 leading-relaxed">
              If you are a customer booking an appointment with an independent salon using Bookzello, your relationship is directly with that salon business. Each salon maintains its own operational policies regarding client records and in-person consultations. If you have questions about how a specific salon handles your records outside our software, please contact the salon directly.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Information We Collect */}
      <section id="information-collected" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">3.</span> Information We Collect
        </h2>
        <p>
          We only collect information necessary to fulfill our core software functions: collision-free appointment scheduling, business configuration, and automated client notifications. We collect data in the following categories:
        </p>

        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Database className="h-4 w-4 text-[#1852E8]" /> A. Salon Business &amp; Staff Information
            </h3>
            <p className="text-slate-600 mb-2">When a salon owner registers a workspace and configures their salon:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm">
              <li>Owner account credentials: full name, business email address, and encrypted authentication identifier.</li>
              <li>Business details: salon trading name, URL slug, phone number, category, physical address, city, country, and IANA timezone.</li>
              <li>Staff profiles: staff member display name, assigned services, working shift hours, break times, and scheduled time-off records.</li>
              <li>Service offerings: service names, descriptions, prices (stored in minor currency units, e.g., pence/cents), and duration/buffer minutes.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#1852E8]" /> B. Customer Booking Information
            </h3>
            <p className="text-slate-600 mb-2">When a customer books an appointment through a public booking link or salon website widget:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm">
              <li>Contact details: customer full name, email address, and mobile phone number (at least one valid contact method is enforced).</li>
              <li>Appointment details: selected service(s), requested staff member (or &ldquo;any available&rdquo;), appointment start and end timestamps (stored in UTC, rendered in salon local time), and appointment status (confirmed, rescheduled, cancelled, completed, no-show).</li>
              <li>Appointment notes: optional comments or preferences provided by the customer during the booking flow.</li>
              <li>Secure management token: a cryptographically random, unguessable URL token enabling the customer to view, reschedule, or cancel their specific appointment.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#1852E8]" /> C. Website AI Chatbot Conversation Data
            </h3>
            <p className="text-slate-600 mb-2">When a visitor interacts with the embeddable AI receptionist on a salon&rsquo;s website:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm">
              <li>Message content: questions, service inquiries, and conversational booking requests submitted to the chatbot.</li>
              <li>Conversational booking draft state: temporary session state including requested date, selected service, and customer contact details pending explicit confirmation.</li>
              <li>AI tool audit trail: deterministic logs of server tools queried by the AI assistant (e.g. checking real-time availability slots).</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#1852E8]" /> D. WhatsApp Business Platform Message Data (When Enabled)
            </h3>
            <p className="text-slate-600 mb-2">
              When WhatsApp integration features are enabled for an authorized salon in our pilot program:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm">
              <li>Meta identifiers: customer WhatsApp ID (phone number in international E.164 format), Meta WhatsApp Business Account (WABA) ID, and Phone Number ID.</li>
              <li>Message history: inbound user text, outbound AI replies, message timestamps, and delivery receipt statuses (sent, delivered, read).</li>
              <li>Controlled pilot safeguards: during developer evaluation, live WhatsApp messaging is restricted to authorized test phone numbers.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#1852E8]" /> E. Technical Telemetry &amp; System Metadata
            </h3>
            <p className="text-slate-600 mb-2">For operational reliability, fraud prevention, and security auditing:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm">
              <li>IP addresses, browser user-agent strings, HTTP request headers, and timestamp logs.</li>
              <li>Cryptographic webhook signatures (e.g. Meta <code className="text-xs bg-slate-200 px-1 py-0.5 rounded">X-Hub-Signature-256</code> and Upstash signatures) verified upon arrival.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. How Information is Collected */}
      <section id="collection-methods" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">4.</span> How We Collect Information
        </h2>
        <p>We collect data through direct user interactions and automated platform events:</p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Direct input by salon operators:</strong> Entering salon operating details, staff rosters, and service menus into the authenticated dashboard.</li>
          <li><strong>Direct input by clients:</strong> Filling out the four-step public booking form (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Service → Staff → Time Slot → Customer Details</code>).</li>
          <li><strong>Conversational input:</strong> Submitting text prompts into the website chatbot or sending a WhatsApp message to a connected salon number.</li>
          <li><strong>Automated webhooks:</strong> Secure server-to-server webhook events delivered by Meta WhatsApp Cloud API and Upstash QStash.</li>
          <li><strong>Server logging:</strong> Automated generation of security audit events for appointment modifications, status transitions, and rate-limit enforcements.</li>
        </ul>
      </section>

      {/* 5. Purposes & Legal Grounds */}
      <section id="processing-purposes" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">5.</span> Purposes &amp; Legal Grounds of Processing
        </h2>
        <p>Bookzello processes personal information for the following specific purposes:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse border border-slate-200 rounded-lg">
            <thead className="bg-slate-100 text-slate-900 font-semibold">
              <tr>
                <th className="p-3 border border-slate-200">Purpose</th>
                <th className="p-3 border border-slate-200">Data Used</th>
                <th className="p-3 border border-slate-200">Legal / Operational Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              <tr>
                <td className="p-3 font-medium text-slate-900">Appointment scheduling &amp; collision prevention</td>
                <td className="p-3">Customer name, contact info, staff assignment, timestamps, service duration</td>
                <td className="p-3">Performance of appointment contract requested by customer; legitimate interest of salon in managing calendar</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-900">Transactional email notifications</td>
                <td className="p-3">Customer email, booking token, salon name, appointment details</td>
                <td className="p-3">Fulfillment of requested service; delivering confirmation receipts and rescheduling links</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-900">AI receptionist intent extraction &amp; drafting</td>
                <td className="p-3">Chat message text, session tokens, draft slot selections</td>
                <td className="p-3">Customer consent by initiating chat; legitimate operational interest in automated customer service</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-900">WhatsApp messaging coordination</td>
                <td className="p-3">WhatsApp phone number, message text, inbound/outbound timestamps</td>
                <td className="p-3">Customer consent by messaging salon number; compliance with Meta Business messaging policies</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-900">Platform security, tenant isolation &amp; abuse guard</td>
                <td className="p-3">IP addresses, webhook signatures, authentication cookies, audit logs</td>
                <td className="p-3">Legitimate interest in system integrity; compliance with statutory security obligations</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. AI Receptionist Processing */}
      <section id="ai-processing" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">6.</span> AI Receptionist &amp; Language Model Processing
        </h2>
        <p>
          Bookzello incorporates an AI Receptionist capable of answering customer questions and guiding customers through booking an appointment. We maintain strict safety and engineering boundaries regarding AI data handling:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
          <li>
            <strong>Tool-Constrained Model Architecture:</strong> The underlying language model (provided via OpenAI API) does <em>not</em> directly execute database mutations or fabricate availability. It interprets user phrasing to select predefined server tools (e.g. <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">list_services</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">check_availability</code>).
          </li>
          <li>
            <strong>Strict Explicit Confirmation Gate:</strong> The AI assistant cannot unilaterally commit a binding appointment or charge a customer. A booking draft requires the customer&rsquo;s explicit confirmation of time, service, and contact details before the atomic database transaction commits.
          </li>
          <li>
            <strong>No Training on Customer Transcripts:</strong> Customer conversation data sent to the OpenAI API for real-time inference is processed under OpenAI&rsquo;s enterprise zero-data-retention (ZDR) and API privacy terms, which state that API inputs and outputs are not used to train foundation models.
          </li>
          <li>
            <strong>Tenant Scope Isolation:</strong> The AI assistant is provided only with the service menu, working hours, and public availability of the specific salon being messaged. It has zero visibility into other salons on the platform.
          </li>
        </ul>
      </section>

      {/* 7. WhatsApp Business Integration */}
      <section id="whatsapp-messaging" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">7.</span> WhatsApp Business Platform Integration
        </h2>
        <p>
          Bookzello integrates with Meta&rsquo;s official WhatsApp Business Cloud API to enable automated customer service and booking inquiries over WhatsApp. When active:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 text-sm">
          <li>
            <strong>Role of Meta Platforms, Inc.:</strong> Inbound and outbound WhatsApp messages transit Meta&rsquo;s infrastructure. Meta processes message delivery, encryption in transit to and from the user device, and webhook dispatch to Bookzello. Meta&rsquo;s processing is governed by the Meta Privacy Policy and WhatsApp Business Terms.
          </li>
          <li>
            <strong>Decryption at Server Ingestion:</strong> While messages are end-to-end encrypted between the user&rsquo;s device and Meta&rsquo;s Cloud API servers, once Meta delivers a webhook payload to Bookzello&rsquo;s HTTPS endpoint, the message is decrypted so our backend can interpret customer intent and process scheduling tools. We do <em>not</em> claim end-to-end encryption within the Bookzello server application.
          </li>
          <li>
            <strong>Controlled Pilot Parameters:</strong> As of the Effective Date of this Policy, live WhatsApp integration operates under strict evaluation safety guards. Outbound automated messaging and live booking creation remain subject to explicit feature flags (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">WHATSAPP_OUTBOUND_ENABLED=false</code>) and test-recipient allowlists.
          </li>
          <li>
            <strong>Opt-Out &amp; Messaging Policies:</strong> Salons using WhatsApp integrations must respect customer communication preferences and Meta Business Messaging Policies. Customers may message &ldquo;STOP&rdquo; at any time to opt out of conversational messaging.
          </li>
        </ul>
      </section>

      {/* 8. Third-Party Service Providers */}
      <section id="third-party-providers" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">8.</span> Third-Party Service Providers (Subprocessors)
        </h2>
        <p>
          We partner with reputable infrastructure and technology providers to deliver high-availability cloud services. Our primary subprocessors include:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <p className="font-bold text-slate-900">Supabase Inc.</p>
            <p className="text-slate-500 text-xs">PostgreSQL database hosting, user authentication, and encrypted storage.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <p className="font-bold text-slate-900">Vercel Inc.</p>
            <p className="text-slate-500 text-xs">Web application hosting, edge compute, SSL termination, and content delivery.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <p className="font-bold text-slate-900">OpenAI, LLC</p>
            <p className="text-slate-500 text-xs">Natural language processing and intent analysis for AI receptionist tools via API.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <p className="font-bold text-slate-900">Meta Platforms, Inc. (WhatsApp)</p>
            <p className="text-slate-500 text-xs">Official WhatsApp Cloud API gateway for customer messaging (when active).</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <p className="font-bold text-slate-900">Resend, Inc.</p>
            <p className="text-slate-500 text-xs">Transactional email dispatch for booking receipts and reminder notifications.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
            <p className="font-bold text-slate-900">Upstash, Inc. (QStash)</p>
            <p className="text-slate-500 text-xs">Durable, asynchronous background event queuing and reliable worker triggers.</p>
          </div>
        </div>
      </section>

      {/* 9. Tenant Isolation */}
      <section id="tenant-isolation" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">9.</span> Tenant Isolation &amp; Data Segregation
        </h2>
        <p>
          Bookzello enforces strict architectural isolation between different salon organizations. No salon can view, modify, or infer another salon&rsquo;s appointments, customer directory, staff records, or financial metrics:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Database Row Level Security (RLS):</strong> Every tenant-owned row in PostgreSQL is bound to an <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">organization_id</code> / <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">business_id</code>. Database policies guarantee that queries executed by an authenticated user return only rows belonging to their verified organization membership.</li>
          <li><strong>Composite Foreign Key Constraints:</strong> Tables referencing appointments, staff, and services enforce composite keys verifying that associated records belong to the exact same organization.</li>
          <li><strong>Fail-Closed Invariant Validation:</strong> Inbound webhook events (e.g. from WhatsApp or web widgets) resolve the authoritative tenant from validated identifiers before executing any business logic. Unmapped or unauthorized requests fail closed immediately.</li>
        </ul>
      </section>

      {/* 10. Cookies & Tracking */}
      <section id="cookies-analytics" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">10.</span> Cookies, Storage &amp; Technical Telemetry
        </h2>
        <p>
          We take a privacy-first approach to browser storage. Bookzello does <strong>not</strong> employ third-party cross-site behavioral tracking cookies, advertising pixels, or data brokers.
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Essential Authentication Cookies:</strong> First-party session cookies (prefixed with <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">sb-</code>) set by Supabase Auth are strictly required to maintain authenticated sessions for logged-in salon owners and staff.</li>
          <li><strong>Security &amp; CSRF Protection:</strong> Standard HTTP headers and session tokens verify the authenticity of administrative requests.</li>
          <li><strong>No Marketing Trackers:</strong> We do not inject third-party ad retargeting pixels (such as the Meta Pixel or Google Ads tracking) into our application or client booking pages.</li>
        </ul>
      </section>

      {/* 11. Security Measures */}
      <section id="security-measures" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">11.</span> Data Security &amp; Storage Practices
        </h2>
        <p>
          We implement technical and organizational measures designed to protect personal and business information against unauthorized access, loss, or alteration:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Encryption in Transit:</strong> All web traffic, API requests, and webhook transmissions use Transport Layer Security (TLS 1.3 / HTTPS) with modern cipher suites.</li>
          <li><strong>Encryption at Rest:</strong> Database tables, storage volumes, and database backups are encrypted at rest using industry-standard AES-256 encryption managed by Supabase and cloud hosting providers.</li>
          <li><strong>Cryptographic Tokenization:</strong> Customer self-service booking links utilize high-entropy random tokens rather than sequential integer IDs, preventing unauthorized enumeration of appointment records.</li>
          <li><strong>Secret Management:</strong> Sensitive API keys, database credentials, and signing secrets are stored strictly in server-side environment variables and are never bundled into client-side JavaScript or committed to version control.</li>
        </ul>
        <p className="text-xs text-slate-500 italic">
          *Note on Certifications: While Bookzello applies rigorous engineering security standards, we do not claim formal third-party certifications (such as ISO 27001 or SOC 2 Type II) at this stage of platform validation.
        </p>
      </section>

      {/* 12. Data Retention */}
      <section id="data-retention" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">12.</span> Data Retention &amp; Lifecycle Management
        </h2>
        <p>
          We retain personal data only for as long as necessary to provide the Bookzello services, fulfill legal obligations, and resolve disputes:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Salon Account Information:</strong> Retained while the salon organization account remains active. Upon verified account termination, active database records are deleted or anonymized in accordance with our deletion procedures.</li>
          <li><strong>Appointment &amp; Customer Records:</strong> Retained in the salon&rsquo;s directory to enable historical lookup, repeat client booking, and scheduling continuity until requested for deletion by the salon or client.</li>
          <li><strong>Conversational Booking Drafts:</strong> Temporary booking drafts generated by chatbot interactions that are not confirmed within 24 hours are automatically purged by scheduled database maintenance jobs.</li>
          <li><strong>Outbox Notification Logs:</strong> Email and messaging dispatch attempts are retained for operational monitoring, troubleshooting, and retry coordination before standard archival.</li>
        </ul>
      </section>

      {/* 13. User Rights */}
      <section id="user-rights" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">13.</span> Individual Privacy Rights &amp; Requests
        </h2>
        <p>
          Depending on your jurisdiction (such as the UK, European Economic Area, or certain US states), you may have statutory rights regarding your personal information, including:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 text-sm">
          <li><strong>Right of Access:</strong> The right to request confirmation of whether we hold personal data concerning you and obtain a copy.</li>
          <li><strong>Right to Rectification:</strong> The right to correct inaccurate or incomplete contact details.</li>
          <li><strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> The right to request deletion of your personal booking history or account information.</li>
          <li><strong>Right to Restrict or Object:</strong> The right to object to specific processing operations or withdraw communication consent.</li>
        </ul>
        <p className="text-sm text-slate-600">
          For detailed instructions on submitting an erasure request, please consult our dedicated{" "}
          <Link href="/data-deletion" className="text-[#1852E8] font-semibold underline hover:opacity-85">
            Data Deletion Instructions Page
          </Link>
          .
        </p>
      </section>

      {/* 14. International Transfers */}
      <section id="international-transfers" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">14.</span> International Data Processing
        </h2>
        <p>
          Bookzello and its subprocessors operate globally. Personal information collected through our platform may be hosted, transferred, or processed in cloud data centers located in the European Union, the United Kingdom, or the United States. When data is transferred across international borders, we rely on established transfer mechanisms provided by our subprocessors (such as Standard Contractual Clauses approved by the European Commission and UK International Data Transfer Addendums) to ensure appropriate safeguards.
        </p>
      </section>

      {/* 15. Children's Privacy */}
      <section id="childrens-privacy" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">15.</span> Children&rsquo;s Privacy
        </h2>
        <p>
          Bookzello is a commercial software platform designed for business operators and adults booking appointments. Our website, applications, and AI receptionists are not intended for children under the age of 16. We do not knowingly collect personal data from minors. If you believe a child has provided us with personal information without parental consent, please contact us immediately and we will promptly delete the data.
        </p>
      </section>

      {/* 16. Policy Updates */}
      <section id="policy-updates" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">16.</span> Policy Updates &amp; Version History
        </h2>
        <p>
          We may update this Privacy Policy from time to time to reflect modifications in our software architecture, new integration capabilities (such as expanded messaging channels or calendar sync options), or changes in legal requirements. When updates are published:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-slate-600 text-sm">
          <li>The &ldquo;Effective Date&rdquo; at the top of this document will be updated.</li>
          <li>For material changes affecting existing salon subscribers, notice will be provided via the salon dashboard or direct email notification.</li>
        </ul>
      </section>

      {/* 17. Contact Information */}
      <section id="contact-information" className="scroll-mt-28 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#040F28] font-brand border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="text-[#1852E8]">17.</span> Contact Information &amp; Inquiries
        </h2>
        <p>
          If you have questions, feedback, or data privacy requests regarding this Privacy Policy or Bookzello&rsquo;s data practices, please contact us:
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Mail className="h-4 w-4 text-[#1852E8]" /> Bookzello Privacy Team
          </div>
          <p className="text-slate-600">
            <strong>Privacy Email:</strong>{" "}
            <a href="mailto:privacy@bookzello.com" className="text-[#1852E8] underline hover:opacity-85">
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
            <strong>Website:</strong>{" "}
            <Link href="https://bookzello.com" className="text-[#1852E8] underline hover:opacity-85">
              https://bookzello.com
            </Link>
          </p>
          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Platform Operator Note for Legal Review:</p>
            <p className="mt-0.5">
              Bookzello is developed and maintained by the Bookzello engineering and product team. Formal corporate registration details, registered office address, and jurisdiction-specific statutory representatives will be updated upon final commercial incorporation.
            </p>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
