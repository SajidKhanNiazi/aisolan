import { NextRequest, NextResponse } from "next/server";
import { getPublicAppointmentAvailability } from "@/features/public-booking/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  try {
    const { businessSlug } = await params;
    const { searchParams } = new URL(request.url);

    const serviceId = searchParams.get("serviceId");
    const staffId = searchParams.get("staffId");
    const date = searchParams.get("date");
    const staffPreference = (searchParams.get("staffPreference") || "any") as
      | "any"
      | "specific";

    if (!serviceId || !date) {
      return NextResponse.json(
        {
          success: false,
          error: "serviceId and date (YYYY-MM-DD) query parameters are required.",
          code: "MISSING_REQUIRED_PARAMS",
        },
        { status: 400 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip") || undefined;

    const result = await getPublicAppointmentAvailability(
      {
        businessSlug,
        serviceId,
        staffId: staffId || null,
        staffPreference,
        date,
      },
      clientIp
    );

    if (!result.success) {
      const status =
        result.code === "RATE_LIMITED"
          ? 429
          : result.code === "BUSINESS_NOT_FOUND"
          ? 404
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

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/public/businesses/[slug]/availability] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error calculating availability.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
