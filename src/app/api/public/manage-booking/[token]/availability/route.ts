import { NextRequest, NextResponse } from "next/server";
import { getRescheduleAppointmentAvailability } from "@/features/public-booking/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: "date (YYYY-MM-DD) query parameter is required.",
          code: "MISSING_REQUIRED_PARAMS",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded
      ? forwarded.split(",")[0]?.trim()
      : request.headers.get("x-real-ip") || undefined;

    const result = await getRescheduleAppointmentAvailability(token, date, clientIp);

    if (!result.success) {
      const status =
        result.code === "RATE_LIMITED"
          ? 429
          : result.code === "INVALID_TOKEN"
          ? 400
          : result.code === "NOT_FOUND" ||
            result.code === "TOKEN_EXPIRED" ||
            result.code === "TOKEN_REVOKED"
          ? 404
          : 400;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
        },
        {
          status,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (err) {
    console.error("[GET /api/public/manage-booking/[token]/availability] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error calculating reschedule availability.",
        code: "INTERNAL_ERROR",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
