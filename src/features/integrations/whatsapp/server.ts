"use server";

import { createClient } from "@/lib/supabase/server";
import { getWhatsAppConfig, isWhatsAppEnabled, isWhatsAppBookingWritesEnabled, isWhatsAppOutboundEnabled } from "./config";
import type { WhatsAppConnection } from "./types";

export interface WhatsAppDashboardInfo {
  enabled: boolean;
  outboundEnabled: boolean;
  bookingWritesEnabled: boolean;
  graphApiVersion: string;
  testPhoneNumberId: string;
  testWabaId: string;
  allowedSalons: string[];
  isAllowedSalon: boolean;
  connection: WhatsAppConnection | null;
  statusBadge: string;
}

/**
 * Returns WhatsApp configuration and connection info for the salon settings dashboard.
 */
export async function getWhatsAppSettingsAction(businessSlug: string): Promise<{
  success: boolean;
  data?: WhatsAppDashboardInfo;
  error?: string;
}> {
  try {
    const config = getWhatsAppConfig();
    const isAllowedSalon = config.allowedSalons.includes(businessSlug.toLowerCase());

    const supabase = await createClient();

    let connection: WhatsAppConnection | null = null;

    if (supabase) {
      // Query active business
      const { data: business } = await supabase
        .from("businesses")
        .select("id, name, slug")
        .eq("slug", businessSlug)
        .maybeSingle();

      if (business) {
        const { data: connRow } = await supabase
          .from("whatsapp_connections")
          .select(
            "id, business_id, provider, waba_id, phone_number_id, business_display_number, verified_name, connection_status, ai_enabled, booking_enabled, connected_at, disconnected_at, last_webhook_received_at, last_error_code, created_at, updated_at"
          )
          .eq("business_id", business.id)
          .maybeSingle();

        if (connRow) {
          connection = {
            id: connRow.id,
            businessId: connRow.business_id,
            provider: "meta_cloud_api",
            wabaId: connRow.waba_id,
            phoneNumberId: connRow.phone_number_id,
            businessDisplayNumber: connRow.business_display_number,
            verifiedName: connRow.verified_name,
            connectionStatus: connRow.connection_status,
            credentialReference: connRow.connection_status === "active" ? "[configured]" : null,
            aiEnabled: connRow.ai_enabled,
            bookingEnabled: connRow.booking_enabled,
            connectedAt: connRow.connected_at,
            disconnectedAt: connRow.disconnected_at,
            lastWebhookReceivedAt: connRow.last_webhook_received_at,
            lastErrorCode: connRow.last_error_code,
            createdAt: connRow.created_at,
            updatedAt: connRow.updated_at,
          };
        }
      }
    }

    let statusBadge = "WhatsApp Pilot — Test Mode";
    if (!config.enabled) {
      statusBadge = "Disabled (WHATSAPP_ENABLED=false)";
    } else if (!isAllowedSalon) {
      statusBadge = "Not In Pilot Scope";
    }

    return {
      success: true,
      data: {
        enabled: isWhatsAppEnabled(),
        outboundEnabled: isWhatsAppOutboundEnabled(),
        bookingWritesEnabled: isWhatsAppBookingWritesEnabled(),
        graphApiVersion: config.graphApiVersion,
        testPhoneNumberId: config.testPhoneNumberId ? "Configured" : "Pending Owner Meta Setup",
        testWabaId: config.testWabaId ? "Configured" : "Pending Owner Meta Setup",
        allowedSalons: config.allowedSalons,
        isAllowedSalon,
        connection,
        statusBadge,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load WhatsApp settings";
    return { success: false, error: msg };
  }
}
