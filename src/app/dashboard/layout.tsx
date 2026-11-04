import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getUserBusinesses, getCurrentProfile } from "@/features/organizations/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata = {
  title: "Dashboard — Bookzello",
  description: "Manage your salon business workspace, schedules, and AI receptionist.",
};

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const [businesses, profile] = await Promise.all([
    getUserBusinesses(),
    getCurrentProfile(),
  ]);

  return (
    <DashboardShell
      allBusinesses={businesses}
      profile={profile}
      userEmail={user.email}
    >
      {children}
    </DashboardShell>
  );
}
