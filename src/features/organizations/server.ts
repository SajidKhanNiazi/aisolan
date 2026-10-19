"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createBusinessSchema,
  updateProfileSchema,
  type CreateBusinessInput,
  type UpdateProfileInput,
} from "./validation";
import type { BusinessWithRole, UserProfile } from "./types";

/**
 * Retrieves all businesses where the currently authenticated user has an active membership.
 */
export async function getUserBusinesses(): Promise<BusinessWithRole[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("business_members")
    .select(`
      role,
      businesses (
        id,
        name,
        slug,
        business_type,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id);

  if (error || !data) {
    return [];
  }

  // Flatten the relation
  const businessesWithRole: BusinessWithRole[] = [];
  for (const item of data) {
    const b = item.businesses as unknown as BusinessWithRole;
    if (b && b.id) {
      businessesWithRole.push({
        ...b,
        role: item.role,
      });
    }
  }

  return businessesWithRole;
}

/**
 * Retrieves a specific business by slug only if the authenticated user has an authorized membership.
 * Enforces server-side authorization and tenant scoping.
 */
export async function getBusinessBySlug(
  slug: string
): Promise<BusinessWithRole | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch business by slug
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (bizError || !business) {
    return null;
  }

  // 2. Verify membership explicitly server-side
  const { data: member, error: memError } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (memError || !member) {
    return null;
  }

  return {
    ...business,
    role: member.role,
  };
}

/**
 * Atomically creates a business and registers the authenticated creator as the initial 'owner'.
 */
export async function createBusinessWithOwner(
  input: CreateBusinessInput
): Promise<{ success: boolean; data?: BusinessWithRole; error?: string }> {
  const parsed = createBusinessSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid input data",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Database client is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized: Please log in first." };
  }

  // Attempt atomic creation via PostgreSQL RPC function
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_business_with_owner",
    {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
      p_business_type: parsed.data.business_type,
    }
  );

  if (!rpcError && rpcData) {
    return { success: true, data: rpcData as BusinessWithRole };
  }

  // If RPC is pending database migration on hosted instance, execute safe atomic fallback:
  if (rpcError) {
    // Check if error is slug conflict
    if (rpcError.code === "23505" || rpcError.message?.includes("already taken")) {
      return {
        success: false,
        error: `The slug "${parsed.data.slug}" is already taken. Please choose another.`,
      };
    }

    // Direct fallback insert with creator scoping
    const { data: newBiz, error: insertBizError } = await supabase
      .from("businesses")
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        business_type: parsed.data.business_type,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertBizError || !newBiz) {
      if (insertBizError?.code === "23505") {
        return {
          success: false,
          error: `The slug "${parsed.data.slug}" is already taken. Please choose another.`,
        };
      }
      return {
        success: false,
        error: insertBizError?.message || rpcError.message || "Failed to create business workspace.",
      };
    }

    // Insert owner membership
    const { error: insertMemError } = await supabase
      .from("business_members")
      .insert({
        business_id: newBiz.id,
        user_id: user.id,
        role: "owner",
      });

    if (insertMemError) {
      // Rollback business if membership failed
      await supabase.from("businesses").delete().eq("id", newBiz.id);
      return {
        success: false,
        error: "Failed to initialize business owner membership.",
      };
    }

    return {
      success: true,
      data: {
        ...newBiz,
        role: "owner",
      },
    };
  }

  return { success: false, error: "Unexpected error during business creation." };
}

/**
 * Retrieves the current user's profile.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    // Return fallback profile derived from auth user metadata
    return {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: user.created_at,
      updated_at: user.created_at,
    };
  }

  return data;
}

/**
 * Updates the authenticated user's profile.
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<{ success: boolean; error?: string; data?: UserProfile }> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid profile data",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Database client is not available." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized: Please log in." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: parsed.data.full_name,
      avatar_url: parsed.data.avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to update profile.",
    };
  }

  return { success: true, data };
}
