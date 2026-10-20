import { getBusinessServices } from "@/features/services/server";
import { ServicesManager } from "@/components/dashboard/services/services-manager";
import { notFound } from "next/navigation";
import { connection } from "next/server";

interface ServicesPageProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  await connection();
  const { businessSlug } = await params;

  const data = await getBusinessServices(businessSlug);
  if (!data.businessId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ServicesManager
        initialServices={data.services}
        categories={data.categories}
        businessId={data.businessId}
        businessSlug={businessSlug}
        currency={data.currency}
      />
    </div>
  );
}
