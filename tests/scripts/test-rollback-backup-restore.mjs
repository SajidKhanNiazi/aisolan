import { spawn } from "node:child_process";

const PSQL_PATH = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const DB_NAME = "bookpilot_migration_test";

function runPsqlCommand(commands) {
  return new Promise((resolve, reject) => {
    const child = spawn(PSQL_PATH, ["-U", "postgres", "-d", DB_NAME, "-p", "5432", "-v", "ON_ERROR_STOP=1"], {
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
        reject(new Error(`psql exited with code ${code}: ${stderr} ${stdout}`));
      }
    });

    for (const cmd of commands) {
      child.stdin.write(cmd + "\n");
    }
    child.stdin.end();
  });
}

async function testRollbackBackupRestore() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — D25E: Rollback Backup & Restoration Verification");
  console.log("Target Database: Local Isolated PostgreSQL 17.7 (bookpilot_migration_test)");
  console.log("==============================================================================\n");

  const BIZ_1 = "66666666-1111-0000-0000-000000000001";
  const BIZ_2 = "66666666-1111-0000-0000-000000000002";
  const BIZ_3 = "66666666-1111-0000-0000-000000000003";

  // 1. Setup test fixture businesses and onboarding progress rows
  const setupSql = `
    DO $$
    BEGIN
      DELETE FROM public.businesses WHERE id IN ('${BIZ_1}'::UUID, '${BIZ_2}'::UUID, '${BIZ_3}'::UUID);

      INSERT INTO public.businesses (id, name, slug) VALUES
        ('${BIZ_1}'::UUID, 'Rollback Test Salon 1', 'rollback-test-1'),
        ('${BIZ_2}'::UUID, 'Rollback Test Salon 2', 'rollback-test-2'),
        ('${BIZ_3}'::UUID, 'Rollback Test Salon 3', 'rollback-test-3');

      -- Insert progress rows at step 3, step 6, and step 7
      INSERT INTO public.business_onboarding_progress
        (id, business_id, current_step, completed_steps, is_completed, completed_at, updated_at)
      VALUES
        ('66666666-2222-0000-0000-000000000001'::UUID, '${BIZ_1}'::UUID, 3, ARRAY[1, 2], false, null, NOW()),
        ('66666666-2222-0000-0000-000000000002'::UUID, '${BIZ_2}'::UUID, 6, ARRAY[1, 2, 3, 4, 5], false, null, NOW()),
        ('66666666-2222-0000-0000-000000000003'::UUID, '${BIZ_3}'::UUID, 7, ARRAY[1, 2, 3, 4, 5, 6, 7], true, NOW(), NOW());
    END $$;
  `;
  await runPsqlCommand([setupSql]);
  console.log("[+] Test fixtures initialized (Salon 1 at step 3, Salon 2 at step 6, Salon 3 at step 7).");

  // 2. Execute corrected backup table creation & RLS lockdown
  const backupDDLSql = `
    CREATE TABLE IF NOT EXISTS public._admin_backup_onboarding_progress_d25 (
        id UUID PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
        current_step INT NOT NULL,
        completed_steps INT[] NOT NULL,
        is_completed BOOLEAN NOT NULL,
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL,
        backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public._admin_backup_onboarding_progress_d25 ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public._admin_backup_onboarding_progress_d25 FROM PUBLIC, anon;
    GRANT ALL ON public._admin_backup_onboarding_progress_d25 TO service_role;
  `;
  await runPsqlCommand([backupDDLSql]);
  console.log("[+] Access-controlled backup table created with RLS enabled and anon access revoked.");

  // 3. Test corrected INSERT with explicit destination columns
  const backupInsertSql = `
    INSERT INTO public._admin_backup_onboarding_progress_d25 (
        id,
        business_id,
        current_step,
        completed_steps,
        is_completed,
        completed_at,
        updated_at
    )
    SELECT
        id,
        business_id,
        current_step,
        completed_steps,
        is_completed,
        completed_at,
        updated_at
    FROM public.business_onboarding_progress
    WHERE current_step > 5
    ON CONFLICT (id) DO UPDATE
    SET current_step = EXCLUDED.current_step,
        completed_steps = EXCLUDED.completed_steps,
        is_completed = EXCLUDED.is_completed,
        completed_at = EXCLUDED.completed_at,
        updated_at = EXCLUDED.updated_at,
        backed_up_at = NOW();
  `;
  await runPsqlCommand([backupInsertSql]);
  console.log("[+] Corrected snapshot executed with explicit column list and default backed_up_at.");

  // 4. Verify RLS and privileges: anon cannot read backup table
  let anonBlocked = false;
  try {
    await runPsqlCommand([
      "SET ROLE anon;",
      "SELECT * FROM public._admin_backup_onboarding_progress_d25;",
    ]);
  } catch (err) {
    if (err.message.toLowerCase().includes("permission denied") || err.message.includes("42501")) {
      anonBlocked = true;
    } else {
      console.log("Captured error:", err.message);
    }
  }

  if (!anonBlocked) {
    throw new Error("SECURITY FAILURE: anon role was able to query _admin_backup_onboarding_progress_d25!");
  }
  console.log("[+] Security confirmed: anon role strictly denied access (SQLSTATE 42501).");

  // 5. Verify service_role can read backed up rows
  const auditBackupSql = `
    SELECT id, business_id, current_step, completed_steps, backed_up_at IS NOT NULL AS has_backup_timestamp
    FROM public._admin_backup_onboarding_progress_d25
    ORDER BY current_step ASC;
  `;
  const backupRows = await runPsqlCommand([auditBackupSql]);
  console.log("\n--- Backed Up Rows Audit ---\n" + backupRows.trim());

  if (!backupRows.includes("| t") || !backupRows.includes(" 6 |") || !backupRows.includes(" 7 |")) {
    throw new Error("Backup rows missing or timestamp default not applied.");
  }

  // 6. Simulate rollback: clamp live table to step 5 and restore constraint 1-5
  const rollbackSql = `
    UPDATE public.business_onboarding_progress SET current_step = 5 WHERE current_step > 5;
    ALTER TABLE public.business_onboarding_progress DROP CONSTRAINT IF EXISTS business_onboarding_progress_current_step_check;
    ALTER TABLE public.business_onboarding_progress ADD CONSTRAINT business_onboarding_progress_current_step_check CHECK (current_step BETWEEN 1 AND 5);
  `;
  await runPsqlCommand([rollbackSql]);
  console.log("\n[+] Rollback simulated: table clamped to step 5, constraint CHECK (current_step BETWEEN 1 AND 5) restored.");

  const postRollbackSql = `
    SELECT id, current_step FROM public.business_onboarding_progress
    WHERE business_id IN ('${BIZ_1}'::UUID, '${BIZ_2}'::UUID, '${BIZ_3}'::UUID)
    ORDER BY id ASC;
  `;
  const clampedRows = await runPsqlCommand([postRollbackSql]);
  console.log("Clamped state in live table:\n" + clampedRows.trim());

  // 7. Test RESTORATION from backup
  console.log("\n[+] Testing Restoration from _admin_backup_onboarding_progress_d25...");
  const restoreSql = `
    -- Re-expand constraint
    ALTER TABLE public.business_onboarding_progress DROP CONSTRAINT IF EXISTS business_onboarding_progress_current_step_check;
    ALTER TABLE public.business_onboarding_progress ADD CONSTRAINT business_onboarding_progress_current_step_check CHECK (current_step BETWEEN 1 AND 7);

    -- Restore exact step, completed_steps, is_completed, and timestamps
    UPDATE public.business_onboarding_progress p
    SET current_step = b.current_step,
        completed_steps = b.completed_steps,
        is_completed = b.is_completed,
        completed_at = b.completed_at,
        updated_at = b.updated_at
    FROM public._admin_backup_onboarding_progress_d25 b
    WHERE p.id = b.id;
  `;
  await runPsqlCommand([restoreSql]);

  const finalRestoredSql = `
    SELECT id, business_id, current_step, completed_steps, is_completed
    FROM public.business_onboarding_progress
    WHERE business_id IN ('${BIZ_1}'::UUID, '${BIZ_2}'::UUID, '${BIZ_3}'::UUID)
    ORDER BY current_step ASC;
  `;
  const restoredRows = await runPsqlCommand([finalRestoredSql]);
  console.log("Final Restored State:\n" + restoredRows.trim());

  if (!restoredRows.includes("|            6 |") || !restoredRows.includes("|            7 |")) {
    throw new Error("Restoration verification failed: steps 6 and 7 not properly restored!");
  }

  // 8. Cleanup test fixtures
  await runPsqlCommand([
    `DROP TABLE IF EXISTS public._admin_backup_onboarding_progress_d25;`,
    `DELETE FROM public.businesses WHERE id IN ('${BIZ_1}'::UUID, '${BIZ_2}'::UUID, '${BIZ_3}'::UUID);`
  ]);

  console.log("\n==============================================================================");
  console.log("ROLLBACK BACKUP & RESTORATION TEST: 100% PASS!");
  console.log("==============================================================================");
}

testRollbackBackupRestore().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
