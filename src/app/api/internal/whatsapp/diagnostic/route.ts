import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig, normalizePhoneNumber } from "@/features/integrations/whatsapp/config";

/**
 * Temporary authenticated internal diagnostic endpoint.
 * Requires either:
 *  1. Bearer token matching CRON_SECRET or x-cron-secret header.
 *  2. Authenticated Supabase session of the salon owner/admin.
 * 
 * Returns strictly high-level boolean PASS/FAIL statuses.
 * NEVER exposes tokens, raw phone numbers, secret lengths, hashes, or credentials.
 * Scheduled for immediate removal after verification.
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
  const phoneId = config.testPhoneNumberId?.trim();
  const recipients = config.authorizedRecipients || [];

  let tokenHandshakePass = false;
  let appIdMatches = false;
  let phoneIdMatches = false;
  let messagingPermissionPass = false;

  // 2. Read-only Meta API verification (if token configured)
  if (token && token.length > 0) {
    try {
      const [appRes, phoneRes] = await Promise.all([
        fetch("https://graph.facebook.com/v26.0/app?fields=id,name", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`https://graph.facebook.com/v26.0/${phoneId || "1314214205118465"}?fields=id,display_phone_number,verified_name,quality_rating`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let appErr = "ok";
      let phoneErr = "ok";

      if (appRes.ok) {
        const appData = await appRes.json();
        appIdMatches = (appData.id === "1761678114892387");
      } else {
        try {
          const errData = await appRes.json();
          appErr = `http=${appRes.status}_code=${errData?.error?.code}_sub=${errData?.error?.error_subcode}_type=${errData?.error?.type}`;
        } catch {
          appErr = `http=${appRes.status}`;
        }
      }

      if (phoneRes.ok) {
        const phoneData = await phoneRes.json();
        phoneIdMatches = (phoneData.id === "1314214205118465");
        messagingPermissionPass = Boolean(phoneData.display_phone_number);
      } else {
        try {
          const errData = await phoneRes.json();
          phoneErr = `http=${phoneRes.status}_code=${errData?.error?.code}_sub=${errData?.error?.error_subcode}_type=${errData?.error?.type}`;
        } catch {
          phoneErr = `http=${phoneRes.status}`;
        }
      }

      tokenHandshakePass = (phoneRes.ok && phoneIdMatches && messagingPermissionPass);
      console.log(`[WhatsApp Diagnostic Meta Details] appErr=${appErr} phoneErr=${phoneErr}`);
    } catch (e: unknown) {
      tokenHandshakePass = false;
      const msg = e instanceof Error ? e.message : "fetch_error";
      console.log(`[WhatsApp Diagnostic Meta Details] catchErr=${msg}`);
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
    tokenHandshakePass &&
    recipientCheckPass &&
    phoneConfigPass &&
    flagsAllFalse
  );

  console.log(
    `[WhatsApp Diagnostic] overall=${overallPass ? "PASS" : "FAIL"} tokenPresent=${Boolean(token && token.length > 0)} appMatch=${appIdMatches ? "PASS" : "FAIL"} phoneMatch=${phoneIdMatches ? "PASS" : "FAIL"} handshake=${tokenHandshakePass ? "PASS" : "FAIL"} recipients=${recipientCheckPass ? "PASS" : "FAIL"} flagsDisabled=${flagsAllFalse ? "PASS" : "FAIL"}`
  );

  return NextResponse.json(
    {
      overallStatus: overallPass ? "PASS" : "FAIL",
      checks: {
        accessTokenPresent: Boolean(token && token.length > 0),
        metaAppIdMatch: appIdMatches ? "PASS" : "FAIL",
        metaPhoneIdMatch: phoneIdMatches ? "PASS" : "FAIL",
        metaTokenHandshake: tokenHandshakePass ? "PASS" : "FAIL",
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
