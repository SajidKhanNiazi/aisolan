import { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getPublicSalonProfile } from "@/features/public-booking/server";
import { getPublicAiConfig } from "@/features/ai-receptionist/server";
import { headers } from "next/headers";
import { parseAllowedDomains, isDomainAllowed } from "@/features/organizations/domain-policy";
import { EmbeddedWidget } from "@/components/widget/embedded-widget";

interface EmbedPageProps {
  params: Promise<{ businessSlug: string }>;
}

export const instant = false;

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { businessSlug } = await params;
  const res = await getPublicSalonProfile(businessSlug);

  return {
    title: res.success && res.data ? `Book Appointment | ${res.data.name}` : "Book Appointment",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  await connection();
  const { businessSlug } = await params;

  const [salonRes, aiConfigRes] = await Promise.all([
    getPublicSalonProfile(businessSlug),
    getPublicAiConfig(businessSlug),
  ]);

  if (!salonRes.success || !salonRes.data) {
    notFound();
  }

  const salon = salonRes.data;
  const aiConfig = aiConfigRes.success && aiConfigRes.data ? aiConfigRes.data : null;

  // Server-side Domain Policy Enforcement
  const headersList = await headers();
  const referer = headersList.get("referer") || "";

  // Combine configured website domains and owner-authorized QA domain (ferienkalendr.de)
  const allowed = parseAllowedDomains(salon.website);
  if (businessSlug === "bookpilot-qa-salon" && !allowed.includes("ferienkalendr.de")) {
    allowed.push("ferienkalendr.de");
  }

  if (referer && !isDomainAllowed(referer, allowed)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 text-slate-800">
        <div className="max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-2">Unauthorized Host Domain</h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            This booking widget is not authorized to be embedded on this domain.
            Please configure allowed host domains in your salon dashboard settings.
          </p>
          <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">
            {referer.substring(0, 60)}
          </span>
        </div>
      </div>
    );
  }

  return <EmbeddedWidget salon={salon} aiConfig={aiConfig} />;
}
