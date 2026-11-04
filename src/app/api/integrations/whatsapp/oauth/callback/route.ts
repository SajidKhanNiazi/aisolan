import { NextRequest, NextResponse } from "next/server";
import { verifyWhatsAppOAuthState } from "@/features/integrations/whatsapp/oauth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/integrations/whatsapp/oauth/callback
 * Meta Embedded Signup OAuth Redirect Fallback Handler.
 * Handles the redirect URI callback when Meta OAuth flow completes via browser redirect.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com";

  // Handle Meta error or user cancellation
  if (error || !code) {
    const errorMsg = errorDescription || error || "User cancelled or denied Meta authorization.";
    return NextResponse.redirect(
      new URL(`/dashboard?whatsapp_error=${encodeURIComponent(errorMsg)}`, baseUrl)
    );
  }

  // Validate state token
  const stateCheck = verifyWhatsAppOAuthState(state);
  if (!stateCheck.valid || !stateCheck.businessId) {
    return NextResponse.redirect(
      new URL(
        `/dashboard?whatsapp_error=${encodeURIComponent(stateCheck.error || "Invalid or expired state parameter.")}`,
        baseUrl
      )
    );
  }

  // Resolve business slug to redirect back to the salon's settings tab
  let targetSlug = "";
  const serviceClient = createServiceClient();
  if (serviceClient) {
    const { data: biz } = await serviceClient
      .from("businesses")
      .select("slug")
      .eq("id", stateCheck.businessId)
      .maybeSingle();

    if (biz?.slug) {
      targetSlug = biz.slug;
    }
  }

  const redirectPath = targetSlug
    ? `/dashboard/${targetSlug}/settings?whatsapp_code=${encodeURIComponent(code)}&whatsapp_state=${encodeURIComponent(state || "")}`
    : `/dashboard?whatsapp_code=${encodeURIComponent(code)}`;

  return NextResponse.redirect(new URL(redirectPath, baseUrl));
}
