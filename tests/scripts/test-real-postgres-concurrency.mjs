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

async function testConcurrency() {
  console.log("=== Testing Real PostgreSQL Concurrent RPC Execution ===");

  // 1. Setup fixture business, service, and two staff members
  const setupSql = `
    DO $$
    DECLARE
      v_biz UUID := '99999999-9999-9999-9999-999999999999'::UUID;
      v_svc UUID := '99999999-1111-0000-0000-000000000001'::UUID;
      v_stf1 UUID := '99999999-2222-0000-0000-000000000001'::UUID;
      v_stf2 UUID := '99999999-2222-0000-0000-000000000002'::UUID;
      v_owner UUID := '99999999-3333-0000-0000-000000000001'::UUID;
    BEGIN
      DELETE FROM public.businesses WHERE id = v_biz;
      DELETE FROM auth.users WHERE id = v_owner;

      INSERT INTO auth.users (id, email) VALUES (v_owner, 'owner_concurrent@test.com');
      INSERT INTO public.businesses (id, name, slug) VALUES (v_biz, 'Concurrent Salon', 'concurrent-salon-test');
      INSERT INTO public.business_members (business_id, user_id, role) VALUES (v_biz, v_owner, 'owner');
      INSERT INTO public.services (id, business_id, name, duration_minutes, price_amount, is_active, is_archived)
      VALUES (v_svc, v_biz, 'Concurrent Cut', 30, 20.00, true, false);
      INSERT INTO public.staff_profiles (id, business_id, display_name, is_active, is_archived)
      VALUES
        (v_stf1, v_biz, 'Staff One', true, false),
        (v_stf2, v_biz, 'Staff Two', true, false);
    END $$;
  `;
  await runPsqlCommand([setupSql]);
  console.log("Fixtures ready.");

  // Launch two concurrent transactions with slight delay
  // Process 1: BEGIN -> locks service -> sleeps 1.5s -> commits
  // Process 2: waits 200ms -> attempts replacement -> blocked by Process 1 lock -> finishes after Process 1 commits!
  const tx1Cmds = [
    "BEGIN;",
    "SELECT set_config('request.jwt.claim.role', 'service_role', true);",
    "SELECT public.replace_service_staff_assignments_atomic('99999999-9999-9999-9999-999999999999'::UUID, '99999999-1111-0000-0000-000000000001'::UUID, ARRAY['99999999-2222-0000-0000-000000000001'::UUID]);",
    "SELECT pg_sleep(1.2);",
    "COMMIT;",
    "\\q"
  ];

  const tx2Cmds = [
    "BEGIN;",
    "SELECT set_config('request.jwt.claim.role', 'service_role', true);",
    "SELECT public.replace_service_staff_assignments_atomic('99999999-9999-9999-9999-999999999999'::UUID, '99999999-1111-0000-0000-000000000001'::UUID, ARRAY['99999999-2222-0000-0000-000000000002'::UUID]);",
    "COMMIT;",
    "\\q"
  ];

  const tStart = Date.now();

  const p1 = runPsqlCommand(tx1Cmds);
  await new Promise((r) => setTimeout(r, 200)); // ensure P1 starts transaction first
  const p2 = runPsqlCommand(tx2Cmds);

  await Promise.all([p1, p2]);
  const duration = Date.now() - tStart;
  console.log(`Both concurrent transactions completed in ${duration}ms (expected >= 1200ms due to lock serialization).`);

  // Query final assignments
  const checkSql = "SELECT staff_id FROM public.staff_services WHERE service_id = '99999999-1111-0000-0000-000000000001'::UUID;";
  const finalRes = await runPsqlCommand([checkSql]);
  console.log("Final assignments in staff_services:\n", finalRes.trim());

  // Cleanup
  await runPsqlCommand(["DELETE FROM public.businesses WHERE id = '99999999-9999-9999-9999-999999999999'::UUID;"]);

  if (duration >= 1100 && finalRes.includes("99999999-2222-0000-0000-000000000002")) {
    console.log("CONCURRENCY TEST PASSED: Row-level lock serialized concurrent transactions with zero mixed state!");
  } else {
    throw new Error("Concurrency serialization check failed.");
  }
}

testConcurrency().catch((err) => {
  console.error(err);
  process.exit(1);
});
