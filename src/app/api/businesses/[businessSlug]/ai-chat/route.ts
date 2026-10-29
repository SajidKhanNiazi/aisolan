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

    const response = await processCustomerAiChat(
      {
        businessSlug,
        messages: body.messages,
        draftToken: body.draftToken,
      },
      clientIp,
      providedQaSecret
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
