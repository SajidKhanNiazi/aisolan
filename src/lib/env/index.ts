/**
 * BookPilot AI — Environment Variable Validation & Security Guard
 * Enforces strict key validation to prevent privileged secret keys from ever being exposed to clients.
 */

export interface KeyValidationResult {
  valid: boolean;
  key: string | null;
  error: string | null;
}

/**
 * Validates that a key assigned to public variables is strictly a publishable/anon key.
 * Strictly rejects keys starting with 'sb_secret_' or containing 'service_role'.
 * Never prints or leaks raw key values in error messages.
 */
export function validatePublishableKey(key: string | null | undefined): KeyValidationResult {
  if (!key || key.trim() === "") {
    return { valid: false, key: null, error: "Key is missing or empty." };
  }

  const trimmed = key.trim();

  // CRITICAL SECURITY GUARD: Reject any secret or service-role keys
  if (trimmed.startsWith("sb_secret_") || trimmed.includes("service_role")) {
    return {
      valid: false,
      key: null,
      error: "Security Violation: Privileged secret key detected in a public variable. Only publishable keys (starting with 'sb_publishable_') are allowed.",
    };
  }

  // Modern Supabase Publishable Key
  if (trimmed.startsWith("sb_publishable_")) {
    if (trimmed.length < 30) {
      return { valid: false, key: null, error: "Malformed publishable key: Key length is invalid." };
    }
    return { valid: true, key: trimmed, error: null };
  }

  // Legacy Supabase Anon JWT format (explicitly validated)
  if (trimmed.startsWith("eyJ")) {
    const parts = trimmed.split(".");
    if (parts.length !== 3) {
      return { valid: false, key: null, error: "Malformed anon key: Invalid JWT structure." };
    }
    return { valid: true, key: trimmed, error: null };
  }

  return {
    valid: false,
    key: null,
    error: "Malformed key: Key must begin with 'sb_publishable_' or valid anon JWT format.",
  };
}

export interface AppEnv {
  appUrl: string;
  supabase: {
    url: string | null;
    publishableKey: string | null;
    isConfigured: boolean;
    error: string | null;
  };
  nodeEnv: string;
}

/**
 * Validates environment variables safely.
 * Non-blocking for static builds when Supabase credentials are not yet configured.
 */
export function getEnv(): AppEnv {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  const publishableKeyRaw = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || null;
  const anonKeyRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
  const nodeEnv = process.env.NODE_ENV || "development";

  // Conflict detection: if both variables exist with different values
  if (
    publishableKeyRaw &&
    anonKeyRaw &&
    publishableKeyRaw.trim() !== anonKeyRaw.trim()
  ) {
    return {
      appUrl,
      supabase: {
        url: supabaseUrl,
        publishableKey: null,
        isConfigured: false,
        error: "Conflicting environment variables: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are both set with differing values.",
      },
      nodeEnv,
    };
  }

  const candidateKey = publishableKeyRaw || anonKeyRaw;

  if (!candidateKey || candidateKey.trim() === "") {
    return {
      appUrl,
      supabase: {
        url: supabaseUrl,
        publishableKey: null,
        isConfigured: false,
        error: null,
      },
      nodeEnv,
    };
  }

  const validation = validatePublishableKey(candidateKey);

  if (!validation.valid) {
    return {
      appUrl,
      supabase: {
        url: supabaseUrl,
        publishableKey: null,
        isConfigured: false,
        error: validation.error,
      },
      nodeEnv,
    };
  }

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== "" &&
    validation.valid &&
    validation.key
  );

  return {
    appUrl,
    supabase: {
      url: supabaseUrl,
      publishableKey: validation.key,
      isConfigured,
      error: null,
    },
    nodeEnv,
  };
}

export const env = getEnv();
