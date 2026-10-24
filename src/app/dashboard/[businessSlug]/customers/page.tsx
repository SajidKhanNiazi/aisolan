import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getFullBusinessConfig } from "@/features/organizations/settings-server";
import { getBusinessServices } from "@/features/services/server";
import { getBusinessStaff } from "@/features/staff/server";
import { listCustomersWithMetrics } from "@/features/appointments/server";
import { CustomerDirectory } from "@/components/dashboard/customers/customer-directory";

interface CustomersPageProps {
  params: Promise<{
    businessSlug: string;
  }>;
}

export const metadata = {
  title: "Customer Directory & Visit History — Bookzello",
  description:
    "View and search salon clients, inspect appointment histories, and create customer records.",
};

export const instant = false;

export default async function CustomersPage({ params }: CustomersPageProps) {
  await connection();
  const { businessSlug } = await params;

  // 1. Authorize caller and fetch business configuration
  const config = await getFullBusinessConfig(businessSlug);
  if (!config) {
    notFound();
  }

  const tz = config.business.timezone || "Europe/London";
  const currency = config.business.currency || "GBP";

  // 2. Fetch active services, staff, and customers list with metrics
  const [servicesData, staffData, customersRes] = await Promise.all([
    getBusinessServices(businessSlug, false),
    getBusinessStaff(businessSlug, false),
    listCustomersWithMetrics(businessSlug),
  ]);

  const initialCustomers = customersRes.success && customersRes.customers ? customersRes.customers : [];

  return (
    <div className="max-w-7xl mx-auto py-4">
      <CustomerDirectory
        businessId={config.business.id}
        businessSlug={businessSlug}
        businessTimezone={tz}
        currency={currency}
        initialCustomers={initialCustomers}
        staffList={staffData.staff}
        servicesList={servicesData.services}
      />
    </div>
  );
}
