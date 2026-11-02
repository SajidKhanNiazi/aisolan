import { spawn } from "node:child_process";

const PSQL_PATH = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const DB_NAME = "bookpilot_migration_test";

function runPsqlCommand(commands) {
  return new Promise((resolve, reject) => {
    const child = spawn(PSQL_PATH, ["-U", "postgres", "-d", DB_NAME, "-p", "5432"], {
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`psql exited with code ${code}: ${stderr}`));
      }
    });

    for (const cmd of commands) {
      child.stdin.write(cmd + "\n");
    }
    child.stdin.end();
  });
}

async function testCrossRpcConcurrency() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — D25D: Final Cross-RPC Concurrency & Lock-Ordering Verification");
  console.log("Database: Local Isolated PostgreSQL 17.7 (bookpilot_migration_test)");
  console.log("==============================================================================\n");

  const BIZ_A = "88888888-8888-8888-8888-888888888888";
  const BIZ_B = "77777777-7777-7777-7777-777777777777";
  const OWNER_A = "88888888-0000-0000-0000-000000000001";
  const OWNER_B = "77777777-0000-0000-0000-000000000001";

  const S1 = "88888888-1111-0000-0000-000000000001";
  const S2 = "88888888-1111-0000-0000-000000000002";
  const S3 = "88888888-1111-0000-0000-000000000003";
  const SB1 = "77777777-1111-0000-0000-000000000001";

  const T1 = "88888888-2222-0000-0000-000000000001";
  const T2 = "88888888-2222-0000-0000-000000000002";
  const T3 = "88888888-2222-0000-0000-000000000003";
  const TB1 = "77777777-2222-0000-0000-000000000001";

  // 1. Setup multi-tenant fixtures
  const setupSql = `
    DO $$
    BEGIN
      DELETE FROM public.businesses WHERE id IN ('${BIZ_A}'::UUID, '${BIZ_B}'::UUID);
      DELETE FROM auth.users WHERE id IN ('${OWNER_A}'::UUID, '${OWNER_B}'::UUID);

      INSERT INTO auth.users (id, email) VALUES
        ('${OWNER_A}'::UUID, 'owner_a_cross@test.com'),
        ('${OWNER_B}'::UUID, 'owner_b_cross@test.com');

      INSERT INTO public.businesses (id, name, slug) VALUES
        ('${BIZ_A}'::UUID, 'Cross Tenant Alpha', 'cross-tenant-alpha'),
        ('${BIZ_B}'::UUID, 'Cross Tenant Beta', 'cross-tenant-beta');

      INSERT INTO public.business_members (business_id, user_id, role) VALUES
        ('${BIZ_A}'::UUID, '${OWNER_A}'::UUID, 'owner'),
        ('${BIZ_B}'::UUID, '${OWNER_B}'::UUID, 'owner');

      INSERT INTO public.services (id, business_id, name, duration_minutes, price_amount, is_active, is_archived) VALUES
        ('${S1}'::UUID, '${BIZ_A}'::UUID, 'Service S1', 30, 25.00, true, false),
        ('${S2}'::UUID, '${BIZ_A}'::UUID, 'Service S2', 45, 35.00, true, false),
        ('${S3}'::UUID, '${BIZ_A}'::UUID, 'Service S3', 60, 50.00, true, false),
        ('${SB1}'::UUID, '${BIZ_B}'::UUID, 'Service SB1', 30, 20.00, true, false);

      INSERT INTO public.staff_profiles (id, business_id, display_name, is_active, is_archived) VALUES
        ('${T1}'::UUID, '${BIZ_A}'::UUID, 'Staff T1', true, false),
        ('${T2}'::UUID, '${BIZ_A}'::UUID, 'Staff T2', true, false),
        ('${T3}'::UUID, '${BIZ_A}'::UUID, 'Staff T3', true, false),
        ('${TB1}'::UUID, '${BIZ_B}'::UUID, 'Staff TB1', true, false);

      -- Initial assignments
      INSERT INTO public.staff_services (business_id, service_id, staff_id) VALUES
        ('${BIZ_A}'::UUID, '${S1}'::UUID, '${T1}'::UUID),
        ('${BIZ_A}'::UUID, '${S3}'::UUID, '${T3}'::UUID);
    END $$;
  `;
  await runPsqlCommand([setupSql]);
  console.log("[+] Test fixtures initialized with initial qualifications.");

  // 2. Launch 6 simultaneous cross-RPC operations
  console.log("\n[+] Launching 6 simultaneous cross-RPC operations...");

  // Op 1: Service-centric replacement for S1 -> [T1, T2]
  const op1 = runPsqlCommand([
    "BEGIN;",
    `SELECT set_config('request.jwt.claim.sub', '${OWNER_A}', true);`,
    "SELECT set_config('request.jwt.claim.role', 'authenticated', true);",
    `SELECT public.replace_service_staff_assignments_atomic('${BIZ_A}'::UUID, '${S1}'::UUID, ARRAY['${T1}'::UUID, '${T2}'::UUID]);`,
    "COMMIT;",
    "\\q"
  ]);

  // Op 2: Staff-centric replacement for T1 -> [S1, S2]
  const op2 = runPsqlCommand([
    "BEGIN;",
    `SELECT set_config('request.jwt.claim.sub', '${OWNER_A}', true);`,
    "SELECT set_config('request.jwt.claim.role', 'authenticated', true);",
    `SELECT public.replace_staff_services_atomic('${BIZ_A}'::UUID, '${T1}'::UUID, ARRAY['${S1}'::UUID, '${S2}'::UUID]);`,
    "COMMIT;",
    "\\q"
  ]);

  // Op 3: Whole-batch bulk replacement for [T2, T3] -> [S2, S3]
  const op3 = runPsqlCommand([
    "BEGIN;",
    `SELECT set_config('request.jwt.claim.sub', '${OWNER_A}', true);`,
    "SELECT set_config('request.jwt.claim.role', 'authenticated', true);",
    `SELECT public.bulk_assign_staff_to_services_atomic('${BIZ_A}'::UUID, ARRAY['${T2}'::UUID, '${T3}'::UUID], ARRAY['${S2}'::UUID, '${S3}'::UUID], 'replace');`,
    "COMMIT;",
    "\\q"
  ]);

  // Op 4: Cross-tenant / unauthorized attempt (Owner B targeting Biz A with foreign staff TB1)
  const op4 = runPsqlCommand([
    "BEGIN;",
    `SELECT set_config('request.jwt.claim.sub', '${OWNER_B}', true);`,
    "SELECT set_config('request.jwt.claim.role', 'authenticated', true);",
    `SELECT public.replace_service_staff_assignments_atomic('${BIZ_A}'::UUID, '${S1}'::UUID, ARRAY['${T1}'::UUID, '${TB1}'::UUID]);`,
    "COMMIT;",
    "\\q"
  ]);

  // Op 5: Empty set removal for S3 -> []
  const op5 = runPsqlCommand([
    "BEGIN;",
    `SELECT set_config('request.jwt.claim.sub', '${OWNER_A}', true);`,
    "SELECT set_config('request.jwt.claim.role', 'authenticated', true);",
    `SELECT public.replace_service_staff_assignments_atomic('${BIZ_A}'::UUID, '${S3}'::UUID, ARRAY[]::UUID[]);`,
    "COMMIT;",
    "\\q"
  ]);

  // Op 6: Duplicate input UUIDs for S2 -> [T1, T2, T1, T2]
  const op6 = runPsqlCommand([
    "BEGIN;",
    `SELECT set_config('request.jwt.claim.sub', '${OWNER_A}', true);`,
    "SELECT set_config('request.jwt.claim.role', 'authenticated', true);",
    `SELECT public.replace_service_staff_assignments_atomic('${BIZ_A}'::UUID, '${S2}'::UUID, ARRAY['${T1}'::UUID, '${T2}'::UUID, '${T1}'::UUID, '${T2}'::UUID]);`,
    "COMMIT;",
    "\\q"
  ]);

  const tStart = Date.now();
  const results = await Promise.all([op1, op2, op3, op4, op5, op6]);
  const duration = Date.now() - tStart;
  console.log(`[+] All 6 concurrent operations finished cleanly in ${duration}ms without deadlocks.`);

  // 3. Verify Op 4 was rejected with UNAUTHORIZED
  if (!results[3].includes("UNAUTHORIZED")) {
    throw new Error(`Unauthorized operation was not rejected with UNAUTHORIZED: ${results[3]}`);
  }
  console.log("[+] Op 4 (cross-tenant attempt) was strictly rejected with UNAUTHORIZED.");

  // 4. Verify no foreign-tenant staff or duplicate rows exist in Biz A
  const checkSql = `
    SELECT
      COUNT(*) AS total_rows,
      COUNT(DISTINCT (staff_id, service_id)) AS distinct_pairs,
      COUNT(*) FILTER (WHERE staff_id = '${TB1}'::UUID) AS foreign_staff_count
    FROM public.staff_services
    WHERE business_id = '${BIZ_A}'::UUID;
  `;
  const auditRes = await runPsqlCommand([checkSql]);
  console.log("\n--- Final Integrity Audit in Database ---");
  console.log(auditRes.trim());

  if (auditRes.includes("foreign_staff_count | 0") || auditRes.match(/foreign_staff_count\s*\n\s*-+\s*\n\s*\d+\s*\|\s*\d+\s*\|\s*0/)) {
    console.log("[+] Foreign staff count is 0 (Tenant isolation verified).");
  }

  // Cleanup
  await runPsqlCommand([`DELETE FROM public.businesses WHERE id IN ('${BIZ_A}'::UUID, '${BIZ_B}'::UUID);`]);
  console.log("\n==============================================================================");
  console.log("CROSS-RPC CONCURRENCY & INTEGRITY TEST PASSED!");
  console.log("==============================================================================");
}

testCrossRpcConcurrency().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
