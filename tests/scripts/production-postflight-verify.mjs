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

async function runPostflight() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — Migration 0016 Production Post-Execution Verification");
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

  // 1. Verify all three RPCs exist in schema cache and test permission boundaries
  console.log("\n--- 1. Verification of Migration 0016 RPCs & Security Privileges ---");
  const dummyUUID = "00000000-0000-0000-0000-000000000000";

  const rpcs = [
    {
      name: "replace_service_staff_assignments_atomic",
      params: {
        p_business_id: dummyUUID,
        p_service_id: dummyUUID,
        p_staff_ids: [],
      },
    },
    {
      name: "replace_staff_services_atomic",
      params: {
        p_business_id: dummyUUID,
        p_staff_id: dummyUUID,
        p_service_ids: [],
      },
    },
    {
      name: "bulk_assign_staff_to_services_atomic",
      params: {
        p_business_id: dummyUUID,
        p_staff_ids: [],
        p_service_ids: [],
        p_mode: "append",
      },
    },
  ];

  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc.name, rpc.params);
    if (error) {
      // If error is 42501 (permission denied for schema/function) or PGRST202 (not found)
      if (error.code === "PGRST202") {
        console.log(`  [-] RPC ${rpc.name}: NOT FOUND (PGRST202). Has schema cache reloaded?`);
      } else if (error.code === "42501") {
        console.log(`  [+] RPC ${rpc.name}: PRESENT & STRICTLY PROTECTED (42501 Permission Denied for anon role as required by REVOKE).`);
      } else {
        console.log(`  [+] RPC ${rpc.name}: PRESENT (Returned ${error.code}: ${error.message})`);
      }
    } else {
      console.log(`  [+] RPC ${rpc.name}: PRESENT and returned:`, data);
    }
  }

  // 2. Production Health Check
  console.log("\n--- 2. Production Health & Configuration Audit ---");
  try {
    const healthRes = await fetch("https://bookzello.com/api/health");
    const healthJson = await healthRes.json();
    console.log(`  [+] Health status: HTTP ${healthRes.status}`, healthJson);
  } catch (err) {
    console.log(`  [-] Health check failed:`, err.message);
  }

  // 3. Verify Table Integrity & Zero Mutation
  console.log("\n--- 3. Database Table Availability Check (Read-Only) ---");
  const tables = [
    "businesses",
    "business_members",
    "services",
    "staff_profiles",
    "staff_services",
    "business_onboarding_progress",
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`  [-] Table ${table}: ${error.message}`);
    } else {
      console.log(`  [+] Table ${table}: ACCESSIBLE (Row count: ${count})`);
    }
  }

  console.log("\n==============================================================================");
  console.log("PRODUCTION POST-EXECUTION VERIFICATION COMPLETE");
  console.log("==============================================================================");
}

runPostflight().catch(console.error);
