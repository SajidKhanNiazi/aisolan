import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { getBusinessServices } from "@/features/services/server";
import { getBusinessStaff } from "@/features/staff/server";
import { formatInstantInTimeZone } from "@/features/appointments/timezone";
import {
  listAppointmentsBySlug,
  getAppointmentKpis,
} from "@/features/appointments/server";
import { AppointmentCalendar } from "@/components/dashboard/appointments/appointment-calendar";

interface AppointmentsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export const metadata = {
  title: "Appointment Calendar & Bookings — BookPilot AI",
  description:
    "Manage salon appointment bookings, schedule manual walk-ins and phone calls, and view live daily capacity.",
};

export const instant = false;

export default async function AppointmentsPage({ params }: AppointmentsPageProps) {
  await connection();
  const { businessSlug } = await params;

  // 1. Authorize caller and fetch business configuration
  const config = await getFullBusinessConfig(businessSlug);
  if (!config) {
    notFound();
  }

  const tz = config.business.timezone || "Europe/London";
  const currency = config.business.currency || "GBP";
  const now = new Date();
  const localToday = formatInstantInTimeZone(now, tz).dateStr;

  // 2. Fetch active services, staff, today's appointments, and KPIs concurrently
  const [servicesData, staffData, appointmentsRes, kpisRes] = await Promise.all([
    getBusinessServices(businessSlug, false),
    getBusinessStaff(businessSlug, false),
    listAppointmentsBySlug(businessSlug, {
      startDate: localToday,
      endDate: localToday,
    }),
    getAppointmentKpis(businessSlug, localToday),
  ]);

  const initialAppointments = appointmentsRes.success && appointmentsRes.appointments ? appointmentsRes.appointments : [];
  const initialKpis = kpisRes.success && kpisRes.kpis ? kpisRes.kpis : {
    todayCount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
    upcomingCount: 0,
    todayRevenueMinor: 0,
    currency: currency,
  };

  return (
    <div className="max-w-7xl mx-auto py-4">
      <AppointmentCalendar
        businessId={config.business.id}
        businessSlug={businessSlug}
        businessTimezone={tz}
        currency={currency}
        initialAppointments={initialAppointments}
        initialKpis={initialKpis}
        staffList={staffData.staff}
        servicesList={servicesData.services}
      />
    </div>
  );
}
