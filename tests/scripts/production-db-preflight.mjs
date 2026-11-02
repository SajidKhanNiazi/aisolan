import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [k, ...v] = trimmed.split("=");
      env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

async function runPreflight() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — D25D: Production Database Read-Only Preflight");
  console.log("==============================================================================\n");

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error("[FATAL] Supabase configuration missing from .env.local");
    process.exit(1);
  }

  console.log(`[Target Supabase Project]: ${url}`);
  const supabase = createClient(url, key);

  // 1. Verify required tables and columns in production
  console.log("\n--- 1. Required Tables & Columns Verification ---");
  const tablesToCheck = [
    { name: "businesses", select: "id, name, slug, timezone" },
    { name: "business_members", select: "business_id, user_id, role" },
    { name: "services", select: "id, business_id, name, is_active, is_archived" },
    { name: "staff_profiles", select: "id, business_id, display_name, is_active, is_archived" },
    { name: "staff_services", select: "business_id, staff_id, service_id" },
    { name: "business_onboarding_progress", select: "business_id, current_step, completed_steps, is_completed" },
  ];

  for (const t of tablesToCheck) {
    const { error } = await supabase.from(t.name).select(t.select).limit(0);
    if (error) {
      console.log(`  [-] Table ${t.name}: ERROR (${error.code}) ${error.message}`);
    } else {
      console.log(`  [+] Table ${t.name}: AVAILABLE with required columns (${t.select})`);
    }
  }

  // 2. Check if migration 0016 RPCs already exist or are absent
  console.log("\n--- 2. Migration 0016 RPC Status in Schema Cache ---");
  const rpcsToCheck = [
    {
      name: "replace_service_staff_assignments_atomic",
      params: {
        p_business_id: "00000000-0000-0000-0000-000000000000",
        p_service_id: "00000000-0000-0000-0000-000000000000",
        p_staff_ids: [],
      },
    },
    {
      name: "replace_staff_services_atomic",
      params: {
        p_business_id: "00000000-0000-0000-0000-000000000000",
        p_staff_id: "00000000-0000-0000-0000-000000000000",
        p_service_ids: [],
      },
    },
    {
      name: "bulk_assign_staff_to_services_atomic",
      params: {
        p_business_id: "00000000-0000-0000-0000-000000000000",
        p_staff_ids: [],
        p_service_ids: [],
      },
    },
  ];

  for (const rpc of rpcsToCheck) {
    const { error } = await supabase.rpc(rpc.name, rpc.params);
    if (error && error.code === "PGRST202") {
      console.log(`  [+] RPC ${rpc.name}: NOT YET APPLIED (PGRST202: missing from schema cache as expected)`);
    } else if (error) {
      console.log(`  [?] RPC ${rpc.name}: Returned code ${error.code}: ${error.message}`);
    } else {
      console.log(`  [!] RPC ${rpc.name}: ALREADY EXISTS in production schema!`);
    }
  }

  // 3. Check existing owner/manager authorization helper
  console.log("\n--- 3. Owner/Manager Authorization Helper Check ---");
  const { error: helperErr } = await supabase.rpc("is_business_manager_or_owner", {
    p_business_id: "00000000-0000-0000-0000-000000000000",
    p_user_id: "00000000-0000-0000-0000-000000000000",
  });
  if (helperErr) {
    console.log(`  Helper call status: Code ${helperErr.code} — ${helperErr.message}`);
    if (helperErr.code === "42501" || helperErr.message.includes("permission denied")) {
      console.log("  [+] is_business_manager_or_owner is correctly PROTECTED from anon execution (REVOKED).");
    } else if (helperErr.code === "PGRST202") {
      console.log("  [-] is_business_manager_or_owner is MISSING from schema cache.");
    }
  } else {
    console.log("  [+] is_business_manager_or_owner is present.");
  }

  console.log("\n==============================================================================");
  console.log("PRODUCTION PREFLIGHT COMPLETE (READ-ONLY)");
  console.log("==============================================================================");
}

runPreflight().catch((err) => {
  console.error(err);
  process.exit(1);
});
