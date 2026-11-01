import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig, normalizePhoneNumber } from "@/features/integrations/whatsapp/config";

/**
 * Temporary authenticated internal diagnostic endpoint for Phase 1H-D13.
 * Protected by CRON_SECRET authentication (Authorization: Bearer <CRON_SECRET> or x-cron-secret).
 * Strictly read-only Meta Graph API checks.
 * NEVER outputs token values, phone numbers, hashes, or credentials.
 * Scheduled for immediate deletion after execution.
 */
async function isDiagnosticAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || cronSecret.length === 0) {
    return false;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1] === cronSecret) {
      return true;
    }
  }

  const xCronSecret = req.headers.get("x-cron-secret");
  if (xCronSecret && xCronSecret === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  // 1. Strict Authentication Gate
  const authorized = await isDiagnosticAuthorized(req);
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized access to internal diagnostic endpoint" },
      { status: 401 }
    );
  }

  const config = getWhatsAppConfig();
  const token = config.accessToken?.trim();
  const phoneId = config.testPhoneNumberId?.trim() || "1314214205118465";
  const expectedWabaId = "1796731811545454";
  const expectedAppId = "1761678114892387";
  const recipients = config.authorizedRecipients || [];

  let tokenValid = false;
  let appIdMatches = false;
  let wabaIdMatches = false;
  let phoneIdMatches = false;
  let messagingPermissionPass = false;

  let metaAppStatus = "not_checked";
  let metaWabaStatus = "not_checked";
  let metaPhoneStatus = "not_checked";
  let metaDebugStatus = "not_checked";

  if (token && token.length > 0) {
    try {
      const [appRes, wabaRes, phoneRes, debugRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v26.0/${expectedAppId}?fields=id,name`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`https://graph.facebook.com/v26.0/${expectedWabaId}?fields=id,name,timezone_id`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`https://graph.facebook.com/v26.0/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`),
      ]);

      metaAppStatus = String(appRes.status);
      metaWabaStatus = String(wabaRes.status);
      metaPhoneStatus = String(phoneRes.status);
      metaDebugStatus = String(debugRes.status);

      if (appRes.ok) {
        const appData = await appRes.json();
        if (appData.id === expectedAppId) {
          appIdMatches = true;
        }
      }

      if (wabaRes.ok) {
        const wabaData = await wabaRes.json();
        if (wabaData.id === expectedWabaId) {
          wabaIdMatches = true;
        }
      }

      if (phoneRes.ok) {
        const phoneData = await phoneRes.json();
        if (phoneData.id === phoneId) {
          phoneIdMatches = true;
          messagingPermissionPass = Boolean(phoneData.display_phone_number);
        }
      }

      if (debugRes.ok) {
        const debugData = await debugRes.json();
        const d = debugData.data;
        if (d) {
          if (d.app_id === expectedAppId) {
            appIdMatches = true;
          }
          if (d.is_valid === true) {
            tokenValid = true;
          }
          if (Array.isArray(d.scopes)) {
            const hasMessaging = d.scopes.some((s: string) =>
              s === "whatsapp_business_messaging" || s === "whatsapp_business_management"
            );
            if (hasMessaging) {
              messagingPermissionPass = true;
            }
          }
        }
      }

      // If phone and WABA calls succeed, the token is actively authenticated and valid
      if (phoneRes.ok && wabaRes.ok) {
        tokenValid = true;
      }
    } catch (e: unknown) {
      tokenValid = false;
      const msg = e instanceof Error ? e.message : "fetch_error";
      console.log(`[WhatsApp Diagnostic Meta Error] ${msg}`);
    }
  }

  const recipientCheckPass = (
    recipients.length > 0 &&
    recipients.every((r) => normalizePhoneNumber(r) !== null)
  );

  const phoneConfigPass = (phoneId === "1314214205118465");

  const flagsAllFalse = (
    !config.enabled &&
    !config.outboundEnabled &&
    !config.bookingWritesEnabled
  );

  const overallPass = (
    tokenValid &&
    phoneIdMatches &&
    wabaIdMatches &&
    appIdMatches &&
    messagingPermissionPass &&
    recipientCheckPass &&
    phoneConfigPass &&
    flagsAllFalse
  );

  console.log(
    `[WhatsApp Diagnostic] overall=${overallPass ? "PASS" : "FAIL"} tokenValid=${tokenValid ? "PASS" : "FAIL"} appMatch=${appIdMatches ? "PASS" : "FAIL"} wabaMatch=${wabaIdMatches ? "PASS" : "FAIL"} phoneMatch=${phoneIdMatches ? "PASS" : "FAIL"} messagingPerm=${messagingPermissionPass ? "PASS" : "FAIL"} recipients=${recipientCheckPass ? "PASS" : "FAIL"} flagsDisabled=${flagsAllFalse ? "PASS" : "FAIL"} (httpApp=${metaAppStatus} httpWaba=${metaWabaStatus} httpPhone=${metaPhoneStatus} httpDebug=${metaDebugStatus})`
  );

  return NextResponse.json(
    {
      overallStatus: overallPass ? "PASS" : "FAIL",
      checks: {
        accessTokenPresent: Boolean(token && token.length > 0),
        tokenValid: tokenValid ? "PASS" : "FAIL",
        metaAppIdMatch: appIdMatches ? "PASS" : "FAIL",
        metaWabaIdMatch: wabaIdMatches ? "PASS" : "FAIL",
        metaPhoneIdMatch: phoneIdMatches ? "PASS" : "FAIL",
        messagingPermission: messagingPermissionPass ? "PASS" : "FAIL",
        testPhoneNumberIdConfigured: phoneConfigPass ? "PASS" : "FAIL",
        authorizedRecipientsConfigured: recipientCheckPass ? "PASS" : "FAIL",
        safetyFlagsDisabled: flagsAllFalse ? "PASS" : "FAIL",
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
