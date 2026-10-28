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

    const qaHeader = req.headers.get("x-qa-provider");
    const qaProviderOverride =
      qaHeader === "openai" || qaHeader === "mock"
        ? (qaHeader as "openai" | "mock")
        : body.qaProviderOverride;

    const response = await processCustomerAiChat(
      {
        businessSlug,
        messages: body.messages,
        draftToken: body.draftToken,
        qaProviderOverride,
      },
      clientIp
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
