import { getStaffDetail } from "@/features/staff/server";
import { StaffScheduleEditor } from "@/components/dashboard/staff/staff-schedule-editor";
import { notFound } from "next/navigation";
import { connection } from "next/server";

interface StaffSchedulePageProps {
  params: Promise<{ businessSlug: string; staffId: string }>;
}

export default async function StaffSchedulePage({ params }: StaffSchedulePageProps) {
  await connection();
  const { businessSlug, staffId } = await params;

  const detail = await getStaffDetail(businessSlug, staffId);
  if (!detail || !detail.staff || !detail.businessId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <StaffScheduleEditor
        staff={detail.staff}
        initialWorkingHours={detail.workingHours}
        initialBreaks={detail.breaks}
        businessOpeningHours={detail.businessOpeningHours}
        businessId={detail.businessId}
        businessSlug={businessSlug}
        timezone={detail.timezone}
      />
    </div>
  );
}
