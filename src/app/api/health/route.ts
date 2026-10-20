import { NextResponse, type NextRequest } from "next/server";
import { verifyDatabaseSchema } from "@/lib/supabase/schema-check";

/**
 * Health check endpoint.
 * Returns non-sensitive status information indicating application readiness.
 * Does not expose environment variables, credentials, or internal configuration.
 * When called with ?schema=true, verifies that Phase 1C database migrations are applied.
 */
export async function GET(request?: NextRequest) {
  const checkSchema = request?.nextUrl ? request.nextUrl.searchParams.get("schema") === "true" : false;

  if (checkSchema) {
    const schemaStatus = await verifyDatabaseSchema();
    const isHealthy = schemaStatus.synchronized;

    return NextResponse.json(
      {
        status: isHealthy ? "ok" : "degraded",
        service: "bookpilot",
        schema: {
          synchronized: schemaStatus.synchronized,
          missingEntities: schemaStatus.missingEntities,
          phase: schemaStatus.phase,
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

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
