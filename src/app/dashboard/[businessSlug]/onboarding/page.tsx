import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { OnboardingWizard } from "@/components/dashboard/onboarding/onboarding-wizard";

interface OnboardingPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export const metadata = {
  title: "Setup Wizard — Bookzello",
  description: "Complete your salon onboarding and business settings.",
};

export const instant = false;

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  await connection();
  const { businessSlug } = await params;

  const config = await getFullBusinessConfig(businessSlug);

  if (!config) {
    notFound();
  }

  // Non-owners cannot edit onboarding settings
  if (config.business.role !== "owner") {
    redirect(`/dashboard/${businessSlug}`);
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      <OnboardingWizard
        business={config.business}
        initialHours={config.openingHours}
        initialPolicy={config.policy}
        initialProgress={config.onboarding}
      />
    </div>
  );
}
