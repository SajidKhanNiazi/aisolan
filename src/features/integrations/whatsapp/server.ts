"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getWhatsAppConfig,
  isWhatsAppEnabled,
  isWhatsAppBookingWritesEnabled,
  isWhatsAppOutboundEnabled,
} from "./config";
import {
  generateWhatsAppOAuthState,
  verifyWhatsAppOAuthState,
  exchangeMetaOAuthCode,
  fetchWabaPhoneDetails,
  verifyMetaAssetOwnership,
  subscribeWabaWebhooks,
  unsubscribeWabaWebhooks,
} from "./oauth";
import { encryptWhatsAppToken, decryptWhatsAppToken } from "./encryption";
import type { WhatsAppConnection } from "./types";

export interface WhatsAppDashboardInfo {
  enabled: boolean;
  outboundEnabled: boolean;
  bookingWritesEnabled: boolean;
  graphApiVersion: string;
  appId?: string;
  configId?: string;
  testPhoneNumberId: string;
  testWabaId: string;
  allowedSalons: string[];
  isAllowedSalon: boolean;
  connection: WhatsAppConnection | null;
  statusBadge: string;
  hasMetaCredentials: boolean;
  outboundStatusLabel: string;
  embeddedSignupAvailable: boolean;
  missingPrerequisites: string[];
}

/**
 * Helper to authenticate and authorize the caller as owner or manager of a salon.
 */
