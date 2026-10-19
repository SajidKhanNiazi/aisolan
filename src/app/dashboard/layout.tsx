import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserBusinesses, getCurrentProfile } from "@/features/organizations/server";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export const metadata = {
  title: "Dashboard — BookPilot AI",
  description: "Manage your salon business workspace, schedules, and AI receptionist.",
};

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const businesses = await getUserBusinesses();
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <DashboardHeader
        allBusinesses={businesses}
        profile={profile}
        userEmail={user.email}
      />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
