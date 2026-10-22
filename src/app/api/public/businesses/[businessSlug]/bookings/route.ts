import { NextRequest, NextResponse } from "next/server";
import { createPublicBooking } from "@/features/public-booking/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  try {
    const { businessSlug } = await params;
    const body = await request.json();

    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip") || undefined;

    const result = await createPublicBooking(
      {
        ...body,
        businessSlug,
      },
      clientIp
    );

    if (!result.success) {
      const status =
        result.code === "RATE_LIMITED"
          ? 429
          : result.code === "SLOT_TAKEN" || result.code === "CONCURRENCY_CONFLICT"
          ? 409
          : result.code === "ONLINE_BOOKING_DISABLED"
          ? 403
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
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/public/businesses/[slug]/bookings] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process booking request.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
