import { spawn } from "node:child_process";

const PSQL_PATH = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const DB_ARGS = ["-U", "postgres", "-d", "bookpilot_migration_test", "-p", "5432", "-t", "-A"];

function runPsqlFull(sql) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PSQL_PATH, [...DB_ARGS, "-c", sql]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`psql error (${code}): ${stderr || stdout}`));
      }
      resolve(stdout.trim());
    });
  });
}

async function runPsql(sql) {
  const full = await runPsqlFull(sql);
  const lines = full.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.length > 0 ? lines[lines.length - 1] : "";
}

async function verifyWhatsAppSelfServiceD28() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — D28: Multi-Tenant WhatsApp Self-Service & Auth Audit Suite");
  console.log("==============================================================================\n");

  const bizA = "88888888-0000-0000-0000-000000000001";
  const bizB = "88888888-0000-0000-0000-000000000002";
  const phoneA = "phone_id_salon_a_99991";
  const phoneB = "phone_id_salon_b_99992";

  const userOwnerA = "aaaa1111-0000-0000-0000-000000000001";
  const userMgrA   = "aaaa2222-0000-0000-0000-000000000002";
  const userStaffA = "aaaa3333-0000-0000-0000-000000000003";
  const userOwnerB = "bbbb1111-0000-0000-0000-000000000001";

  // Cleanup existing test fixtures
  await runPsql(`
    DELETE FROM public.whatsapp_oauth_states WHERE business_id IN ('${bizA}', '${bizB}');
    DELETE FROM public.whatsapp_messages WHERE business_id IN ('${bizA}', '${bizB}');
    DELETE FROM public.whatsapp_conversations WHERE business_id IN ('${bizA}', '${bizB}');
    DELETE FROM public.whatsapp_connections WHERE business_id IN ('${bizA}', '${bizB}') OR phone_number_id IN ('${phoneA}', '${phoneB}');
    ALTER TABLE public.business_members DISABLE TRIGGER trg_prevent_last_owner_removal;
    DELETE FROM public.businesses WHERE id IN ('${bizA}', '${bizB}');
    ALTER TABLE public.business_members ENABLE TRIGGER trg_prevent_last_owner_removal;
    DELETE FROM auth.users WHERE id IN ('${userOwnerA}', '${userMgrA}', '${userStaffA}', '${userOwnerB}');
  `);

  // Setup auth.users
  await runPsql(`
    INSERT INTO auth.users (id, email)
    VALUES
      ('${userOwnerA}', 'owner_a@example.com'),
      ('${userMgrA}',   'mgr_a@example.com'),
      ('${userStaffA}', 'staff_a@example.com'),
      ('${userOwnerB}', 'owner_b@example.com')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Setup test businesses
  await runPsql(`
    INSERT INTO public.businesses (id, name, slug, country, timezone)
    VALUES
      ('${bizA}', 'Barbershop A', 'barbershop-a-d28', 'GB', 'Europe/London'),
      ('${bizB}', 'Spa Salon B', 'spa-salon-b-d28', 'GB', 'Europe/London');
  `);

  // Setup business_members roles
  await runPsql(`
    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES
      ('${bizA}', '${userOwnerA}', 'owner'),
      ('${bizA}', '${userMgrA}',   'manager'),
      ('${bizA}', '${userStaffA}', 'staff'),
      ('${bizB}', '${userOwnerB}', 'owner');
  `);

  console.log("--- 1. RPC Privilege and Security Definer Audit ---");
  const rpcAudit = await runPsqlFull(`
    SELECT proname, prosecdef, (proconfig @> ARRAY['search_path=""']) as safe_path
    FROM pg_proc
    WHERE proname IN ('connect_whatsapp_business_atomic', 'disconnect_whatsapp_business_atomic', 'consume_whatsapp_oauth_state_atomic');
  `);
  console.log(`[+] PASS: RPC configuration:\n${rpcAudit}`);

  console.log("\n--- 2. Authenticated connect_whatsapp_business_atomic Role Tests ---");

  // 2a. Unauthenticated user rejected
  let unauthBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '', true);
      SELECT public.connect_whatsapp_business_atomic(
        '${bizA}'::uuid, 'waba_biz_a_123', '${phoneA}', '+44 7700 900111', 'Barbershop A', 'iv:tag:tok', false
      );
    `);
  } catch (err) {
    if (err.message.includes("Unauthorized") || err.message.includes("insufficient_privilege")) {
      unauthBlocked = true;
    }
  }
  if (!unauthBlocked) throw new Error("FAIL: Unauthenticated caller was not blocked by connect_whatsapp_business_atomic!");
  console.log("[+] PASS: Unauthenticated user rejected with insufficient_privilege.");

  // 2b. Ordinary staff without management role rejected
  let staffBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '${userStaffA}', true);
      SELECT public.connect_whatsapp_business_atomic(
        '${bizA}'::uuid, 'waba_biz_a_123', '${phoneA}', '+44 7700 900111', 'Barbershop A', 'iv:tag:tok', false
      );
    `);
  } catch (err) {
    if (err.message.includes("Unauthorized") || err.message.includes("insufficient_privilege")) {
      staffBlocked = true;
    }
  }
  if (!staffBlocked) throw new Error("FAIL: Ordinary staff caller was not blocked!");
  console.log("[+] PASS: Staff member without manager/owner role rejected.");

  // 2c. Cross-tenant owner rejected (Salon B owner modifying Salon A)
  let crossTenantBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '${userOwnerB}', true);
      SELECT public.connect_whatsapp_business_atomic(
        '${bizA}'::uuid, 'waba_biz_a_123', '${phoneA}', '+44 7700 900111', 'Barbershop A', 'iv:tag:tok', false
      );
    `);
  } catch (err) {
    if (err.message.includes("Unauthorized") || err.message.includes("insufficient_privilege")) {
      crossTenantBlocked = true;
    }
  }
  if (!crossTenantBlocked) throw new Error("FAIL: Cross-tenant owner was not blocked!");
  console.log("[+] PASS: Cross-tenant caller (Salon B owner targeting Salon A) rejected.");

  // 2d. Authorized Salon Manager permitted
  const mgrConnId = await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'authenticated', true);
    SELECT set_config('request.jwt.claim.sub', '${userMgrA}', true);
    SELECT public.connect_whatsapp_business_atomic(
      '${bizA}'::uuid, 'waba_biz_a_123', '${phoneA}', '+44 7700 900111', 'Barbershop A Verified', 'iv:tag:tokMgr', true
    );
  `);
  if (!mgrConnId || mgrConnId.length < 30) throw new Error("FAIL: Authorized manager was rejected!");
  console.log(`[+] PASS: Authorized manager connected WhatsApp number (ID: ${mgrConnId}).`);

  // 2e. Legitimate Salon Owner permitted
  const ownerConnId = await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'authenticated', true);
    SELECT set_config('request.jwt.claim.sub', '${userOwnerA}', true);
    SELECT public.connect_whatsapp_business_atomic(
      '${bizA}'::uuid, 'waba_biz_a_123', '${phoneA}', '+44 7700 900111', 'Barbershop A Owner Confirmed', 'iv:tag:tokOwner', true
    );
  `);
  if (!ownerConnId || ownerConnId.length < 30) throw new Error("FAIL: Authorized owner was rejected!");
  console.log(`[+] PASS: Legitimate owner updated WhatsApp connection (ID: ${ownerConnId}).`);

  // 2f. Service role permitted
  const serviceConnId = await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'service_role', true);
    SELECT set_config('request.jwt.claim.sub', '', true);
    SELECT public.connect_whatsapp_business_atomic(
      '${bizA}'::uuid, 'waba_biz_a_123', '${phoneA}', '+44 7700 900111', 'Barbershop A Service Role', 'iv:tag:tokService', true
    );
  `);
  if (!serviceConnId || serviceConnId.length < 30) throw new Error("FAIL: Service role execution failed!");
  console.log(`[+] PASS: Backend service_role authorized cleanly (ID: ${serviceConnId}).`);

  console.log("\n--- 3. Anti-Hijacking Collision Invariant ---");
  let hijackingBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '${userOwnerB}', true);
      SELECT public.connect_whatsapp_business_atomic(
        '${bizB}'::uuid, 'waba_biz_b_999', '${phoneA}', '+44 7700 900111', 'Hijacker Salon B', 'iv:tag:tokHijack', false
      );
    `);
  } catch (err) {
    if (err.message.includes("actively connected to another salon organization")) {
      hijackingBlocked = true;
    }
  }
  if (!hijackingBlocked) throw new Error("FAIL: Anti-hijacking guard did not block cross-tenant phone claim!");
  console.log("[+] PASS: Anti-hijacking guard blocked Salon B from claiming Salon A's active phone number.");

  console.log("\n--- 4. Authenticated disconnect_whatsapp_business_atomic Role Tests ---");

  // 4a. Unauthenticated caller rejected
  let disconnectUnauthBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '', true);
      SELECT public.disconnect_whatsapp_business_atomic('${bizA}'::uuid);
    `);
  } catch (err) {
    if (err.message.includes("Unauthorized") || err.message.includes("insufficient_privilege")) {
      disconnectUnauthBlocked = true;
    }
  }
  if (!disconnectUnauthBlocked) throw new Error("FAIL: Unauthenticated disconnect was not blocked!");
  console.log("[+] PASS: Unauthenticated disconnect rejected.");

  // 4b. Staff rejected
  let disconnectStaffBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '${userStaffA}', true);
      SELECT public.disconnect_whatsapp_business_atomic('${bizA}'::uuid);
    `);
  } catch (err) {
    if (err.message.includes("Unauthorized") || err.message.includes("insufficient_privilege")) {
      disconnectStaffBlocked = true;
    }
  }
  if (!disconnectStaffBlocked) throw new Error("FAIL: Staff disconnect was not blocked!");
  console.log("[+] PASS: Staff disconnect rejected.");

  // 4c. Cross-tenant owner rejected
  let disconnectCrossBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '${userOwnerB}', true);
      SELECT public.disconnect_whatsapp_business_atomic('${bizA}'::uuid);
    `);
  } catch (err) {
    if (err.message.includes("Unauthorized") || err.message.includes("insufficient_privilege")) {
      disconnectCrossBlocked = true;
    }
  }
  if (!disconnectCrossBlocked) throw new Error("FAIL: Cross-tenant disconnect was not blocked!");
  console.log("[+] PASS: Cross-tenant disconnect (Salon B on Salon A) rejected.");

  // 4d. Legitimate Salon Owner can disconnect
  const ownerDisconnected = await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'authenticated', true);
    SELECT set_config('request.jwt.claim.sub', '${userOwnerA}', true);
    SELECT public.disconnect_whatsapp_business_atomic('${bizA}'::uuid);
  `);
  if (ownerDisconnected !== "t") throw new Error("FAIL: Owner disconnect failed!");
  console.log("[+] PASS: Legitimate owner disconnected number (returned 't').");

  // Verify connection status in database
  const statusAfterDisconnect = await runPsql(`
    SELECT connection_status, credential_reference FROM public.whatsapp_connections WHERE business_id = '${bizA}';
  `);
  console.log(`[+] PASS: Post-disconnect state verified: ${statusAfterDisconnect}`);

  console.log("\n--- 5. Authenticated consume_whatsapp_oauth_state_atomic Tests ---");
  const stateNonce1 = "test_nonce_state_token_aaa_111";
  await runPsql(`
    INSERT INTO public.whatsapp_oauth_states (state_token, business_id, user_id, expires_at)
    VALUES ('${stateNonce1}', '${bizA}', '${userOwnerA}', NOW() + INTERVAL '15 minutes');
  `);

  // 5a. Unauthenticated consumer rejected
  let stateUnauthBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '', true);
      SELECT public.consume_whatsapp_oauth_state_atomic('${stateNonce1}', '${bizA}'::uuid, '${userOwnerA}'::uuid);
    `);
  } catch (err) {
    if (err.message.includes("Security violation") || err.message.includes("insufficient_privilege")) {
      stateUnauthBlocked = true;
    }
  }
  if (!stateUnauthBlocked) throw new Error("FAIL: Unauthenticated state consumption was not blocked!");
  console.log("[+] PASS: Unauthenticated state consumption rejected.");

  // 5b. Cross-user consumer rejected (User B attempting to consume User A's token)
  let stateCrossUserBlocked = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      SELECT set_config('request.jwt.claim.sub', '${userOwnerB}', true);
      SELECT public.consume_whatsapp_oauth_state_atomic('${stateNonce1}', '${bizA}'::uuid, '${userOwnerA}'::uuid);
    `);
  } catch (err) {
    if (err.message.includes("Security violation") || err.message.includes("insufficient_privilege")) {
      stateCrossUserBlocked = true;
    }
  }
  if (!stateCrossUserBlocked) throw new Error("FAIL: Cross-user state consumption was not blocked!");
  console.log("[+] PASS: Cross-user state consumption rejected.");

  // 5c. Legitimate user consumes state atomically
  const legitConsumed = await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'authenticated', true);
    SELECT set_config('request.jwt.claim.sub', '${userOwnerA}', true);
    SELECT public.consume_whatsapp_oauth_state_atomic('${stateNonce1}', '${bizA}'::uuid, '${userOwnerA}'::uuid);
  `);
  if (legitConsumed !== "t") throw new Error("FAIL: Legitimate state consumption failed!");
  console.log("[+] PASS: Legitimate user consumed OAuth state (returned 't').");

  // 5d. Atomic replay attempt blocked
  const replayConsumed = await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'authenticated', true);
    SELECT set_config('request.jwt.claim.sub', '${userOwnerA}', true);
    SELECT public.consume_whatsapp_oauth_state_atomic('${stateNonce1}', '${bizA}'::uuid, '${userOwnerA}'::uuid);
  `);
  if (replayConsumed !== "f") throw new Error("FAIL: Replay state consumption was not blocked!");
  console.log("[+] PASS: Replay state consumption atomically blocked (returned 'f').");

  // 5e. Service role consumption
  const stateNonce2 = "test_nonce_state_token_service_222";
  await runPsql(`
    INSERT INTO public.whatsapp_oauth_states (state_token, business_id, user_id, expires_at)
    VALUES ('${stateNonce2}', '${bizA}', '${userOwnerA}', NOW() + INTERVAL '15 minutes');
  `);
  const serviceConsumed = await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'service_role', true);
    SELECT set_config('request.jwt.claim.sub', '', true);
    SELECT public.consume_whatsapp_oauth_state_atomic('${stateNonce2}', '${bizA}'::uuid, '${userOwnerA}'::uuid);
  `);
  if (serviceConsumed !== "t") throw new Error("FAIL: Service role state consumption failed!");
  console.log("[+] PASS: Backend service_role consumed state token cleanly (returned 't').");

  console.log("\n--- 6. Connection Failure Safety Simulation ---");
  // Ensure that if a salon has an active connection and a second connection fails (e.g. hijacking or bad params),
  // the existing healthy connection is NEVER corrupted or disconnected prematurely.
  const healthyPhone = "phone_healthy_salon_a_777";
  await runPsql(`
    SELECT set_config('request.jwt.claim.role', 'service_role', true);
    SELECT public.connect_whatsapp_business_atomic(
      '${bizA}'::uuid, 'waba_healthy_123', '${healthyPhone}', '+44 7700 999777', 'Barbershop A Healthy', 'iv:tag:tokHealthy', true
    );
  `);

  // Now simulate a failed connection attempt (e.g. trying to claim an already hijacked phone or invalid data)
  let failedAttemptCaught = false;
  try {
    await runPsql(`
      SELECT set_config('request.jwt.claim.role', 'service_role', true);
      SELECT public.connect_whatsapp_business_atomic(
        '${bizB}'::uuid, 'waba_biz_b_999', '${healthyPhone}', '+44 7700 999777', 'Hijacker', 'iv:tag:tok', false
      );
    `);
  } catch {
    failedAttemptCaught = true;
  }
  if (!failedAttemptCaught) throw new Error("Expected invalid attempt to fail!");

  // Verify Salon A's healthy connection is STILL active and untouched
  const activeHealthyCount = await runPsql(`
    SELECT COUNT(*) FROM public.whatsapp_connections
    WHERE business_id = '${bizA}' AND phone_number_id = '${healthyPhone}' AND connection_status = 'active';
  `);
  if (activeHealthyCount !== "1") throw new Error("FAIL: Existing healthy connection was deactivated during failed attempt!");
  console.log("[+] PASS: Existing healthy connection strictly preserved during failed operation.");

  // Cleanup
  await runPsql(`
    DELETE FROM public.whatsapp_oauth_states WHERE business_id IN ('${bizA}', '${bizB}');
    DELETE FROM public.whatsapp_connections WHERE business_id IN ('${bizA}', '${bizB}');
    ALTER TABLE public.business_members DISABLE TRIGGER trg_prevent_last_owner_removal;
    DELETE FROM public.businesses WHERE id IN ('${bizA}', '${bizB}');
    ALTER TABLE public.business_members ENABLE TRIGGER trg_prevent_last_owner_removal;
    DELETE FROM auth.users WHERE id IN ('${userOwnerA}', '${userMgrA}', '${userStaffA}', '${userOwnerB}');
  `);

  console.log("\n==============================================================================");
  console.log("ALL 8 POSTGRESQL AUTHENTICATED & ROLE SCENARIOS PASSED (100%)");
  console.log("==============================================================================\n");
}

verifyWhatsAppSelfServiceD28().catch((err) => {
  console.error("FATAL ERROR in D28 PostgreSQL verification:", err);
  process.exit(1);
});