async function verifyManagerOrOwnerRole(businessSlug: string): Promise<{
  authorized: boolean;
  business?: { id: string; name: string; slug: string };
  userId?: string;
  error?: string;
}> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { authorized: false, error: "Unauthorized: Please log in." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { authorized: false, error: "Database client is unavailable." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!business) {
    return { authorized: false, error: `Salon organization '${businessSlug}' was not found.` };
  }

  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || (member.role !== "owner" && member.role !== "manager")) {
    return { authorized: false, error: "Forbidden: Only salon owners and managers can configure WhatsApp integrations." };
  }

  return {
    authorized: true,
    business,
    userId: user.id,
  };
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
      const { data: business } = await supabase
        .from("businesses")
        .select("id, name, slug")
        .eq("slug", businessSlug)
        .maybeSingle();

      if (business) {
        const { data: connRow } = await supabase
          .from("whatsapp_connections")
          .select(
            "id, business_id, provider, waba_id, phone_number_id, business_display_number, verified_name, connection_status, ai_enabled, booking_enabled, coexistence_enabled, connected_at, disconnected_at, last_webhook_received_at, last_error_code, created_at, updated_at"
          )
          .eq("business_id", business.id)
          .order("connected_at", { ascending: false })
          .limit(1)
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
            coexistenceEnabled: Boolean(connRow.coexistence_enabled),
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

    const missingPrerequisites: string[] = [];
    if (!config.appId) missingPrerequisites.push("Meta App ID (WHATSAPP_APP_ID)");
    if (!config.configId) missingPrerequisites.push("Login for Business Config ID (WHATSAPP_CONFIG_ID)");
    if (!config.appSecret) missingPrerequisites.push("App Secret (WHATSAPP_APP_SECRET)");
    if (!config.verifyToken) missingPrerequisites.push("Webhook Verify Token (WHATSAPP_VERIFY_TOKEN)");

    const embeddedSignupAvailable = Boolean(config.appId && config.configId && isWhatsAppEnabled());
    const hasMetaCredentials = Boolean(config.accessToken || (connection && connection.connectionStatus === "active"));

    let outboundStatusLabel = "Mock Transport (Safe)";
    if (config.outboundEnabled) {
      if (hasMetaCredentials) {
        outboundStatusLabel = "Meta Sandbox Active (Test Numbers Only)";
      } else {
        outboundStatusLabel = "Configuration Incomplete (Credentials Missing)";
      }
    }

    let statusBadge = "Disconnected";
    if (!config.enabled) {
      statusBadge = "Disabled (WHATSAPP_ENABLED=false)";
    } else if (connection?.connectionStatus === "active") {
      statusBadge = "Connected (Active)";
    } else if (!isAllowedSalon) {
      statusBadge = "Blocked (Salon Not Whitelisted)";
    } else if (missingPrerequisites.length > 0) {
      statusBadge = "Configuration Incomplete";
    } else {
      statusBadge = "Disconnected";
    }

    return {
      success: true,
      data: {
        enabled: isWhatsAppEnabled(),
        outboundEnabled: isWhatsAppOutboundEnabled(),
        bookingWritesEnabled: isWhatsAppBookingWritesEnabled(),
        graphApiVersion: config.graphApiVersion,
        appId: config.appId,
        configId: config.configId,
        testPhoneNumberId: config.testPhoneNumberId ? "Configured (Meta Test Asset)" : "Pending Owner Meta Setup",
        testWabaId: config.testWabaId ? "Configured (Meta Test Asset)" : "Pending Owner Meta Setup",
        allowedSalons: config.allowedSalons,
        isAllowedSalon,
        connection,
        statusBadge,
        hasMetaCredentials,
        outboundStatusLabel,
        embeddedSignupAvailable,
        missingPrerequisites,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load WhatsApp settings";
    return { success: false, error: msg };
  }
}

/**
 * Initiates an Embedded Signup flow by generating a secure, tenant-bound OAuth state token.
 */
export async function initiateWhatsAppConnectionAction(businessSlug: string): Promise<{
  success: boolean;
  data?: {
    state: string;
    appId: string;
    configId: string;
    graphApiVersion: string;
  };
  error?: string;
}> {
  try {
    const authResult = await verifyManagerOrOwnerRole(businessSlug);
    if (!authResult.authorized || !authResult.business || !authResult.userId) {
      return { success: false, error: authResult.error || "Unauthorized" };
    }

    const config = getWhatsAppConfig();
    const appId = config.appId || "mock_app_id_dev";
    const configId = config.configId || "mock_config_id_dev";

    const state = generateWhatsAppOAuthState(authResult.business.id, authResult.userId);

    // Persist in whatsapp_oauth_states if service role is available
    const serviceClient = createServiceClient();
    if (serviceClient) {
      await serviceClient.from("whatsapp_oauth_states").insert({
        state_token: state,
        business_id: authResult.business.id,
        user_id: authResult.userId,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    }

    return {
      success: true,
      data: {
        state,
        appId,
        configId,
        graphApiVersion: config.graphApiVersion,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to initiate WhatsApp connection" };
  }
}

/**
 * Completes WhatsApp Embedded Signup by exchanging authorization code,
 * verifying phone details, subscribing webhooks, encrypting credentials,
 * and atomically storing the active connection.
 */
export async function completeWhatsAppConnectionAction(params: {
  businessSlug: string;
  code: string;
  state: string;
  wabaId: string;
  phoneNumberId: string;
  coexistenceEnabled?: boolean;
}): Promise<{
  success: boolean;
  data?: {
    connectionId: string;
    displayPhoneNumber?: string;
    verifiedName?: string;
  };
  error?: string;
}> {
  try {
    const authResult = await verifyManagerOrOwnerRole(params.businessSlug);
    if (!authResult.authorized || !authResult.business || !authResult.userId) {
      return { success: false, error: authResult.error || "Unauthorized" };
    }

    const { business, userId } = authResult;

    // 1. Verify OAuth state token
    const stateVerification = verifyWhatsAppOAuthState(params.state, business.id, userId);
    if (!stateVerification.valid) {
      return { success: false, error: stateVerification.error || "Invalid or expired OAuth state token." };
    }

    const serviceClient = createServiceClient();

    // Check single-use and atomic consumption in whatsapp_oauth_states
    if (serviceClient) {
      // 1a. Attempt atomic RPC consumption first
      const { data: consumed, error: rpcStateErr } = await serviceClient.rpc(
        "consume_whatsapp_oauth_state_atomic",
        {
          p_state_token: params.state,
          p_business_id: business.id,
          p_user_id: userId,
        }
      );

      if (!rpcStateErr) {
        if (!consumed) {
          return {
            success: false,
            error: "OAuth state token is invalid, expired, or has already been consumed (replay prevention).",
          };
        }
      } else {
        // Fallback to atomic single-statement update
        const { data: updated, error: updateErr } = await serviceClient
          .from("whatsapp_oauth_states")
          .update({ used_at: new Date().toISOString() })
          .eq("state_token", params.state)
          .eq("business_id", business.id)
          .eq("user_id", userId)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .select("id");

        if (updateErr || !updated || updated.length === 0) {
          return {
            success: false,
            error: "OAuth state token is invalid, expired, or has already been consumed (replay prevention).",
          };
        }
      }
    }

    const cleanWabaId = params.wabaId.trim();
    const cleanPhoneId = params.phoneNumberId.trim();

    if (!cleanWabaId || !cleanPhoneId) {
      return { success: false, error: "Missing required WABA ID or Phone Number ID from Meta signup." };
    }

    // 2. Anti-hijacking collision check: ensure phone_number_id is not actively bound to another salon
    const dbClient = serviceClient || (await createClient());
    if (dbClient) {
      const { data: existingActive } = await dbClient
        .from("whatsapp_connections")
        .select("id, business_id, connection_status")
        .eq("phone_number_id", cleanPhoneId)
        .eq("connection_status", "active")
        .maybeSingle();

      if (existingActive && existingActive.business_id !== business.id) {
        return {
          success: false,
          error: "This WhatsApp phone number is actively connected to another salon organization.",
        };
      }
    }

    // 3. Exchange short-lived authorization code for access token
    const exchangeRes = await exchangeMetaOAuthCode({ code: params.code });
    if (!exchangeRes.success || !exchangeRes.accessToken) {
      return { success: false, error: exchangeRes.error || "Failed to exchange Meta authorization code." };
    }

    const accessToken = exchangeRes.accessToken;

    // 4. Server-side Meta Asset Ownership Verification:
    // Ensures client cannot spoof or swap WABA ID or Phone Number ID
    const assetVerification = await verifyMetaAssetOwnership({
      wabaId: cleanWabaId,
      phoneNumberId: cleanPhoneId,
      accessToken,
    });
    if (!assetVerification.verified) {
      return {
        success: false,
        error: assetVerification.error || "Server verification failed: Unauthorized WABA or Phone Number ID.",
      };
    }

    let displayPhoneNumber = assetVerification.displayPhoneNumber || null;
    let verifiedName = assetVerification.verifiedName || null;

    if (!displayPhoneNumber) {
      const phoneDetails = await fetchWabaPhoneDetails(cleanPhoneId, accessToken);
      displayPhoneNumber = phoneDetails.displayPhoneNumber || null;
      verifiedName = verifiedName || phoneDetails.verifiedName || null;
    }

    // 5. Subscribe WABA to webhooks
    await subscribeWabaWebhooks(cleanWabaId, accessToken);

    // 6. Encrypt access token using AES-256-GCM
    const encryptedCredential = encryptWhatsAppToken(accessToken);

    let connectionId: string | undefined;

    // 7. Atomic connection registration
    if (serviceClient) {
      // Try atomic RPC if available
      const { data: rpcConnId, error: rpcErr } = await serviceClient.rpc(
        "connect_whatsapp_business_atomic",
        {
          p_business_id: business.id,
          p_waba_id: cleanWabaId,
          p_phone_number_id: cleanPhoneId,
          p_business_display_number: displayPhoneNumber,
          p_verified_name: verifiedName,
          p_encrypted_credential: encryptedCredential,
          p_coexistence_enabled: Boolean(params.coexistenceEnabled),
        }
      );

      if (!rpcErr && rpcConnId) {
        connectionId = rpcConnId;
      } else {
        // Fallback to direct client-safe update/upsert
        await serviceClient
          .from("whatsapp_connections")
          .update({ connection_status: "disconnected", disconnected_at: new Date().toISOString() })
          .eq("business_id", business.id)
          .eq("connection_status", "active")
          .neq("phone_number_id", cleanPhoneId);

        const { data: upsertedRow, error: upsertErr } = await serviceClient
          .from("whatsapp_connections")
          .upsert(
            {
              business_id: business.id,
              provider: "meta_cloud_api",
              waba_id: cleanWabaId,
              phone_number_id: cleanPhoneId,
              business_display_number: displayPhoneNumber,
              verified_name: verifiedName,
              connection_status: "active",
              credential_reference: encryptedCredential,
              ai_enabled: true,
              booking_enabled: false,
              coexistence_enabled: Boolean(params.coexistenceEnabled),
              connected_at: new Date().toISOString(),
              disconnected_at: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "phone_number_id" }
          )
          .select("id")
          .single();

        if (upsertErr) {
          return { success: false, error: `Failed to record connection: ${upsertErr.message}` };
        }
        connectionId = upsertedRow.id;
      }
    }

    revalidatePath(`/dashboard/${params.businessSlug}/settings`);

    return {
      success: true,
      data: {
        connectionId: connectionId || "connected",
        displayPhoneNumber: displayPhoneNumber || undefined,
        verifiedName: verifiedName || undefined,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to complete WhatsApp connection";
    return { success: false, error: message };
  }
}

/**
 * Disconnects the active WhatsApp connection for a salon tenant.
 */
export async function disconnectWhatsAppConnectionAction(businessSlug: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const authResult = await verifyManagerOrOwnerRole(businessSlug);
    if (!authResult.authorized || !authResult.business) {
      return { success: false, error: authResult.error || "Unauthorized" };
    }

    const { business } = authResult;
    const serviceClient = createServiceClient();
    const dbClient = serviceClient || (await createClient());

    if (!dbClient) {
      return { success: false, error: "Database client unavailable." };
    }

    // Load active connection to attempt webhook unsubscription
    const { data: conn } = await dbClient
      .from("whatsapp_connections")
      .select("id, waba_id, credential_reference")
      .eq("business_id", business.id)
      .eq("connection_status", "active")
      .maybeSingle();

    if (conn?.waba_id && conn?.credential_reference) {
      try {
        const decryptedToken = decryptWhatsAppToken(conn.credential_reference);
        await unsubscribeWabaWebhooks(conn.waba_id, decryptedToken);
      } catch {
        // Best-effort cleanup
      }
    }

    // Update connection status atomically via RPC if available, or fallback
    let rpcSuccess = false;
    if (serviceClient) {
      const { data: rpcDisconnected, error: rpcErr } = await serviceClient.rpc(
        "disconnect_whatsapp_business_atomic",
        { p_business_id: business.id }
      );
      if (!rpcErr && rpcDisconnected !== undefined) {
        rpcSuccess = true;
      }
    }

    if (!rpcSuccess) {
      const { error: updateErr } = await dbClient
        .from("whatsapp_connections")
        .update({
          connection_status: "disconnected",
          disconnected_at: new Date().toISOString(),
          credential_reference: null,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", business.id)
        .eq("connection_status", "active");

      if (updateErr) {
        return { success: false, error: `Failed to disconnect WhatsApp: ${updateErr.message}` };
      }
    }

    revalidatePath(`/dashboard/${businessSlug}/settings`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to disconnect WhatsApp" };
  }
}
