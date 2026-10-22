import { NextRequest, NextResponse } from "next/server";
import { rescheduleAppointmentByToken } from "@/features/public-booking/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    if (!body.newStartsAt) {
      return NextResponse.json(
        {
          success: false,
          error: "newStartsAt is required.",
          code: "MISSING_PARAM",
        },
        { status: 400 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip") || undefined;

    const result = await rescheduleAppointmentByToken(
      token,
      body.newStartsAt,
      body.newStaffId,
      clientIp
    );

    if (!result.success) {
      const status =
        result.code === "SLOT_TAKEN"
          ? 409
          : result.code === "OUTSIDE_BOOKING_WINDOW" ||
            result.code === "STAFF_NOT_WORKING" ||
            result.code === "STAFF_ON_BREAK"
          ? 422
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
    console.error("[POST /api/public/manage-booking/[token]/reschedule] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process reschedule.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
