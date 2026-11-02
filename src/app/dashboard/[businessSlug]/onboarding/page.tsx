import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { getBusinessServices } from "@/features/services/server";
import { getBusinessStaff } from "@/features/staff/server";
import { getBusinessBookingReadiness } from "@/features/organizations/readiness";
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

  const [config, servicesData, staffData, readinessReport] = await Promise.all([
    getFullBusinessConfig(businessSlug),
    getBusinessServices(businessSlug),
    getBusinessStaff(businessSlug),
    getBusinessBookingReadiness(businessSlug),
  ]);

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
        initialServices={servicesData.services}
        initialStaff={staffData.staff}
        initialReadiness={readinessReport}
      />
    </div>
  );
}
