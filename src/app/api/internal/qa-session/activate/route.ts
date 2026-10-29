import { NextRequest, NextResponse } from "next/server";
import {
  isPreviewEnvironment,
  verifyQaActivationTicket,
  createQaSessionToken,
} from "@/features/ai-receptionist/server";

/**
 * Single-use ticket activation route for browser QA handoff.
 * When visited by a browser (e.g. Muse AI), validates the 2-minute activation ticket,
 * installs the 30-minute HttpOnly bp_qa_session cookie, and redirects directly to
 * /booking/bookpilot-qa-salon.
 *
 * In Production (VERCEL_ENV === "production"), this route categorically returns 404.
 */

export async function GET(req: NextRequest) {
  if (!(await isPreviewEnvironment())) {
    return NextResponse.json(
      { error: "QA activation is only available in preview environments." },
      { status: 404 }
    );
  }

  const ticket = req.nextUrl.searchParams.get("ticket");
  const isValid = await verifyQaActivationTicket(ticket);

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid or expired QA activation ticket." },
      { status: 401 }
    );
  }

  // Create 30-minute HMAC session token
  const sessionToken = await createQaSessionToken("bookpilot-qa-salon");
  if (!sessionToken) {
    return NextResponse.json(
      { error: "Failed to initialize QA session." },
      { status: 500 }
    );
  }

  // Redirect to the booking page with HttpOnly cookie installed
  const redirectUrl = new URL("/booking/bookpilot-qa-salon", req.url);
  const response = NextResponse.redirect(redirectUrl, 302);

  response.cookies.set("bp_qa_session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1800, // 30 minutes
  });

  return response;
}
