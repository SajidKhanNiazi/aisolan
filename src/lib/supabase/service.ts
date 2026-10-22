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
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    env.supabase.url ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    return null;
  }

  if (rawKey && rawKey.trim() !== "") {
    const cleanKey = rawKey.replace(/^["']|["']$/g, "").trim();
    return createSupabaseClient(supabaseUrl, cleanKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return null;
}
