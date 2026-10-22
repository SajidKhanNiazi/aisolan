import { NextRequest, NextResponse } from "next/server";
import { getAppointmentByToken } from "@/features/public-booking/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const forwarded = _request.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0]?.trim() : _request.headers.get("x-real-ip") || undefined;
    const result = await getAppointmentByToken(token, clientIp);

    if (!result.success) {
      const status =
        result.code === "INVALID_TOKEN"
          ? 400
          : result.code === "TOKEN_REVOKED" || result.code === "TOKEN_EXPIRED"
          ? 410
          : 404;

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
    console.error("[GET /api/public/manage-booking/[token]] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to retrieve appointment.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
