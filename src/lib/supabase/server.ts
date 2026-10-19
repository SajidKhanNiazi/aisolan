import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
