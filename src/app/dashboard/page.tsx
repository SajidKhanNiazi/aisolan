import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { getUserBusinesses } from "@/features/organizations/server";

export const instant = false;

export default async function DashboardIndexPage() {
  await connection();
  const businesses = await getUserBusinesses();

  if (businesses.length === 0) {
    redirect("/dashboard/businesses/new");
  }

  // Restore last-used authorized workspace if stored in secure preference cookie
  const cookieStore = await cookies();
  const lastSlug = cookieStore.get("bookzello_last_business_slug")?.value;
  if (lastSlug) {
    const matched = businesses.find((b) => b.slug === lastSlug);
    if (matched) {
      redirect(`/dashboard/${matched.slug}`);
    }
  }

  // Fallback to first authorized workspace
  redirect(`/dashboard/${businesses[0].slug}`);
}
