"use server";

import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPublicSalonProfile } from "@/features/public-booking/server";
import {
  enforcePublicBookingRateLimit,
  publicBookingRateLimiter,
} from "@/features/public-booking/rate-limit";
import {
  aiChatInputSchema,
  updateAiSettingsSchema,
  type AiChatInput,
  type UpdateAiSettingsInput,
} from "./validation";
import { executeMockChat } from "./mock-provider";
import { executeOpenAiChat } from "./openai-provider";
import type {
  BusinessAiSettings,
  PublicAiConfig,
  AiChatResponse,
  AiReceptionistMode,
  ToolExecutionContext,
  SupportedLanguage,
  SalonFaqItem,
} from "./types";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Resolves the active AI Receptionist mode from environment.
 * Defaults to 'disabled' unless explicitly set to 'mock' or 'openai'.
 */
export async function getActiveAiMode(): Promise<AiReceptionistMode> {
  const envMode = process.env.AI_RECEPTIONIST_MODE?.toLowerCase().trim();
  if (envMode === "openai") return "openai";
  if (envMode === "mock") return "mock";
  return "disabled";
}

/**
 * Validates a client-supplied QA gateway secret using timing-safe comparison.
 * Requires AI_QA_GATEWAY_SECRET to be configured with at least 16 characters of entropy.
 * Never logs or exposes the secret.
 */
export async function verifyQaGatewaySecret(providedSecret?: string | null): Promise<boolean> {
  const serverSecret = process.env.AI_QA_GATEWAY_SECRET;
  if (!serverSecret || serverSecret.trim().length < 16 || !providedSecret) {
    return false;
  }
  const cleanServer = serverSecret.trim();
  const cleanProvided = providedSecret.trim();
  if (cleanServer.length !== cleanProvided.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(cleanServer, "utf-8"),
    Buffer.from(cleanProvided, "utf-8")
  );
}

/**
 * Checks if the current execution is within an authorized preview/staging environment.
 * Production (VERCEL_ENV === "production") categorically rejects QA activation.
 */
export async function isPreviewEnvironment(): Promise<boolean> {
  const vercelEnv = process.env.VERCEL_ENV?.toLowerCase().trim();
  const nextVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV?.toLowerCase().trim();
  const explicitPreview = process.env.AI_QA_PREVIEW_MODE === "true";

  if (vercelEnv === "production" && !explicitPreview) {
    return false;
  }

  return (
    vercelEnv === "preview" ||
    nextVercelEnv === "preview" ||
    explicitPreview
  );
}

/**
 * Creates an HMAC-signed QA session token for browser QA testing.
 * Only permissible if in a verified Preview environment and AI_QA_GATEWAY_SECRET is configured.
 * Never exposes the server secret to the browser.
 */
