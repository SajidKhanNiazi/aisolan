import { redirect } from "next/navigation";
import { getUserBusinesses } from "@/features/organizations/server";

export const instant = false;

export default async function DashboardIndexPage() {
  const businesses = await getUserBusinesses();

  if (businesses.length === 0) {
    redirect("/dashboard/businesses/new");
  }

  // Redirect to first authorized workspace
  redirect(`/dashboard/${businesses[0].slug}`);
}
