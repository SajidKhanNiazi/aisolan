import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { getBusinessServices } from "@/features/services/server";
import { getBusinessStaff } from "@/features/staff/server";
import { formatInstantInTimeZone } from "@/features/appointments/timezone";
import { AvailabilityPreview } from "@/components/dashboard/availability/availability-preview";

interface AvailabilityPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export const metadata = {
  title: "Appointment Availability Preview — BookPilot AI",
  description:
    "Preview real-time booking slots based on salon operating hours, staff schedules, and existing appointments.",
};

export const instant = false;

export default async function AvailabilityPage({ params }: AvailabilityPageProps) {
  await connection();
  const { businessSlug } = await params;

  // 1. Authorize caller and fetch business configuration
  const config = await getFullBusinessConfig(businessSlug);
  if (!config) {
    notFound();
  }

  // 2. Fetch active services and staff
  const [servicesData, staffData] = await Promise.all([
    getBusinessServices(businessSlug, false),
    getBusinessStaff(businessSlug, false),
  ]);

  // 3. Compute initial local date (today or tomorrow) in salon timezone
  const tz = config.business.timezone || "Europe/London";
  const now = new Date();
  const localToday = formatInstantInTimeZone(now, tz).dateStr;

  return (
    <div className="max-w-7xl mx-auto py-4">
      <AvailabilityPreview
        businessSlug={businessSlug}
        businessName={config.business.name}
        businessTimezone={tz}
        services={servicesData.services}
        staff={staffData.staff}
        initialDate={localToday}
      />
    </div>
  );
}
