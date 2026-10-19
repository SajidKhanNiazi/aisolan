import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

/**
 * Creates a browser-safe Supabase client for client-side components.
 * Strictly uses the validated publishable key.
 * Never initializes if a secret key is detected.
 */
export function createClient() {
  const env = getEnv();

  if (env.supabase.error) {
    console.error("[Supabase Client Error]:", env.supabase.error);
    return null;
  }

  if (!env.supabase.isConfigured || !env.supabase.url || !env.supabase.publishableKey) {
    return null;
  }

  return createBrowserClient(env.supabase.url, env.supabase.publishableKey);
}
