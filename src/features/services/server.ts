"use server";

import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  serviceSchema,
  serviceCategorySchema,
  type ServiceInput,
  type ServiceCategoryInput,
} from "./validation";
import type { ServiceWithCategory, ServiceCategory } from "./types";

/**
 * Enforces server-side tenant owner/manager role authorization.
 */
async function verifyManagerOrOwnerRole(
  businessId: string
): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { authorized: false, error: "Unauthorized: Please log in." };

  const supabase = await createClient();
  if (!supabase) return { authorized: false, error: "Database client is not available." };

  const { data: member, error } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (error || !member || (member.role !== "owner" && member.role !== "manager")) {
    return {
      authorized: false,
      userId: user.id,
      error: "Forbidden: Only business owners and managers can modify services.",
    };
  }

  return { authorized: true, userId: user.id };
}

/**
 * Fetches all services and categories for an authenticated workspace.
 */
export async function getBusinessServices(slug: string): Promise<{
  services: ServiceWithCategory[];
  categories: ServiceCategory[];
  businessId: string | null;
  currency: string;
}> {
  const user = await getAuthenticatedUser();
  if (!user) return { services: [], categories: [], businessId: null, currency: "GBP" };

  const supabase = await createClient();
  if (!supabase) return { services: [], categories: [], businessId: null, currency: "GBP" };

  // 1. Fetch business and verify membership
  const { data: business } = await supabase
    .from("businesses")
    .select("id, currency")
    .eq("slug", slug)
    .single();

  if (!business) return { services: [], categories: [], businessId: null, currency: "GBP" };

  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (!member) return { services: [], categories: [], businessId: null, currency: "GBP" };

  // 2. Fetch categories
  const { data: categoriesData } = await supabase
    .from("service_categories")
    .select("*")
    .eq("business_id", business.id)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const categories: ServiceCategory[] = categoriesData || [];

  // 3. Fetch services (exclude archived by default)
  const { data: servicesData } = await supabase
    .from("services")
    .select("*, service_categories(*)")
    .eq("business_id", business.id)
    .eq("is_archived", false)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  // 4. Fetch assigned staff counts per service
  const { data: staffServicesData } = await supabase
    .from("staff_services")
    .select("service_id")
    .eq("business_id", business.id);

  const staffCountMap = new Map<string, number>();
  if (staffServicesData) {
    for (const row of staffServicesData) {
      staffCountMap.set(row.service_id, (staffCountMap.get(row.service_id) || 0) + 1);
    }
  }

  const services: ServiceWithCategory[] = (servicesData || []).map((s) => ({
    id: s.id,
    business_id: s.business_id,
    category_id: s.category_id,
    name: s.name,
    description: s.description,
    price_amount: s.price_amount,
    currency: s.currency || business.currency || "GBP",
    duration_minutes: s.duration_minutes,
    buffer_minutes: s.buffer_minutes,
    is_active: s.is_active,
    is_archived: s.is_archived,
    display_order: s.display_order,
    created_at: s.created_at,
    updated_at: s.updated_at,
    category: s.service_categories || null,
    assigned_staff_count: staffCountMap.get(s.id) || 0,
  }));

  return {
    services,
    categories,
    businessId: business.id,
    currency: business.currency || "GBP",
  };
}

/**
 * Creates a new service category for a business.
 */
export async function createServiceCategory(
  businessId: string,
  input: ServiceCategoryInput,
  slug: string
): Promise<{ success: boolean; category?: ServiceCategory; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = serviceCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid category data" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("service_categories")
    .insert({
      business_id: businessId,
      name: parsed.data.name,
      display_order: parsed.data.display_order,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A category with this name already exists in your salon." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/${slug}/services`);
  return { success: true, category: data };
}

/**
 * Creates a new service.
 */
export async function createService(
  businessId: string,
  input: ServiceInput,
  slug: string
): Promise<{ success: boolean; service?: ServiceWithCategory; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid service data" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("services")
    .insert({
      business_id: businessId,
      category_id: parsed.data.category_id || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price_amount: parsed.data.price_amount,
      currency: parsed.data.currency,
      duration_minutes: parsed.data.duration_minutes,
      buffer_minutes: parsed.data.buffer_minutes,
      is_active: parsed.data.is_active,
    })
    .select("*, service_categories(*)")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/services`);
  return { success: true, service: data };
}

/**
 * Updates an existing service.
 */
export async function updateService(
  businessId: string,
  serviceId: string,
  input: ServiceInput,
  slug: string
): Promise<{ success: boolean; service?: ServiceWithCategory; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid service data" };
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { data, error } = await supabase
    .from("services")
    .update({
      category_id: parsed.data.category_id || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price_amount: parsed.data.price_amount,
      currency: parsed.data.currency,
      duration_minutes: parsed.data.duration_minutes,
      buffer_minutes: parsed.data.buffer_minutes,
      is_active: parsed.data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("business_id", businessId) // Strict tenant check
    .select("*, service_categories(*)")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/services`);
  return { success: true, service: data };
}

/**
 * Safely soft-deletes (archives) a service so historical appointment references are preserved.
 */
export async function archiveService(
  businessId: string,
  serviceId: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase
    .from("services")
    .update({
      is_archived: true,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("business_id", businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/services`);
  return { success: true };
}

/**
 * Toggles a service's active status.
 */
export async function toggleServiceStatus(
  businessId: string,
  serviceId: string,
  isActive: boolean,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyManagerOrOwnerRole(businessId);
  if (!authCheck.authorized) return { success: false, error: authCheck.error };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase
    .from("services")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("business_id", businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/${slug}/services`);
  return { success: true };
}
