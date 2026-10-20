import { getBusinessStaff } from "@/features/staff/server";
import { getBusinessServices } from "@/features/services/server";
import { StaffManager } from "@/components/dashboard/staff/staff-manager";
import { notFound } from "next/navigation";
import { connection } from "next/server";

interface StaffPageProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function StaffPage({ params }: StaffPageProps) {
  await connection();
  const { businessSlug } = await params;

  const staffData = await getBusinessStaff(businessSlug);
  if (!staffData.businessId) {
    notFound();
  }

  const servicesData = await getBusinessServices(businessSlug);

  return (
    <div className="space-y-6">
      <StaffManager
        initialStaff={staffData.staff}
        allServices={servicesData.services}
        businessId={staffData.businessId}
        businessSlug={businessSlug}
      />
    </div>
  );
}
