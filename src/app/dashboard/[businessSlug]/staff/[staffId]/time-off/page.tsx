import { getStaffDetail } from "@/features/staff/server";
import { StaffTimeOffEditor } from "@/components/dashboard/staff/staff-time-off-editor";
import { notFound } from "next/navigation";
import { connection } from "next/server";

interface StaffTimeOffPageProps {
  params: Promise<{ businessSlug: string; staffId: string }>;
}

export default async function StaffTimeOffPage({ params }: StaffTimeOffPageProps) {
  await connection();
  const { businessSlug, staffId } = await params;

  const detail = await getStaffDetail(businessSlug, staffId);
  if (!detail || !detail.staff || !detail.businessId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <StaffTimeOffEditor
        staff={detail.staff}
        initialTimeOff={detail.timeOff}
        businessId={detail.businessId}
        businessSlug={businessSlug}
        timezone={detail.timezone}
      />
    </div>
  );
}
