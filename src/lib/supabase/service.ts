import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Creates a server-only Supabase client utilizing the SUPABASE_SERVICE_ROLE_KEY.
 * This client is strictly used in trusted server environments (Server Actions & Route Handlers)
 * to execute secure public booking RPCs and durable shared rate-limiting.
 * Never bundled or exposed to the client-side browser.
 */
export function createServiceClient() {
  const env = getEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!env.supabase.url) {
    return null;
  }

  if (serviceRoleKey && serviceRoleKey.trim() !== "") {
    return createSupabaseClient(env.supabase.url, serviceRoleKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return null;
}
