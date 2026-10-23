/**
 * BookPilot AI — Google OAuth Initiation Endpoint
 * Phase 1G-B: Initiates Google Calendar OAuth 2.0 Web Server Flow
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  verifyOAuthState,
  persistOAuthNonce,
} from "@/features/integrations/google-calendar/oauth";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessSlug = searchParams.get("businessSlug");

  if (!businessSlug || businessSlug.trim() === "") {
    return NextResponse.json(
      { success: false, error: "Missing required businessSlug parameter." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database client unavailable." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect unauthenticated user to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `/dashboard/${businessSlug}/settings?tab=calendar`);
    return NextResponse.redirect(loginUrl);
  }

  // Verify salon business membership & authorization
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id, slug, name")
    .eq("slug", businessSlug.trim())
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ success: false, error: "Salon workspace not found." }, { status: 404 });
  }

  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (!member || (member.role !== "owner" && member.role !== "manager")) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only salon owners and managers can connect Google Calendar." },
      { status: 403 }
    );
  }

  // Determine redirect URI
  const env = getEnv();
  const baseUrl = process.env.GOOGLE_CALENDAR_REDIRECT_URI
    ? new URL(process.env.GOOGLE_CALENDAR_REDIRECT_URI).origin
    : env.appUrl || new URL(request.url).origin;

  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${baseUrl.replace(/\/+$/, "")}/api/integrations/google-calendar/callback`;

  // Create CSRF-protected state
  const state = createOAuthState(user.id, business.id, business.slug);

  // Persist nonce server-side for atomic single-use consumption
  const parsedState = verifyOAuthState(state);
  if (parsedState.valid && parsedState.payload) {
    await persistOAuthNonce(
      parsedState.payload.nonce,
      business.id,
      user.id,
      new Date(parsedState.payload.expiresAt)
    );
  }

  let googleAuthUrl: string;
  try {
    googleAuthUrl = buildGoogleAuthUrl(state, redirectUri);
  } catch (err: unknown) {
    const e = err as Error;
    console.error("[GoogleAuthRoute] Configuration error:", e.message);
    const errRedirect = new URL(`/dashboard/${business.slug}/settings`, request.url);
    errRedirect.searchParams.set("tab", "calendar");
    errRedirect.searchParams.set("error", "config_missing");
    return NextResponse.redirect(errRedirect);
  }

  const response = NextResponse.redirect(googleAuthUrl);

  // Store state in an HTTP-only secure cookie for additional validation
  response.cookies.set("bp_gcal_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
