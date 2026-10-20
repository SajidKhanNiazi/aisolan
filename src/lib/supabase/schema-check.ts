import { createClient } from "./server";

export interface SchemaCheckResult {
  synchronized: boolean;
  phase: string;
  checkedAt: string;
  missingEntities: string[];
  details: {
    entity: string;
    type: "table" | "column";
    status: "available" | "missing" | "unverified";
    error?: string;
  }[];
}

/**
 * Verifies that the connected database contains the necessary tables and columns
 * for Phase 1C without requiring privileged service-role credentials.
 * Detects PostgREST schema cache misses (PGRST204 / PGRST205) before user interaction fails.
 */
export async function verifyDatabaseSchema(): Promise<SchemaCheckResult> {
  const result: SchemaCheckResult = {
    synchronized: true,
    phase: "1C",
    checkedAt: new Date().toISOString(),
    missingEntities: [],
    details: [],
  };

  const supabase = await createClient();
  if (!supabase) {
    result.synchronized = false;
    result.missingEntities.push("supabase_client_unconfigured");
    result.details.push({
      entity: "client",
      type: "table",
      status: "unverified",
      error: "Supabase client credentials are missing or unconfigured.",
    });
    return result;
  }

  // 1. Check businesses address_line1 column
  try {
    const { error } = await supabase
      .from("businesses")
      .select("id, address_line1, timezone, logo_url")
      .limit(0);

    if (error && (error.message.includes("address_line1") || error.code === "PGRST204")) {
      result.synchronized = false;
      result.missingEntities.push("businesses.address_line1");
      result.details.push({
        entity: "businesses.address_line1",
        type: "column",
        status: "missing",
        error: error.message,
      });
    } else {
      result.details.push({
        entity: "businesses.address_line1",
        type: "column",
        status: "available",
      });
    }
  } catch (err: unknown) {
    result.synchronized = false;
    result.missingEntities.push("businesses.address_line1");
    result.details.push({
      entity: "businesses.address_line1",
      type: "column",
      status: "missing",
      error: err instanceof Error ? err.message : "Column check failed",
    });
  }

  // 2. Check business_opening_hours table
  try {
    const { error } = await supabase
      .from("business_opening_hours")
      .select("id, business_id, day_of_week")
      .limit(0);

    if (error && (error.message.includes("business_opening_hours") || error.code === "PGRST205" || error.code === "PGRST204")) {
      result.synchronized = false;
      result.missingEntities.push("public.business_opening_hours");
      result.details.push({
        entity: "public.business_opening_hours",
        type: "table",
        status: "missing",
        error: error.message,
      });
    } else {
      result.details.push({
        entity: "public.business_opening_hours",
        type: "table",
        status: "available",
      });
    }
  } catch (err: unknown) {
    result.synchronized = false;
    result.missingEntities.push("public.business_opening_hours");
    result.details.push({
      entity: "public.business_opening_hours",
      type: "table",
      status: "missing",
      error: err instanceof Error ? err.message : "Table check failed",
    });
  }

  // 3. Check business_schedule_exceptions table
  try {
    const { error } = await supabase
      .from("business_schedule_exceptions")
      .select("id, business_id, exception_date")
      .limit(0);

    if (error && (error.message.includes("business_schedule_exceptions") || error.code === "PGRST205" || error.code === "PGRST204")) {
      result.synchronized = false;
      result.missingEntities.push("public.business_schedule_exceptions");
      result.details.push({
        entity: "public.business_schedule_exceptions",
        type: "table",
        status: "missing",
        error: error.message,
      });
    } else {
      result.details.push({
        entity: "public.business_schedule_exceptions",
        type: "table",
        status: "available",
      });
    }
  } catch (err: unknown) {
    result.synchronized = false;
    result.missingEntities.push("public.business_schedule_exceptions");
    result.details.push({
      entity: "public.business_schedule_exceptions",
      type: "table",
      status: "missing",
      error: err instanceof Error ? err.message : "Table check failed",
    });
  }

  // 4. Check business_booking_policies table
  try {
    const { error } = await supabase
      .from("business_booking_policies")
      .select("id, business_id, min_notice_hours")
      .limit(0);

    if (error && (error.message.includes("business_booking_policies") || error.code === "PGRST205" || error.code === "PGRST204")) {
      result.synchronized = false;
      result.missingEntities.push("public.business_booking_policies");
      result.details.push({
        entity: "public.business_booking_policies",
        type: "table",
        status: "missing",
        error: error.message,
      });
    } else {
      result.details.push({
        entity: "public.business_booking_policies",
        type: "table",
        status: "available",
      });
    }
  } catch (err: unknown) {
    result.synchronized = false;
    result.missingEntities.push("public.business_booking_policies");
    result.details.push({
      entity: "public.business_booking_policies",
      type: "table",
      status: "missing",
      error: err instanceof Error ? err.message : "Table check failed",
    });
  }

  // 5. Check business_onboarding_progress table
  try {
    const { error } = await supabase
      .from("business_onboarding_progress")
      .select("id, business_id, completed_steps")
      .limit(0);

    if (error && (error.message.includes("business_onboarding_progress") || error.code === "PGRST205" || error.code === "PGRST204")) {
      result.synchronized = false;
      result.missingEntities.push("public.business_onboarding_progress");
      result.details.push({
        entity: "public.business_onboarding_progress",
        type: "table",
        status: "missing",
        error: error.message,
      });
    } else {
      result.details.push({
        entity: "public.business_onboarding_progress",
        type: "table",
        status: "available",
      });
    }
  } catch (err: unknown) {
    result.synchronized = false;
    result.missingEntities.push("public.business_onboarding_progress");
    result.details.push({
      entity: "public.business_onboarding_progress",
      type: "table",
      status: "missing",
      error: err instanceof Error ? err.message : "Table check failed",
    });
  }

  return result;
}
