import { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getPublicSalonProfile } from "@/features/public-booking/server";
import { getPublicAiConfig } from "@/features/ai-receptionist/server";
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

  return <EmbeddedWidget salon={salon} aiConfig={aiConfig} />;
}
