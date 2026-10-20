import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Creates a server-side Supabase client utilizing Next.js cookies.
 * Strictly uses the validated publishable key for Phase 1A.
 * Never initializes if a secret key is detected.
 */
export async function createClient() {
  const env = getEnv();

  if (env.supabase.error) {
    console.error("[Supabase Server Error]:", env.supabase.error);
    return null;
  }

  if (!env.supabase.isConfigured || !env.supabase.url || !env.supabase.publishableKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabase.url, env.supabase.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored when called from a Server Component.
        }
      },
    },
  });
}

/**
 * Returns the authenticated user for the current request, memoized via React cache().
 * If multiple server components, layouts, or queries call getAuthenticatedUser() during
 * the same render pass, only ONE network request is made to Supabase Auth API.
 * Returns null immediately if no Supabase auth token cookie exists.
 */
export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  try {
    const cookieStore = await cookies();
    const hasAuthCookie = cookieStore.getAll().some(
      (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
    );

    if (!hasAuthCookie) {
      return null;
    }

    const supabase = await createClient();
    if (!supabase) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.warn("[getAuthenticatedUser] Auth check warning:", err);
    return null;
  }
});
