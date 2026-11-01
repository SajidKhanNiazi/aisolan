import { createServiceClient } from "@/lib/supabase/service";
import { getWhatsAppConfig, isSalonAllowedForWhatsAppPilot } from "./config";

export interface TenantResolutionResult {
  allowed: boolean;
  businessId?: string;
  businessSlug?: string;
  businessName?: string;
  timezone?: string;
  currency?: string;
  connectionId?: string;
  aiEnabled?: boolean;
  bookingEnabled?: boolean;
  phoneNumberId?: string;
  reason?: string;
}

// In-memory tenant connection registry for tests or offline execution
const mockConnectionRegistry = new Map<string, TenantResolutionResult>();

export function registerMockWhatsAppTenant(phoneNumberId: string, tenant: TenantResolutionResult): void {
  mockConnectionRegistry.set(phoneNumberId, tenant);
}

export function clearMockWhatsAppTenants(): void {
  mockConnectionRegistry.clear();
}

/**
 * Resolves the authorized salon tenant from Meta's validated phone_number_id.
 * Strict multi-tenant security:
 * - Direct mapping from official Meta phone_number_id to tenant organization.
 * - Customer cannot spoof or dictate their target salon.
 * - Enforces active connection status and pilot salon allowlist.
 */
export async function resolveTenantFromPhoneNumberId(
  phoneNumberId: string
): Promise<TenantResolutionResult> {
  if (!phoneNumberId || phoneNumberId.trim() === "") {
    return { allowed: false, reason: "Missing or empty phone_number_id" };
  }

  const cleanPhoneId = phoneNumberId.trim();

  // 1. Check in-memory registry (for tests and offline development)
  const mockMatch = mockConnectionRegistry.get(cleanPhoneId);
  if (mockMatch) {
    if (mockMatch.businessSlug && !isSalonAllowedForWhatsAppPilot(mockMatch.businessSlug)) {
      return { allowed: false, reason: `Salon '${mockMatch.businessSlug}' is not permitted in the current pilot allowlist` };
    }
    return mockMatch;
  }

  const config = getWhatsAppConfig();

  // 2. Authoritative Database lookup in `public.whatsapp_connections`
  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      const { data: conn, error: connError } = await serviceClient
        .from("whatsapp_connections")
        .select("id, business_id, phone_number_id, connection_status, ai_enabled, booking_enabled, businesses (id, name, slug, timezone, currency)")
        .eq("phone_number_id", cleanPhoneId)
        .eq("connection_status", "active")
        .maybeSingle();

      if (connError) {
        return { allowed: false, reason: `Database error resolving connection: ${connError.message}` };
      }

      if (!conn || !conn.businesses) {
        return { allowed: false, reason: `Phone number ID '${cleanPhoneId}' is not associated with any salon connection` };
      }

      // Require active AI on the connection
      if (!conn.ai_enabled) {
        return {
          allowed: false,
          reason: `WhatsApp connection for phone number ID '${cleanPhoneId}' has AI disabled or is suspended`,
        };
      }

      const biz = Array.isArray(conn.businesses) ? conn.businesses[0] : conn.businesses;
      if (!biz || !isSalonAllowedForWhatsAppPilot(biz.slug)) {
        return {
          allowed: false,
          reason: `Salon '${biz?.slug}' is not permitted in the current pilot allowlist`,
        };
      }

      return {
        allowed: true,
        businessId: biz.id,
        businessSlug: biz.slug,
        businessName: biz.name,
        timezone: biz.timezone || "Europe/London",
        currency: biz.currency || "GBP",
        connectionId: conn.id, // Authoritative UUID from public.whatsapp_connections
        aiEnabled: conn.ai_enabled,
        bookingEnabled: conn.booking_enabled && config.bookingWritesEnabled,
        phoneNumberId: cleanPhoneId,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error resolving tenant connection";
      return { allowed: false, reason: msg };
    }
  }

  // 3. Offline test environment fallback (when running in test runners where serviceClient is null)
  if (config.testPhoneNumberId && cleanPhoneId === config.testPhoneNumberId) {
    const qaSlug = "bookpilot-qa-salon";
    if (!isSalonAllowedForWhatsAppPilot(qaSlug)) {
      return {
        allowed: false,
        reason: `Salon '${qaSlug}' is not permitted in the current pilot allowlist`,
      };
    }

    return {
      allowed: true,
      businessId: "d3b07384-d113-4948-9c9e-0123456789ab",
      businessSlug: qaSlug,
      businessName: "Bookpilot QA Salon",
      timezone: "Europe/London",
      currency: "GBP",
      connectionId: "1dc11805-a04d-4c65-a657-5e255849bafb", // Verified production UUID from Block C seed
      aiEnabled: true,
      bookingEnabled: config.bookingWritesEnabled,
      phoneNumberId: cleanPhoneId,
    };
  }

  return {
    allowed: false,
    reason: `Phone number ID '${cleanPhoneId}' is not associated with any salon connection`,
  };
}

