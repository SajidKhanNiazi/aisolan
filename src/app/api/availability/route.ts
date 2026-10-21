import { NextRequest, NextResponse } from "next/server";
import { getAppointmentAvailability } from "@/features/availability/server";
import { AVAILABILITY_ERROR_CODES } from "@/features/availability/availability-errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams.get("businessId") || undefined;
    const businessSlug = searchParams.get("businessSlug") || undefined;
    const serviceId = searchParams.get("serviceId") || "";
    const date = searchParams.get("date") || "";
    const staffId = searchParams.get("staffId") || undefined;
    const staffPreferenceParam = searchParams.get("staffPreference") || "any";
    const slotIntervalParam = searchParams.get("slotIntervalMinutes");

    const staffPreference =
      staffPreferenceParam === "specific" ? "specific" : "any";
    const slotIntervalMinutes = slotIntervalParam
      ? parseInt(slotIntervalParam, 10)
      : 15;

    const result = await getAppointmentAvailability({
      businessId,
      businessSlug,
      serviceId,
      date,
      staffId: staffId || null,
      staffPreference,
      slotIntervalMinutes: isNaN(slotIntervalMinutes) ? 15 : slotIntervalMinutes,
    });

    if (!result.success) {
      let status = 400;
      if (result.code === AVAILABILITY_ERROR_CODES.UNAUTHORIZED) status = 401;
      if (result.code === AVAILABILITY_ERROR_CODES.BUSINESS_ACCESS_DENIED) status = 403;
      if (
        result.code === AVAILABILITY_ERROR_CODES.BUSINESS_NOT_FOUND ||
        result.code === AVAILABILITY_ERROR_CODES.SERVICE_NOT_FOUND
      ) {
        status = 404;
      }
      return NextResponse.json(
        { success: false, code: result.code, error: result.error },
        { status }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error occurred while retrieving availability.";
    return NextResponse.json(
      {
        success: false,
        code: AVAILABILITY_ERROR_CODES.DATABASE_ERROR,
        error: message,
      },
      { status: 500 }
    );
  }
}
