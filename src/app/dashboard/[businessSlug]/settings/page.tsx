import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { BusinessSettingsTabs } from "@/components/dashboard/settings/business-settings-tabs";

interface SettingsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export const metadata = {
  title: "Business Settings — Bookzello",
  description: "Configure salon profile, opening hours, schedule exceptions, and booking policies.",
};

export const instant = false;

export default async function BusinessSettingsPage({ params }: SettingsPageProps) {
  await connection();
  const { businessSlug } = await params;

  const config = await getFullBusinessConfig(businessSlug);

  if (!config) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      <BusinessSettingsTabs initialConfig={config} />
    </div>
  );
}
