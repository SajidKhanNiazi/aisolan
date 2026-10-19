import Link from "next/link";
import { connection } from "next/server";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { getUserBusinesses } from "@/features/organizations/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const instant = false;

export default async function BusinessesListPage() {
  await connection();
  const businesses = await getUserBusinesses();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your Workspaces
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage the businesses and salons where you hold authorized memberships.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/businesses/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Workspace</span>
          </Link>
        </div>
      </div>

      {businesses.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle>No Workspaces Yet</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              You do not belong to any active business workspaces yet. Create your first workspace to start managing your services and bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/businesses/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Create Workspace
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map((biz) => (
            <Card key={biz.id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{biz.name}</CardTitle>
                      <CardDescription className="text-xs">
                        slug: /{biz.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(biz.role)} className="uppercase text-[10px] font-bold">
                    {biz.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="capitalize">Type: {biz.business_type}</span>
                  <Link
                    href={`/dashboard/${biz.slug}`}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
