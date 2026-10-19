import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 * Returns non-sensitive status information indicating application readiness.
 * Does not expose environment variables, credentials, or internal configuration.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "bookpilot",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
