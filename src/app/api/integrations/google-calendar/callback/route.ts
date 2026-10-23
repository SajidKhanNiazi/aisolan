/**
 * BookPilot AI — Google OAuth Callback Endpoint
 * Phase 1G-B: Validates OAuth state, exchanges code for refresh token, encrypts, and stores connection
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  verifyOAuthState,
  exchangeCodeForTokens,
  getGoogleUserEmail,
} from "@/features/integrations/google-calendar/oauth";
import { encryptToken } from "@/features/integrations/google-calendar/encryption";
import { initialSyncFutureAppointments } from "@/features/integrations/google-calendar/server";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const env = getEnv();
  const defaultAppUrl = env.appUrl || new URL(request.url).origin;

  // Handle user cancellation / denied consent from Google
  if (errorParam) {
    console.warn("[GoogleCallback] OAuth access denied or cancelled by user:", errorParam);
    const redirectUrl = new URL("/dashboard", defaultAppUrl);
    // If state is parseable, redirect to business settings
    if (state) {
      const stateCheck = verifyOAuthState(state);
      if (stateCheck.valid && stateCheck.payload) {
        redirectUrl.pathname = `/dashboard/${stateCheck.payload.businessSlug}/settings`;
        redirectUrl.searchParams.set("tab", "calendar");
        redirectUrl.searchParams.set("error", "consent_denied");
        return NextResponse.redirect(redirectUrl);
      }
    }
    return NextResponse.redirect(new URL("/dashboard?error=google_consent_denied", defaultAppUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_oauth_params", defaultAppUrl));
  }

  // Verify OAuth state token
  const stateCheck = verifyOAuthState(state);
  if (!stateCheck.valid || !stateCheck.payload) {
    console.error("[GoogleCallback] Invalid OAuth state token:", stateCheck.error);
    return NextResponse.redirect(new URL("/dashboard?error=invalid_oauth_state", defaultAppUrl));
  }

  const { businessId, businessSlug, userId } = stateCheck.payload;

  // Check state cookie
  const stateCookie = request.cookies.get("bp_gcal_state")?.value;
  if (stateCookie && stateCookie !== state) {
    console.error("[GoogleCallback] State cookie mismatch.");
    return NextResponse.redirect(
      new URL(`/dashboard/${businessSlug}/settings?tab=calendar&error=csrf_detected`, defaultAppUrl)
    );
  }

  // Determine redirect URI used during authorization initiation
  const baseUrl = process.env.GOOGLE_CALENDAR_REDIRECT_URI
    ? new URL(process.env.GOOGLE_CALENDAR_REDIRECT_URI).origin
    : defaultAppUrl;

  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${baseUrl.replace(/\/+$/, "")}/api/integrations/google-calendar/callback`;

  // Exchange authorization code for tokens
  const tokenExchange = await exchangeCodeForTokens(code, redirectUri);
  if (!tokenExchange.success || !tokenExchange.tokens) {
    console.error("[GoogleCallback] Token exchange failure:", tokenExchange.error);
    return NextResponse.redirect(
      new URL(`/dashboard/${businessSlug}/settings?tab=calendar&error=token_exchange_failed`, defaultAppUrl)
    );
  }

  const { tokens } = tokenExchange;

  if (!tokens.refresh_token) {
    console.warn(
      "[GoogleCallback] No refresh token returned. User may have previously authorized without prompt=consent."
    );
  }

  // Fetch Google user email
  const googleEmail = (await getGoogleUserEmail(tokens.access_token)) || "Connected Google Account";

  // Use service client to store encrypted credentials
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    console.error("[GoogleCallback] Service client unavailable.");
    return NextResponse.redirect(
      new URL(`/dashboard/${businessSlug}/settings?tab=calendar&error=server_error`, defaultAppUrl)
    );
  }

  // Encrypt refresh token
  const refreshTokenToStore = tokens.refresh_token || "retained_previous_token";
  let encryptedToken: string;
  try {
    encryptedToken = encryptToken(refreshTokenToStore);
  } catch (encErr: unknown) {
    const e = encErr as Error;
    console.error("[GoogleCallback] Encryption failure:", e.message);
    return NextResponse.redirect(
      new URL(`/dashboard/${businessSlug}/settings?tab=calendar&error=encryption_failed`, defaultAppUrl)
    );
  }

  // Upsert into business_calendar_connections
  const { error: upsertErr } = await serviceClient
    .from("business_calendar_connections")
    .upsert(
      {
        business_id: businessId,
        user_id: userId,
        google_account_email: googleEmail,
        google_calendar_id: "primary",
        google_calendar_name: "Primary Calendar",
        encrypted_refresh_token: encryptedToken,
        status: "active",
        sync_enabled: true,
        last_error_code: null,
        last_error_message: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" }
    );

  if (upsertErr) {
    console.error("[GoogleCallback] Database upsert failure:", upsertErr.message);
    return NextResponse.redirect(
      new URL(`/dashboard/${businessSlug}/settings?tab=calendar&error=db_error`, defaultAppUrl)
    );
  }

  // Trigger non-blocking initial synchronization of upcoming appointments
  try {
    await initialSyncFutureAppointments(businessSlug, 30);
  } catch (syncErr) {
    console.warn("[GoogleCallback] Initial sync dispatch warning:", syncErr);
  }

  const successRedirect = new URL(`/dashboard/${businessSlug}/settings`, defaultAppUrl);
  successRedirect.searchParams.set("tab", "calendar");
  successRedirect.searchParams.set("status", "connected");

  const response = NextResponse.redirect(successRedirect);
  // Clear the state cookie
  response.cookies.delete("bp_gcal_state");

  return response;
}
