import { NextRequest, NextResponse } from "next/server";
import {
  isPreviewEnvironment,
  verifyQaGatewaySecret,
  createQaSessionToken,
  verifyQaSessionToken,
} from "@/features/ai-receptionist/server";

/**
 * Preview-only QA session management endpoint.
 * Allows authorized QA runners (such as Muse AI browser automation) to establish
 * an HttpOnly session cookie without injecting raw secrets into browser JavaScript,
 * local storage, or DOM.
 *
 * In Production (VERCEL_ENV === "production"), this route categorically returns 404.
 */

export async function POST(req: NextRequest) {
  // Barrier 1: Strictly Preview environment only
  if (!(await isPreviewEnvironment())) {
    return NextResponse.json(
      { error: "QA session authorization is only available in preview environments." },
      { status: 404 }
    );
  }

  try {
    let secret: string | null = null;
    const authHeader = req.headers.get("authorization");
    const qaHeader = req.headers.get("x-qa-gateway-secret");

    if (qaHeader) {
      secret = qaHeader;
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      secret = authHeader.substring(7).trim();
    } else {
      try {
        const body = await req.json();
        secret = body?.secret || null;
      } catch {
        secret = null;
      }
    }

    // Barrier 2: Server-side cryptographic verification of owner QA secret
    const isAuthorized = await verifyQaGatewaySecret(secret);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Invalid QA authorization credentials." },
        { status: 401 }
      );
    }

    // Barrier 3: Create HMAC-signed session token for bookpilot-qa-salon
    const sessionToken = await createQaSessionToken("bookpilot-qa-salon");
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Failed to initialize QA session." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "QA browser session authorized for bookpilot-qa-salon.",
      salon: "bookpilot-qa-salon",
      role: "qa_tester",
      expiresInSeconds: 1800,
    });

    // Set secure HttpOnly session cookie (unreadable by browser JS)
    response.cookies.set("bp_qa_session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 1800, // 30 minutes
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!(await isPreviewEnvironment())) {
    return NextResponse.json(
      { error: "QA session inspection is only available in preview environments." },
      { status: 404 }
    );
  }

  const cookie = req.cookies.get("bp_qa_session")?.value;
  const isAuthorized = await verifyQaSessionToken(cookie, "bookpilot-qa-salon");

  return NextResponse.json({
    success: true,
    authorized: isAuthorized,
    salon: "bookpilot-qa-salon",
    mode: isAuthorized ? "openai" : "mock",
  });
}

export async function DELETE() {
  if (!(await isPreviewEnvironment())) {
    return NextResponse.json(
      { error: "Not found." },
      { status: 404 }
    );
  }

  const response = NextResponse.json({
    success: true,
    message: "QA session terminated.",
  });

  response.cookies.delete("bp_qa_session");
  return response;
}