export async function createQaSessionToken(businessSlug: string): Promise<string | null> {
  if (!(await isPreviewEnvironment())) {
    return null;
  }
  if (businessSlug.toLowerCase() !== "bookpilot-qa-salon") {
    return null;
  }
  const serverSecret = process.env.AI_QA_GATEWAY_SECRET;
  if (!serverSecret || serverSecret.trim().length < 16) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    salon: "bookpilot-qa-salon",
    role: "qa_tester",
    iat: now,
    exp: now + 1800, // 30 minutes short-lived expiry
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", serverSecret.trim())
    .update(payloadB64)
    .digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Validates an HMAC-signed QA session token from an HttpOnly cookie.
 * Ensures the token was signed with the server-side secret, is unexpired,
 * belongs strictly to bookpilot-qa-salon, and is running in Preview.
 */
export async function verifyQaSessionToken(
  sessionToken?: string | null,
  businessSlug?: string
): Promise<boolean> {
  if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.includes(".")) {
    return false;
  }
  if (!(await isPreviewEnvironment())) {
    return false;
  }
  if (businessSlug && businessSlug.toLowerCase() !== "bookpilot-qa-salon") {
    return false;
  }
  const serverSecret = process.env.AI_QA_GATEWAY_SECRET;
  if (!serverSecret || serverSecret.trim().length < 16) {
    return false;
  }

  const [payloadB64, signature] = sessionToken.split(".");
  if (!payloadB64 || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", serverSecret.trim())
    .update(payloadB64)
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  const isSigValid = crypto.timingSafeEqual(
    Buffer.from(signature, "utf-8"),
    Buffer.from(expectedSignature, "utf-8")
  );
  if (!isSigValid) {
    return false;
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);
    if (payload.salon !== "bookpilot-qa-salon" || payload.role !== "qa_tester") {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const inMemoryConsumedTickets = new Set<string>();

/**
 * Reset in-memory consumed tickets for testing environments.
 */
export async function _resetConsumedTicketsForTesting(): Promise<void> {
  inMemoryConsumedTickets.clear();
}

/**
 * Generates an HMAC-signed single-use activation ticket for browser QA handoff.
 * Has a strict 2-minute expiration window and unique cryptographic nonce.
 */
export async function createQaActivationTicket(businessSlug: string): Promise<string | null> {
  if (!(await isPreviewEnvironment())) {
    return null;
  }
  if (businessSlug.toLowerCase() !== "bookpilot-qa-salon") {
    return null;
  }
  const serverSecret = process.env.AI_QA_GATEWAY_SECRET;
  if (!serverSecret || serverSecret.trim().length < 16) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    type: "qa_activation_ticket",
    salon: "bookpilot-qa-salon",
    nonce: crypto.randomUUID(),
    iat: now,
    exp: now + 120, // 2-minute validity window
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", serverSecret.trim())
    .update(payloadB64)
    .digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Validates and ATOMICALLY CONSUMES an activation ticket for browser QA handoff.
 * Uses durable PostgreSQL storage (api_rate_limits table) to enforce persistent single-use replay protection.
 * If the ticket was already consumed, returns { success: false, reason: "ALREADY_CONSUMED" }.
 */
export async function consumeQaActivationTicket(
  ticket?: string | null
): Promise<{ success: boolean; reason?: string }> {
  if (!ticket || typeof ticket !== "string" || !ticket.includes(".")) {
    return { success: false, reason: "INVALID_FORMAT" };
  }
  if (!(await isPreviewEnvironment())) {
    return { success: false, reason: "PRODUCTION_DISABLED" };
  }
  const serverSecret = process.env.AI_QA_GATEWAY_SECRET;
  if (!serverSecret || serverSecret.trim().length < 16) {
    return { success: false, reason: "INVALID_SECRET" };
  }

  const [payloadB64, signature] = ticket.split(".");
  if (!payloadB64 || !signature) {
    return { success: false, reason: "INVALID_FORMAT" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", serverSecret.trim())
    .update(payloadB64)
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return { success: false, reason: "INVALID_SIGNATURE" };
  }

  const isSigValid = crypto.timingSafeEqual(
    Buffer.from(signature, "utf-8"),
    Buffer.from(expectedSignature, "utf-8")
  );
  if (!isSigValid) {
    return { success: false, reason: "INVALID_SIGNATURE" };
  }

  let payload: { type?: string; salon?: string; nonce?: string; exp?: number };
  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    payload = JSON.parse(payloadJson);
  } catch {
    return { success: false, reason: "INVALID_PAYLOAD" };
  }

  if (payload.type !== "qa_activation_ticket" || payload.salon !== "bookpilot-qa-salon") {
    return { success: false, reason: "INVALID_TARGET" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) {
    return { success: false, reason: "EXPIRED" };
  }
  if (!payload.nonce || typeof payload.nonce !== "string") {
    return { success: false, reason: "MISSING_NONCE" };
  }

  // ATOMIC PERSISTENT REPLAY PROTECTION
  // Stores unique consumed ticket key in durable shared table.
  const ticketId = payload.nonce;
  const rateKey = `qa_consumed_ticket:${ticketId}`;

  const serviceClient = createServiceClient();
  if (serviceClient) {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    const { error } = await serviceClient.from("api_rate_limits").insert({
      rate_key: rateKey,
      bucket_count: 1,
      window_start: new Date().toISOString(),
      expires_at: expiresAt,
    });

    if (error) {
      // Unique constraint violation (23505) = duplicate replay attempt
      return { success: false, reason: "ALREADY_CONSUMED" };
    }
  } else {
    // In-memory atomic fallback for offline test runners
    if (inMemoryConsumedTickets.has(ticketId)) {
      return { success: false, reason: "ALREADY_CONSUMED" };
    }
    inMemoryConsumedTickets.add(ticketId);
  }

  return { success: true };
}

/**
 * Backward-compatible wrapper for single-use ticket verification.
 */
export async function verifyQaActivationTicket(ticket?: string | null): Promise<boolean> {
  const result = await consumeQaActivationTicket(ticket);
  return result.success;
}

/**
 * Resolves the active AI Receptionist mode for a salon with hardened defense-in-depth:
 *
 * 1. Global AI_RECEPTIONIST_MODE=openai enables OpenAI across all enabled salons.
 * 2. If AI_RECEPTIONIST_MODE=mock (production default), all normal production traffic receives 'mock'.
 * 3. OpenAI mode can ONLY be activated if ALL of the following criteria are met:
 *    a) Deployment environment is Preview (VERCEL_ENV === "preview" or AI_QA_PREVIEW_MODE === "true").
 *       Production (VERCEL_ENV === "production") categorically blocks QA overrides.
 *    b) Explicit preview-only flag AI_QA_OPENAI_ENABLED === "true".
 *    c) Salon is strictly the authorized QA salon ("bookpilot-qa-salon").
 *    d) Request supplies valid server-verified authorization:
 *       - Via server-verified QA gateway secret header (API tests), OR
 *       - Via valid HMAC-signed HttpOnly session cookie (Browser QA).
 *    e) OPENAI_API_KEY is configured on the server.
/**
 * Daily usage circuit breaker for public main-domain canary.
 * Prevents runaway OpenAI spend if public visitors send high volumes to the QA salon page.
 * Approved production cap: 50 requests per day (approx $0.015 - $0.025 / day).
 */
export async function checkCanaryDailyBudget(businessSlug: string): Promise<boolean> {
  const maxDaily = parseInt(process.env.AI_CANARY_MAX_DAILY_REQUESTS || "50", 10);
  const now = new Date();
  const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const rateKey = `canary_daily_limit:${businessSlug.toLowerCase()}:${dateKey}`;

  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      // Try atomic RPC increment
      const { data, error } = await serviceClient.rpc("check_and_increment_rate_limit", {
        p_key: rateKey,
        p_max_requests: maxDaily,
        p_window_seconds: 86400,
      });

      if (!error && data && typeof data === "object") {
        const payload = data as { allowed?: boolean; current_count?: number };
        if (typeof payload.allowed === "boolean") {
          return payload.allowed;
        }
      }

      // Direct atomic table check and upsert fallback if RPC is unavailable
      const { data: record } = await serviceClient
        .from("api_rate_limits")
        .select("bucket_count")
        .eq("rate_key", rateKey)
        .maybeSingle();

      const currentCount = record?.bucket_count || 0;
      if (currentCount >= maxDaily) {
        return false;
      }

      await serviceClient.from("api_rate_limits").upsert(
        {
          rate_key: rateKey,
          bucket_count: currentCount + 1,
          window_start: now.toISOString(),
          expires_at: new Date(now.getTime() + 86400 * 1000).toISOString(),
        },
        { onConflict: "rate_key" }
      );
      return true;
    } catch {
      // Fall through to in-memory check
    }
  }

  // In-memory fallback for test environments
  const result = publicBookingRateLimiter.checkLimit(rateKey, maxDaily, 86400);
  return result.allowed;
}

/**
 * Safely inspects current Canary daily usage without credentials exposure or counter mutations.
 */
export async function getCanaryDailyUsage(businessSlug: string): Promise<{ count: number; max: number; exhausted: boolean }> {
  const maxDaily = parseInt(process.env.AI_CANARY_MAX_DAILY_REQUESTS || "50", 10);
  const now = new Date();
  const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const rateKey = `canary_daily_limit:${businessSlug.toLowerCase()}:${dateKey}`;

  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      const { data } = await serviceClient
        .from("api_rate_limits")
        .select("bucket_count")
        .eq("rate_key", rateKey)
        .maybeSingle();

      const count = data?.bucket_count || 0;
      return { count, max: maxDaily, exhausted: count >= maxDaily };
    } catch {
      // Fall through to in-memory check
    }
  }

  const memoryState = publicBookingRateLimiter.checkLimit(rateKey, maxDaily, 86400);
  return {
    count: maxDaily - memoryState.remaining,
    max: maxDaily,
    exhausted: !memoryState.allowed,
  };
}

/**
 * Resolves the active AI Receptionist mode for a salon with hardened defense-in-depth:
 *
 * 1. Global AI_RECEPTIONIST_MODE=openai enables OpenAI across all salons.
 * 2. If AI_RECEPTIONIST_MODE=mock (production default), all normal production traffic receives 'mock'.
 * 3. MAIN-DOMAIN CANARY (Phase C):
 *    If AI_CANARY_OPENAI_ENABLED === "true":
 *      - Strict Salon Allowlist: ONLY "bookpilot-qa-salon" is eligible. All other salons receive 'mock'.
 *      - Server-Side Kill Switch: Setting AI_CANARY_OPENAI_ENABLED="false" or removing it immediately reverts to 'mock'.
 *      - Circuit Breaker: Enforces hard daily request budget on canary (default 200 requests/day).
 *      - Requires OPENAI_API_KEY configured on the server.
 * 4. PREVIEW QA GATEWAY:
 *    In Preview when AI_QA_OPENAI_ENABLED === "true" and authorized via secret/cookie.
 * 5. All other requests strictly receive 'mock'.
 */
export async function resolveSalonAiMode(
  businessSlug: string,
  baseMode: AiReceptionistMode,
  providedQaSecret?: string | null,
  qaSessionToken?: string | null
): Promise<AiReceptionistMode> {
  if (baseMode === "openai") return "openai";
  if (baseMode === "disabled") return "disabled";

  const isQaSalon = businessSlug.toLowerCase() === "bookpilot-qa-salon";
  const isOpenAiConfigured = Boolean(
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ""
  );

  // PATH A: Production Canary Mode for bookpilot-qa-salon (Phase C)
  // Activated strictly by server-side env flag AI_CANARY_OPENAI_ENABLED === "true"
  if (process.env.AI_CANARY_OPENAI_ENABLED === "true") {
    // Strict Tenant Isolation: ONLY bookpilot-qa-salon can ever be canary-activated
    if (isQaSalon && isOpenAiConfigured) {
      // Check Daily Canary Usage Circuit Breaker
      const isBudgetAvailable = await checkCanaryDailyBudget(businessSlug);
      if (isBudgetAvailable) {
        return "openai";
      } else {
        console.warn(`[Canary Circuit Breaker] Daily request limit reached for ${businessSlug}. Falling back to mock.`);
      }
    }
    // All other salons remain mock
    return "mock";
  }

  // PATH B: Preview Environment QA Gateway (with cryptographic authorization)
  if (await isPreviewEnvironment()) {
    if (process.env.AI_QA_OPENAI_ENABLED === "true" && isQaSalon && isOpenAiConfigured) {
      const isDirectAuthorized = await verifyQaGatewaySecret(providedQaSecret);
      const isSessionAuthorized = await verifyQaSessionToken(qaSessionToken, businessSlug);

      if (isDirectAuthorized || isSessionAuthorized) {
        return "openai";
      }
    }
  }

  // Default fallback
  return "mock";
}

/**
 * Fetches the public AI receptionist configuration for a salon.
 * Resilient to missing database migration (falls back safely to disabled defaults).
 */
export async function getPublicAiConfig(
  businessSlug: string
): Promise<ActionResult<PublicAiConfig>> {
  const mode = await getActiveAiMode();
  const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const defaultWelcome = "Hello! I am your virtual receptionist. How can I assist you with services, pricing, or bookings today?";

  const fallbackConfig: PublicAiConfig = {
    enabled: mode !== "disabled",
    mode,
    defaultLanguage: "en",
    welcomeMessage: defaultWelcome,
    faqs: [],
    modelName,
  };

  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: true, data: fallbackConfig };
    }

    // Try RPC first
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "get_public_ai_settings_by_slug",
      { p_slug: businessSlug }
    );

    if (!rpcErr && rpcData) {
      if (
        typeof rpcData === "object" &&
        rpcData !== null &&
        "success" in rpcData &&
        (rpcData as { success: boolean; code?: string }).success === false
      ) {
        const failData = rpcData as { success: boolean; code?: string; message?: string };
        if (failData.code === "SALON_NOT_FOUND") {
          return { success: false, error: "Salon not found", code: "NOT_FOUND" };
        }
      }

      const payload =
        typeof rpcData === "object" && rpcData !== null && "data" in rpcData
          ? (rpcData as { success: boolean; data: Record<string, unknown> }).data
          : Array.isArray(rpcData)
          ? rpcData[0]
          : rpcData;

      if (payload && typeof payload === "object") {
        return {
          success: true,
          data: {
            enabled: mode !== "disabled" && Boolean(payload.ai_receptionist_enabled),
            mode,
            defaultLanguage: (payload.default_language as SupportedLanguage) || "en",
            welcomeMessage: (payload.welcome_message as string) || defaultWelcome,
            faqs: Array.isArray(payload.faqs) ? (payload.faqs as SalonFaqItem[]) : [],
            modelName,
          },
        };
      }
    }

    // Direct query fallback
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (!biz) {
      return { success: false, error: "Salon not found", code: "NOT_FOUND" };
    }

    // Enforce existing Bookzello public visibility rule:
    // A salon is only publicly accessible if its business_booking_policies has online_booking_enabled = TRUE.
    const { data: policy } = await supabase
      .from("business_booking_policies")
      .select("online_booking_enabled")
      .eq("business_id", biz.id)
      .maybeSingle();

    if (!policy || !policy.online_booking_enabled) {
      return {
        success: true,
        data: {
          enabled: false,
          mode: "disabled",
          defaultLanguage: "en",
          welcomeMessage: defaultWelcome,
          faqs: [],
          modelName,
        },
      };
    }

    const { data: settings } = await supabase
      .from("business_ai_settings")
      .select("ai_receptionist_enabled, default_language, welcome_message, faqs")
      .eq("business_id", biz.id)
      .maybeSingle();

    if (settings) {
      return {
        success: true,
        data: {
          enabled: mode !== "disabled" && Boolean(settings.ai_receptionist_enabled),
          mode,
          defaultLanguage: settings.default_language || "en",
          welcomeMessage: settings.welcome_message || defaultWelcome,
          faqs: Array.isArray(settings.faqs) ? settings.faqs : [],
          modelName,
        },
      };
    }

    return { success: true, data: fallbackConfig };
  } catch {
    // If table does not exist or network issue, return graceful fallback
    return { success: true, data: fallbackConfig };
  }
}

