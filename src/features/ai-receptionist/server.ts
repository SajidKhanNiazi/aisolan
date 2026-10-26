"use server";

import { createClient } from "@/lib/supabase/server";
import { getPublicSalonProfile } from "@/features/public-booking/server";
import { enforcePublicBookingRateLimit } from "@/features/public-booking/rate-limit";
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
 * Fetches the public AI receptionist configuration for a salon.
 * Resilient to missing database migration (falls back safely to disabled defaults).
 */
export async function getPublicAiConfig(
  businessSlug: string
): Promise<ActionResult<PublicAiConfig>> {
  const mode = await getActiveAiMode();
  const modelName = process.env.OPENAI_MODEL || "gpt-6-luna";

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
  clientIp?: string
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

  const mode = config?.mode || (await getActiveAiMode());

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
  };

  const faqs = config?.faqs || [];
  const defaultLang = config?.defaultLanguage || "en";

  if (mode === "mock") {
    return executeMockChat(ctx, messages, faqs, draftToken);
  }

  if (mode === "openai") {
    return executeOpenAiChat(ctx, messages, faqs, defaultLang);
  }

  return {
    success: false,
    message: "AI Receptionist is currently unavailable.",
    toolsUsed: [],
    mode: "disabled",
  };
}
