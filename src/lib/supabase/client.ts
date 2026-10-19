import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser-safe Supabase client for client-side components.
 * Only references NEXT_PUBLIC_* variables.
 * Returns null if Supabase environment variables have not been configured yet.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
