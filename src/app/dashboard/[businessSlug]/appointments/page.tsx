import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { getBusinessServices } from "@/features/services/server";
import { getBusinessStaff } from "@/features/staff/server";
import {
  formatInstantInTimeZone,
  convertLocalWallClockToUTC,
} from "@/features/appointments/timezone";
import {
  listAppointmentsBySlug,
  getAppointmentKpis,
} from "@/features/appointments/server";
import { AppointmentCalendar } from "@/components/dashboard/appointments/appointment-calendar";

interface AppointmentsPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
  searchParams?: Promise<{
    date?: string;
    view?: string;
  }>;
}

export const metadata = {
  title: "Appointment Calendar & Bookings — Bookzello",
  description:
    "Manage salon appointment bookings, schedule manual walk-ins and phone calls, and view live daily capacity.",
};

export const instant = false;

export default async function AppointmentsPage({
  params,
  searchParams,
}: AppointmentsPageProps) {
  await connection();
  const [{ businessSlug }, sp] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({} as { date?: string; view?: string }),
  ]);

  // 1. Authorize caller and fetch business configuration
  const config = await getFullBusinessConfig(businessSlug);
  if (!config) {
    notFound();
  }

  const tz = config.business.timezone || "Europe/London";
  const currency = config.business.currency || "GBP";
  const now = new Date();
  const localToday = formatInstantInTimeZone(now, tz).dateStr;

  // Validate or fallback date & view from searchParams
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  let activeDate = sp?.date && dateRegex.test(sp.date) ? sp.date : "";
  const activeView: "day" | "week" | "list" =
    sp?.view === "week" || sp?.view === "list" ? sp.view : "day";

  // If date was not explicitly passed in searchParams, check if today has bookings;
  // if not and upcoming bookings exist, jump directly to the earliest upcoming appointment date.
  if (!activeDate) {
    activeDate = localToday;
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    if (supabase) {
      const todayStartIso =
        convertLocalWallClockToUTC(
          { date: localToday, time: "00:00", timeZone: tz },
          "earlier"
        ).isoString || `${localToday}T00:00:00.000Z`;
      const todayEndIso = `${localToday}T23:59:59.999Z`;

      const { count: todayCount } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", config.business.id)
        .gte("starts_at", todayStartIso)
        .lte("starts_at", todayEndIso);

      if (!todayCount || todayCount === 0) {
        const { data: nextAppt } = await supabase
          .from("appointments")
          .select("starts_at")
          .eq("business_id", config.business.id)
          .gt("starts_at", now.toISOString())
          .in("status", ["confirmed", "pending"])
          .order("starts_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextAppt?.starts_at) {
          activeDate = formatInstantInTimeZone(new Date(nextAppt.starts_at), tz).dateStr;
        }
      }
    }
  }

  // Calculate query bounds
  let queryStartDate = activeDate;
  let queryEndDate = activeDate;

  if (activeView === "week") {
    const [y, m, d] = activeDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(Date.UTC(y, m - 1, d + diffToMonday, 12, 0, 0));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 12, 0, 0));
    queryStartDate = monday.toISOString().slice(0, 10);
    queryEndDate = sunday.toISOString().slice(0, 10);
  } else if (activeView === "list") {
    const [y, m, d] = activeDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d + 14, 12, 0, 0));
    queryEndDate = dateObj.toISOString().slice(0, 10);
  }

  // 2. Fetch active services, staff, appointments, and KPIs concurrently
  const [servicesData, staffData, appointmentsRes, kpisRes] = await Promise.all([
    getBusinessServices(businessSlug, false),
    getBusinessStaff(businessSlug, false),
    listAppointmentsBySlug(businessSlug, {
      startDate: queryStartDate,
      endDate: queryEndDate,
    }),
    getAppointmentKpis(businessSlug, activeDate),
  ]);

  const initialAppointments =
    appointmentsRes.success && appointmentsRes.appointments
      ? appointmentsRes.appointments
      : [];

  const initialKpis =
    kpisRes.success && kpisRes.kpis
      ? kpisRes.kpis
      : {
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
        initialDate={activeDate}
        initialView={activeView}
      />
    </div>
  );
}
