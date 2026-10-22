import { NextRequest, NextResponse } from "next/server";
import { cancelAppointmentByToken } from "@/features/public-booking/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    let cancellationReason: string | undefined;

    try {
      const body = await request.json();
      cancellationReason = body.cancellationReason;
    } catch {
      // Body is optional
    }

    const result = await cancelAppointmentByToken(token, cancellationReason);

    if (!result.success) {
      const status =
        result.code === "LATE_CANCELLATION"
          ? 403
          : result.code === "ALREADY_CANCELLED"
          ? 409
          : result.code === "TOKEN_REVOKED" || result.code === "TOKEN_EXPIRED"
          ? 410
          : 400;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    console.error("[POST /api/public/manage-booking/[token]/cancel] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process cancellation.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