/**
 * Loads AI settings for owner dashboard settings tab.
 */
export async function getOwnerAiSettings(
  businessId: string
): Promise<ActionResult<BusinessAiSettings>> {
  const mode = await getActiveAiMode();
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database unavailable." };
    }

    const { data, error } = await supabase
      .from("business_ai_settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // Table may not exist yet if migration pending
      return {
        success: true,
        data: {
          business_id: businessId,
          ai_receptionist_enabled: mode !== "disabled",
          default_language: "en",
          welcome_message: null,
          faqs: [],
        },
      };
    }

    return {
      success: true,
      data: data || {
        business_id: businessId,
        ai_receptionist_enabled: mode !== "disabled",
        default_language: "en",
        welcome_message: null,
        faqs: [],
      },
    };
  } catch {
    return {
      success: true,
      data: {
        business_id: businessId,
        ai_receptionist_enabled: mode !== "disabled",
        default_language: "en",
        welcome_message: null,
        faqs: [],
      },
    };
  }
}

/**
 * Saves AI settings from owner dashboard.
 */
export async function updateOwnerAiSettings(
  input: UpdateAiSettingsInput
): Promise<ActionResult<BusinessAiSettings>> {
  const parsed = updateAiSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid settings input.",
    };
  }

  const { businessId, ai_receptionist_enabled, default_language, welcome_message, faqs } =
    parsed.data;

  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: "Database connection unavailable." };
    }

    const { data, error } = await supabase
      .from("business_ai_settings")
      .upsert(
        {
          business_id: businessId,
          ai_receptionist_enabled,
          default_language,
          welcome_message: welcome_message || null,
          faqs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "business_id" }
      )
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Could not save AI settings: ${error.message}. (Database migration 0013 may be required).`,
      };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update AI settings.",
    };
  }
}

/**
 * Handles incoming customer chat messages with tenant verification, rate limits,
 * and dispatching to mock or OpenAI provider.
 */
export async function processCustomerAiChat(
  input: AiChatInput,
  clientIp?: string,
  providedQaSecret?: string | null,
  qaSessionToken?: string | null
): Promise<AiChatResponse> {
  const parsed = aiChatInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid chat request format.",
      toolsUsed: [],
      mode: "disabled",
      code: "VALIDATION_ERROR",
    };
  }

  const { businessSlug, messages, draftToken } = parsed.data;

  // Rate Limiting (max 20 messages per min per IP/slug)
  const rateResult = await enforcePublicBookingRateLimit({
    identifier: clientIp || "ai-customer",
    businessSlug,
    action: "ai_chat",
    limit: 20,
    windowSeconds: 60,
  });

  if (!rateResult.allowed) {
    return {
      success: false,
      message: "You've sent several messages quickly. Please wait a moment before sending another.",
      toolsUsed: [],
      mode: "disabled",
      code: "RATE_LIMITED",
    };
  }

  // Load public salon profile
  const profileRes = await getPublicSalonProfile(businessSlug);
  if (!profileRes.success || !profileRes.data) {
    return {
      success: false,
      message: "The requested salon could not be found.",
      toolsUsed: [],
      mode: "disabled",
      code: "SALON_NOT_FOUND",
    };
  }

  const salon = profileRes.data;

  // Load AI configuration for this salon
  const configRes = await getPublicAiConfig(businessSlug);
  const config = configRes.data;

  const rawMode = config?.mode || (await getActiveAiMode());
  const mode = await resolveSalonAiMode(
    businessSlug,
    rawMode,
    providedQaSecret,
    qaSessionToken
  );

  if (mode === "disabled" || !config?.enabled) {
    return {
      success: false,
      message: "The AI receptionist is currently disabled for this salon. Please use the booking wizard directly.",
      toolsUsed: [],
      mode: "disabled",
      code: "AI_DISABLED",
    };
  }

  const ctx: ToolExecutionContext = {
    businessId: salon.id,
    businessSlug: salon.slug,
    businessName: salon.name,
    timezone: salon.timezone,
    currency: salon.currency,
    draftToken,
  };

  const faqs = config?.faqs || [];
  const defaultLang = config?.defaultLanguage || "en";

  let result: AiChatResponse;
  if (mode === "mock") {
    result = await executeMockChat(ctx, messages, faqs, draftToken);
  } else if (mode === "openai") {
    result = await executeOpenAiChat(ctx, messages, faqs, defaultLang, draftToken);
  } else {
    result = {
      success: false,
      message: "AI Receptionist is currently unavailable.",
      toolsUsed: [],
      mode: "disabled",
    };
  }

  // Defect R-001: Explicit provider and model visibility in API response
  result.provider = mode === "openai" ? "openai" : mode === "mock" ? "mock" : "disabled";
  result.model =
    mode === "openai"
      ? process.env.OPENAI_MODEL || "gpt-4o-mini"
      : "heuristic-mock";

  return result;
}
