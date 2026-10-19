/**
 * BookPilot AI — Environment Variable Validation & Configuration
 * Validates browser-safe and server-side environment variables without leaking secret values.
 */

export interface AppEnv {
  appUrl: string;
  supabase: {
    url: string | null;
    anonKey: string | null;
    isConfigured: boolean;
  };
  nodeEnv: string;
}

/**
 * Validates and returns parsed environment variables safely.
 * Non-blocking for static builds when Supabase credentials are not yet configured.
 */
export function getEnv(): AppEnv {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
  const nodeEnv = process.env.NODE_ENV || "development";

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== "" &&
    supabaseAnonKey &&
    supabaseAnonKey.trim() !== ""
  );

  return {
    appUrl,
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      isConfigured,
    },
    nodeEnv,
  };
}

export const env = getEnv();
