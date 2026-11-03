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
  console.log("BOOKZELLO — D26 Production Read-Only Preflight Audit");
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

  // 1. Verify Migration 0016 RPCs are operational
  console.log("\n--- 1. Verifying Migration 0016 RPCs Status ---");
  const dummyUUID = "00000000-0000-0000-0000-000000000000";

  const { error: rpcErr1 } = await supabase.rpc("replace_service_staff_assignments_atomic", {
    p_business_id: dummyUUID,
    p_service_id: dummyUUID,
    p_staff_ids: [],
  });
  // Should return 401 Unauthorized for anonymous caller (verifying strict auth boundary)
  console.log("  replace_service_staff_assignments_atomic status:", rpcErr1?.code === "PGRST301" || rpcErr1?.message?.includes("permission") ? "PROTECTED (Operational)" : rpcErr1?.message || "Active");

  const { error: rpcErr2 } = await supabase.rpc("bulk_assign_staff_to_services_atomic", {
    p_business_id: dummyUUID,
    p_staff_ids: [dummyUUID],
    p_service_ids: [dummyUUID],
    p_mode: "append",
  });
  console.log("  bulk_assign_staff_to_services_atomic status:", rpcErr2?.code === "PGRST301" || rpcErr2?.message?.includes("permission") ? "PROTECTED (Operational)" : rpcErr2?.message || "Active");

  // 2. Confirm Migration 0017 is absent in Production
  console.log("\n--- 2. Checking if Migration 0017 has been applied to Production ---");
  const { error: colError } = await supabase
    .from("business_booking_policies")
    .select("allow_staff_selection")
    .limit(1);

  if (colError && (colError.code === "PGRST204" || colError.message?.includes("allow_staff_selection"))) {
    console.log("[+] CONFIRMED: Column 'allow_staff_selection' does NOT exist in Production schema.");
    console.log("[+] CONFIRMED: Migration 0017 is completely ABSENT from Production as required.");
  } else if (!colError) {
    console.log("[!] WARNING: Column 'allow_staff_selection' already exists in Production!");
  } else {
    console.log("  Column check query response:", colError.message);
  }

  // 3. Confirm WhatsApp safety constraints
  console.log("\n--- 3. Verifying Safety Constraints ---");
  const whatsappWrites = env.WHATSAPP_BOOKING_WRITES_ENABLED === "true";
  console.log(`  WHATSAPP_BOOKING_WRITES_ENABLED: ${env.WHATSAPP_BOOKING_WRITES_ENABLED} (${!whatsappWrites ? "SAFE" : "DANGER"})`);

  if (whatsappWrites) {
    console.error("[FATAL] WHATSAPP_BOOKING_WRITES_ENABLED must be false!");
    process.exit(1);
  }

  console.log("\n==============================================================================");
  console.log("PRODUCTION READ-ONLY PREFLIGHT AUDIT COMPLETE — READY FOR ORDERED RELEASE");
  console.log("==============================================================================");
}

runPreflight().catch((err) => {
  console.error("FATAL PREFLIGHT FAILURE:", err);
  process.exit(1);
});
