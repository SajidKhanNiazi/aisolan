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
  const checkOpenAi = request?.nextUrl ? request.nextUrl.searchParams.get("openai") === "true" : false;

  const isOpenAiConfigured = Boolean(
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ""
  );

  if (checkOpenAi) {
    const apiKey = process.env.OPENAI_API_KEY;
    const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!isOpenAiConfigured) {
      return NextResponse.json(
        {
          status: "ok",
          service: "bookpilot",
          openAi: {
            configured: false,
            model: modelName,
            connectivity: "NOT_CONFIGURED",
            billingStatus: "UNVERIFIED",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey: apiKey!.trim(),
        timeout: 8000,
        maxRetries: 0,
      });

      // Free metadata retrieve check (verifies auth and model availability without consuming tokens)
      await client.models.retrieve(modelName);

      // 1-token test probe to check billing quota without wasting credits
      let billingStatus = "AVAILABLE";
      try {
        await client.chat.completions.create({
          model: modelName,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        });
      } catch (err: unknown) {
        const anyErr = err as { status?: number; code?: string; message?: string };
        const msg = (anyErr.message || "").toLowerCase();
        if (
          anyErr.status === 429 &&
          (msg.includes("quota") || msg.includes("billing") || anyErr.code === "insufficient_quota")
        ) {
          billingStatus = "BILLING_REQUIRED";
        } else if (anyErr.status === 429) {
          billingStatus = "RATE_LIMITED";
        }
      }

      return NextResponse.json(
        {
          status: "ok",
          service: "bookpilot",
          openAi: {
            configured: true,
            model: modelName,
            connectivity: "PASS",
            billingStatus,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    } catch (err: unknown) {
      const anyErr = err as { status?: number; message?: string };
      const msg = anyErr.message || String(err);
      let connectivity = "FAIL";
      if (anyErr.status === 401 || msg.includes("invalid_api_key") || msg.includes("Incorrect API key")) {
        connectivity = "AUTH_FAILED";
      } else if (anyErr.status === 404 || msg.includes("model_not_found")) {
        connectivity = "MODEL_NOT_FOUND";
      }

      return NextResponse.json(
        {
          status: "ok",
          service: "bookpilot",
          openAi: {
            configured: true,
            model: modelName,
            connectivity,
            billingStatus: "UNVERIFIED",
            error: msg,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
  }

  if (checkSchema) {
    const schemaStatus = await verifyDatabaseSchema();
    const isHealthy = schemaStatus.synchronized;

    const isServiceRoleConfigured = Boolean(
      (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim() !== "") ||
      (process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_KEY.trim() !== "") ||
      (process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SECRET_KEY.trim() !== "")
    );

    return NextResponse.json(
      {
        status: isHealthy ? "ok" : "degraded",
        service: "bookpilot",
        schema: {
          synchronized: schemaStatus.synchronized,
          missingEntities: schemaStatus.missingEntities,
          phase: schemaStatus.phase,
        },
        serverRateLimiterConfigured: isServiceRoleConfigured,
        openAiConfigured: isOpenAiConfigured,
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
      openAiConfigured: isOpenAiConfigured,
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

