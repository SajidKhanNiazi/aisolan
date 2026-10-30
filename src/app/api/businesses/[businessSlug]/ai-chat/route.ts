import { NextRequest, NextResponse } from "next/server";
import { processCustomerAiChat } from "@/features/ai-receptionist/server";

interface RouteParams {
  params: Promise<{
    businessSlug: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { businessSlug } = await params;
    const body = await req.json();

    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded
      ? forwarded.split(",")[0]?.trim()
      : req.headers.get("x-real-ip") || "unknown-client";

    // Extract server-verified QA gateway secret from dedicated header or Authorization bearer
    const qaSecretHeader = req.headers.get("x-qa-gateway-secret");
    const authHeader = req.headers.get("authorization");
    let providedQaSecret: string | null = qaSecretHeader;
    if (!providedQaSecret && authHeader && authHeader.startsWith("Bearer ")) {
      providedQaSecret = authHeader.substring(7).trim();
    }

    // Extract HttpOnly QA browser session cookie (for secure browser QA without client-side secrets)
    const qaSessionToken = req.cookies.get("bp_qa_session")?.value || null;

    const response = await processCustomerAiChat(
      {
        businessSlug,
        messages: body.messages,
        draftToken:
          typeof body.draftToken === "string" && body.draftToken.trim().length > 0
            ? body.draftToken.trim()
            : undefined,
      },
      clientIp,
      providedQaSecret,
      qaSessionToken
    );

    return NextResponse.json(response, {
      status: response.success ? 200 : response.code === "RATE_LIMITED" ? 429 : 400,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while contacting the AI Receptionist.",
        toolsUsed: [],
        mode: "disabled",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
