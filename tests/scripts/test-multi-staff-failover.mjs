import { spawn } from "node:child_process";

const PSQL_PATH = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const DB_ARGS = ["-U", "postgres", "-d", "bookpilot_migration_test", "-p", "5432", "-t", "-A"];

function runPsql(sql) {
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

async function testMultiStaffFailover() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — D26: Multi-Staff Concurrency & Failover Real PostgreSQL Verification");
  console.log("==============================================================================\n");

  // 1. Setup Test Fixtures: 1 Salon, 1 Service, 2 Qualified Active Staff
  const bizId = "88888888-0000-0000-0000-000000000001";
  const svcId = "88888888-1111-0000-0000-000000000001";
  const stf1 = "88888888-2222-0000-0000-000000000001";
  const stf2 = "88888888-2222-0000-0000-000000000002";
  const slug = "d26-failover-salon";

  const setupSql = `
    BEGIN;
    DELETE FROM public.appointment_management_tokens WHERE business_id = '${bizId}';
    DELETE FROM public.notification_outbox WHERE business_id = '${bizId}';
    DELETE FROM public.appointments WHERE business_id = '${bizId}';
    DELETE FROM public.staff_services WHERE business_id = '${bizId}';
    DELETE FROM public.staff_working_hours WHERE staff_id IN ('${stf1}', '${stf2}');
    DELETE FROM public.staff_profiles WHERE business_id = '${bizId}' OR id IN ('${stf1}', '${stf2}');
    DELETE FROM public.services WHERE business_id = '${bizId}' OR id IN ('${svcId}', '88888888-1111-0000-0000-000000000002');
    DELETE FROM public.business_opening_hours WHERE business_id = '${bizId}';
    DELETE FROM public.business_booking_policies WHERE business_id = '${bizId}';
    DELETE FROM public.businesses WHERE id = '${bizId}';

    INSERT INTO public.businesses (id, name, slug, timezone, currency)
    VALUES ('${bizId}', 'D26 Failover Salon', '${slug}', 'UTC', 'GBP');

    INSERT INTO public.business_booking_policies (business_id, min_notice_hours, max_advance_days, online_booking_enabled, allow_staff_selection)
    VALUES ('${bizId}', 0, 90, true, true);

    -- Open 7 days a week 08:00 - 20:00
    INSERT INTO public.business_opening_hours (business_id, day_of_week, is_closed, open_time, close_time)
    SELECT '${bizId}', g, false, '08:00:00'::time, '20:00:00'::time
    FROM generate_series(0, 6) g;

    INSERT INTO public.services (id, business_id, name, duration_minutes, buffer_minutes, price_amount, is_active, is_archived)
    VALUES ('${svcId}', '${bizId}', 'Standard Haircut', 30, 0, 25.00, true, false);

    -- Staff 1 (Alex) and Staff 2 (Bob)
    INSERT INTO public.staff_profiles (id, business_id, display_name, is_active, is_archived)
    VALUES 
      ('${stf1}', '${bizId}', 'Alex Barber', true, false),
      ('${stf2}', '${bizId}', 'Bob Barber', true, false);

    -- Working hours for both staff 08:00 - 20:00
    INSERT INTO public.staff_working_hours (business_id, staff_id, day_of_week, is_working, open_time, close_time)
    SELECT '${bizId}', s.id, g, true, '08:00:00'::time, '20:00:00'::time
    FROM (VALUES ('${stf1}'::uuid), ('${stf2}'::uuid)) s(id)
    CROSS JOIN generate_series(0, 6) g;

    -- Both qualified for Standard Haircut
    INSERT INTO public.staff_services (business_id, service_id, staff_id)
    VALUES 
      ('${bizId}', '${svcId}', '${stf1}'),
      ('${bizId}', '${svcId}', '${stf2}');
    COMMIT;
  `;

  await runPsql(setupSql);
  console.log("[+] Test fixtures initialized with 2 qualified barbers for standard haircut.");

  // Test 1: Two simultaneous customers booking the exact same slot with p_staff_id = NULL
  const testSlot = "2026-11-15T14:00:00Z";
  console.log(`[+] Launching 2 simultaneous bookings for 'Any Available' at ${testSlot}...`);

  const bookCall1 = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    NULL,
    '${testSlot}'::timestamptz,
    'Customer One',
    'customer1@test.com',
    '+447000000001',
    'Simultaneous client 1',
    'idemp-sim-1'
  );`;

  const bookCall2 = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    NULL,
    '${testSlot}'::timestamptz,
    'Customer Two',
    'customer2@test.com',
    '+447000000002',
    'Simultaneous client 2',
    'idemp-sim-2'
  );`;

  const [res1Str, res2Str] = await Promise.all([runPsql(bookCall1), runPsql(bookCall2)]);
  const res1 = JSON.parse(res1Str);
  const res2 = JSON.parse(res2Str);

  console.log("  Customer 1 Result:", res1.success ? `SUCCESS (Staff: ${res1.data.staff_name})` : `FAILED (${res1.code})`);
  console.log("  Customer 2 Result:", res2.success ? `SUCCESS (Staff: ${res2.data.staff_name})` : `FAILED (${res2.code})`);

  if (!res1.success || !res2.success) {
    throw new Error(`FAIL: One of the simultaneous bookings failed: Res1: ${JSON.stringify(res1)}, Res2: ${JSON.stringify(res2)}`);
  }

  if (res1.data.staff_id === res2.data.staff_id) {
    throw new Error(`FAIL: Both customers were assigned the same staff member: ${res1.data.staff_id}`);
  }

  console.log("[+] PASS: Both simultaneous customers successfully confirmed without collision or false SLOT_TAKEN!");

  // Test 2: Third customer booking the same slot when all 2 staff are now occupied
  console.log("[+] Testing 3rd customer booking when all staff are occupied...");
  const bookCall3 = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    NULL,
    '${testSlot}'::timestamptz,
    'Customer Three',
    'customer3@test.com',
    '+447000000003',
    'Simultaneous client 3',
    'idemp-sim-3'
  );`;

  const res3Str = await runPsql(bookCall3);
  const res3 = JSON.parse(res3Str);
  console.log("  Customer 3 Result:", res3.success ? "SUCCESS" : `REJECTED (${res3.code}: ${res3.message})`);

  if (res3.success || res3.code !== "SLOT_TAKEN") {
    throw new Error(`FAIL: Expected 3rd booking to be rejected with SLOT_TAKEN, got: ${JSON.stringify(res3)}`);
  }
  console.log("[+] PASS: 3rd customer correctly received SLOT_TAKEN once all qualified staff were occupied.");

  // Test 3: Zero Qualified Staff Service
  console.log("\n[+] Testing booking for a service with ZERO qualified staff...");
  const emptySvcId = "88888888-1111-0000-0000-000000000002";
  await runPsql(`
    INSERT INTO public.services (id, business_id, name, duration_minutes, buffer_minutes, price_amount, is_active, is_archived)
    VALUES ('${emptySvcId}', '${bizId}', 'Unqualified Service', 30, 0, 50.00, true, false);
  `);

  const emptySvcCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${emptySvcId}'::uuid,
    NULL,
    '2026-11-15T15:00:00Z'::timestamptz,
    'Customer Four',
    'customer4@test.com',
    '+447000000004'
  );`;
  const emptyRes = JSON.parse(await runPsql(emptySvcCall));
  console.log("  Zero Qualified Staff Result:", emptyRes.success ? "SUCCESS" : `REJECTED (${emptyRes.code}: ${emptyRes.message})`);
  if (emptyRes.success || emptyRes.code !== "SLOT_TAKEN") {
    throw new Error(`FAIL: Zero-qualified service should reject slot: ${JSON.stringify(emptyRes)}`);
  }
  console.log("[+] PASS: Service with zero qualified staff strictly rejects booking attempts.");

  // Test 4: Explicit Customer Staff Preference Collision
  console.log("\n[+] Testing explicit customer staff preference collision (both pick Alex)...");
  const specificSlot = "2026-11-15T16:00:00Z";
  const explicitCall1 = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    '${stf1}'::uuid,
    '${specificSlot}'::timestamptz,
    'Customer Five',
    'customer5@test.com',
    '+447000000005'
  );`;
  const explicitCall2 = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    '${stf1}'::uuid,
    '${specificSlot}'::timestamptz,
    'Customer Six',
    'customer6@test.com',
    '+447000000006'
  );`;

  const [expRes1Str, expRes2Str] = await Promise.all([runPsql(explicitCall1), runPsql(explicitCall2)]);
  const expRes1 = JSON.parse(expRes1Str);
  const expRes2 = JSON.parse(expRes2Str);

  const successCount = (expRes1.success ? 1 : 0) + (expRes2.success ? 1 : 0);
  const conflictCount = (!expRes1.success && expRes1.code === "SLOT_TAKEN" ? 1 : 0) + (!expRes2.success && expRes2.code === "SLOT_TAKEN" ? 1 : 0);

  if (successCount !== 1 || conflictCount !== 1) {
    throw new Error(`FAIL: Expected exactly 1 success and 1 SLOT_TAKEN when two customers pick the same specialist at the same time. Got: ${JSON.stringify({ expRes1, expRes2 })}`);
  }
  console.log("[+] PASS: When two customers pick the same specialist, exactly one succeeds and the other receives SLOT_TAKEN (no unwanted reassignment).");

  // Test 5: Cross-Tenant Staff Protection
  console.log("\n[+] Testing cross-tenant staff selection rejection...");
  const foreignStaffId = "99999999-0000-0000-0000-000000000099";
  const crossTenantCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    '${foreignStaffId}'::uuid,
    '2026-11-15T17:00:00Z'::timestamptz,
    'Customer Seven',
    'customer7@test.com',
    '+447000000007'
  );`;
  const crossTenantRes = JSON.parse(await runPsql(crossTenantCall));
  if (crossTenantRes.success || crossTenantRes.code !== "STAFF_NOT_ELIGIBLE") {
    throw new Error(`FAIL: Cross-tenant staff was not rejected with STAFF_NOT_ELIGIBLE: ${JSON.stringify(crossTenantRes)}`);
  }
  console.log("[+] PASS: Foreign-tenant staff strictly rejected with STAFF_NOT_ELIGIBLE.");

  // Test 6: Booking Policy Toggle Enforcement (allow_staff_selection = FALSE)
  console.log("\n[+] Testing booking policy allow_staff_selection toggle enforcement...");
  await runPsql(`UPDATE public.business_booking_policies SET allow_staff_selection = FALSE WHERE business_id = '${bizId}';`);

  const disabledSelectionCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    '${stf1}'::uuid,
    '2026-11-15T18:00:00Z'::timestamptz,
    'Customer Eight',
    'customer8@test.com',
    '+447000000008'
  );`;
  const disabledRes = JSON.parse(await runPsql(disabledSelectionCall));
  if (disabledRes.success || disabledRes.code !== "STAFF_SELECTION_DISABLED") {
    throw new Error(`FAIL: Specific staff booking was not rejected when allow_staff_selection = FALSE: ${JSON.stringify(disabledRes)}`);
  }
  console.log("[+] PASS: Explicit staff selection is rejected with STAFF_SELECTION_DISABLED when policy toggle is OFF.");

  // Test 7: Auto-assignment works when allow_staff_selection = FALSE
  console.log("\n[+] Testing auto-assignment when allow_staff_selection = FALSE...");
  const autoAssignCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    NULL,
    '2026-11-15T18:00:00Z'::timestamptz,
    'Customer Nine',
    'customer9@test.com',
    '+447000000009',
    NULL,
    'd26-auto-idemp-1'
  );`;
  const autoAssignRes = JSON.parse(await runPsql(autoAssignCall));
  if (!autoAssignRes.success || !autoAssignRes.data?.appointment_id) {
    throw new Error(`FAIL: Auto-assignment failed when allow_staff_selection = FALSE: ${JSON.stringify(autoAssignRes)}`);
  }
  console.log(`[+] PASS: Auto-assignment succeeded under policy toggle OFF (Staff: ${autoAssignRes.data.staff_name}).`);

  // Test 8: Idempotency replay & conflict handling
  console.log("\n[+] Testing idempotency replay and conflict handling...");
  const replayCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    NULL,
    '2026-11-15T18:00:00Z'::timestamptz,
    'Customer Nine',
    'customer9@test.com',
    '+447000000009',
    NULL,
    'd26-auto-idemp-1'
  );`;
  const replayRes = JSON.parse(await runPsql(replayCall));
  if (!replayRes.success || !replayRes.is_idempotent_replay) {
    throw new Error(`FAIL: Idempotency replay failed: ${JSON.stringify(replayRes)}`);
  }
  console.log("[+] PASS: Exact idempotency replay succeeded and returned existing appointment.");

  const conflictIdempCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    NULL,
    '2026-11-15T18:00:00Z'::timestamptz,
    'Customer Ten',
    'customer10@different.com',
    '+447000000010',
    NULL,
    'd26-auto-idemp-1'
  );`;
  const conflictIdempRes = JSON.parse(await runPsql(conflictIdempCall));
  if (conflictIdempRes.success || conflictIdempRes.code !== "IDEMPOTENCY_CONFLICT") {
    throw new Error(`FAIL: Idempotency conflict was not rejected: ${JSON.stringify(conflictIdempRes)}`);
  }
  console.log("[+] PASS: Re-using idempotency key for different customer rejected with IDEMPOTENCY_CONFLICT.");

  // Test 9: Management token and outbox enrichment
  console.log("\n[+] Testing management token and outbox enrichment...");
  const tokenHash = "a".repeat(64);
  const mgmtUrl = "https://bookzello.com/manage-booking/testtoken123";
  const tokenBookingCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcId}'::uuid,
    NULL,
    '2026-11-15T18:30:00Z'::timestamptz,
    'Customer Eleven',
    'customer11@test.com',
    '+447000000011',
    'Test notes',
    'd26-token-test-1',
    '${tokenHash}',
    NULL,
    '${mgmtUrl}'
  );`;
  const tokenBookingRes = JSON.parse(await runPsql(tokenBookingCall));
  if (!tokenBookingRes.success) {
    throw new Error(`FAIL: Token booking call failed: ${JSON.stringify(tokenBookingRes)}`);
  }
  const aptId = tokenBookingRes.data.appointment_id;

  const tokenRecord = await runPsql(`SELECT token_hash FROM public.appointment_management_tokens WHERE appointment_id = '${aptId}';`);
  if (tokenRecord !== tokenHash) {
    throw new Error(`FAIL: Management token record not stored correctly. Expected ${tokenHash}, got ${tokenRecord}`);
  }

  const outboxPayload = await runPsql(`SELECT payload->>'management_url' FROM public.notification_outbox WHERE appointment_id = '${aptId}';`);
  if (outboxPayload !== mgmtUrl) {
    throw new Error(`FAIL: Outbox management_url not enriched correctly. Expected ${mgmtUrl}, got ${outboxPayload}`);
  }
  console.log("[+] PASS: Management token hash stored and outbox management URL enriched successfully.");

  console.log("\n==============================================================================");
  console.log("ALL 9 REAL POSTGRESQL CONCURRENCY & MULTI-STAFF FAILOVER TESTS PASSED (100%)");
  console.log("==============================================================================");
}

testMultiStaffFailover().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
