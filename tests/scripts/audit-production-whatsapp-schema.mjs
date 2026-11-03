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

async function auditProductionWhatsApp() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — Production Schema Audit: WhatsApp Integration Tables & RPCs");
  console.log("==============================================================================\n");

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("[FATAL] Supabase configuration missing from .env.local");
    process.exit(1);
  }

  console.log(`[Target Supabase Project]: ${url}`);
  const client = createClient(url, serviceKey || key);

  const tablesToCheck = [
    "whatsapp_connections",
    "whatsapp_conversations",
    "whatsapp_messages",
    "whatsapp_webhook_events",
    "whatsapp_templates",
  ];

  console.log("\n--- 1. Table Existence Check in Production ---");
  for (const tableName of tablesToCheck) {
    const { error } = await client.from(tableName).select("id").limit(1);
    if (!error) {
      console.log(`[+] ${tableName}: EXISTS`);
    } else if (error.code === "PGRST205" || error.message?.includes("does not exist") || error.code === "42P01") {
      console.log(`[-] ${tableName}: DOES NOT EXIST (Error: ${error.message})`);
    } else {
      console.log(`[?] ${tableName}: Response code ${error.code}: ${error.message}`);
    }
  }

  console.log("\n--- 2. RPC Existence Check in Production ---");
  const rpcsToCheck = [
    { name: "claim_due_whatsapp_events_atomic", params: { p_batch_size: 1, p_lease_seconds: 60 } },
    { name: "create_public_appointment_atomic", params: { p_business_slug: "test-slug", p_service_id: "00000000-0000-0000-0000-000000000000" } },
  ];

  for (const rpc of rpcsToCheck) {
    const { error } = await client.rpc(rpc.name, rpc.params);
    if (!error) {
      console.log(`[+] RPC ${rpc.name}: EXISTS (callable)`);
    } else if (error.code === "PGRST202" || error.message?.includes("function") && error.message?.includes("does not exist")) {
      console.log(`[-] RPC ${rpc.name}: DOES NOT EXIST`);
    } else if (error.code === "PGRST301" || error.message?.includes("permission")) {
      console.log(`[+] RPC ${rpc.name}: EXISTS (Permission Protected)`);
    } else {
      console.log(`[+] RPC ${rpc.name}: EXISTS (Returned error: ${error.code} - ${error.message})`);
    }
  }

  console.log("\n--- 3. WhatsApp Environment Variables Check ---");
  const waEnvKeys = [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_WEBHOOK_SECRET",
    "WHATSAPP_BOOKING_WRITES_ENABLED",
    "QSTASH_TOKEN",
    "QSTASH_CURRENT_SIGNING_KEY",
    "QSTASH_NEXT_SIGNING_KEY",
  ];

  for (const k of waEnvKeys) {
    const val = env[k];
    const isSet = Boolean(val && val.length > 0);
    const masked = isSet ? (val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : "***") : "NOT SET";
    console.log(`  ${k.padEnd(35)}: ${isSet ? "CONFIGURED (" + masked + ")" : "NOT CONFIGURED"}`);
  }

  console.log("\n==============================================================================");
}

auditProductionWhatsApp().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
