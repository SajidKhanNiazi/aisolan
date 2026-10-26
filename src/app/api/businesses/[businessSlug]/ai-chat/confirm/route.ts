import { NextRequest, NextResponse } from "next/server";
import { confirmBookingDraft } from "@/features/ai-receptionist/booking/confirm";
import { bookingConfirmationRequestSchema } from "@/features/ai-receptionist/booking/validation";

interface RouteParams {
  params: Promise<{
    businessSlug: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { businessSlug } = await params;
    const body = await req.json();

    const parsed = bookingConfirmationRequestSchema.safeParse({
      ...body,
      businessSlug,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid confirmation request.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded
      ? forwarded.split(",")[0]?.trim()
      : req.headers.get("x-real-ip") || "unknown-client";

    const outcome = await confirmBookingDraft(parsed.data, clientIp);

    return NextResponse.json(outcome, {
      status: outcome.success ? 200 : outcome.code === "RATE_LIMITED" ? 429 : 400,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Confirmation failed.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
