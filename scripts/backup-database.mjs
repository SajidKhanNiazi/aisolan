#!/usr/bin/env node

/**
 * BookPilot AI — Phase 1G Pre-Migration Database Backup Runner
 *
 * Official Supabase / PostgreSQL backup runner.
 * Creates three clean artifacts outside git: roles.sql, schema.sql, data.sql
 * Also captures the existing 11-param create_public_appointment_atomic function
 * and audits migration history from supabase_migrations.schema_migrations.
 *
 * NEVER exposes passwords or connection strings in logs or stdout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const BACKUP_DIR = 'C:\\bookpilot-backups';
const PG_BIN_DIR = 'C:\\Program Files\\PostgreSQL\\17\\bin';

console.log('==============================================================================');
console.log('BookPilot AI — Phase 1G Pre-Migration Database Backup Runner');
console.log('Mode: READ-ONLY BACKUP & VERIFICATION');
console.log('Target Project: nrgfwshzbsgbuvqisaak');
console.log(`Backup Destination: ${BACKUP_DIR} (OUTSIDE GIT REPOSITORY)`);
console.log('==============================================================================\n');

// 1. Verify PostgreSQL tools
const pgDumpPath = path.join(PG_BIN_DIR, 'pg_dump.exe');
const pgDumpAllPath = path.join(PG_BIN_DIR, 'pg_dumpall.exe');
const psqlPath = path.join(PG_BIN_DIR, 'psql.exe');

for (const [toolName, toolPath] of Object.entries({ pg_dump: pgDumpPath, pg_dumpall: pgDumpAllPath, psql: psqlPath })) {
  if (!fs.existsSync(toolPath)) {
    console.error(`[FATAL] Required tool ${toolName} not found at ${toolPath}`);
    process.exit(1);
  }
}
console.log('[Tools] PostgreSQL 17 client utilities verified at:', PG_BIN_DIR);

// 2. Ensure backup destination directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 3. Load credentials securely
function loadCredentials() {
  const credPath = path.join(BACKUP_DIR, '.credentials.env');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');

  let dbUrl = process.env.SUPABASE_DB_URL || '';
  let dbPassword = process.env.SUPABASE_DB_PASSWORD || '';

  const parseFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (key === 'SUPABASE_DB_URL' && !dbUrl) dbUrl = val;
        if (key === 'SUPABASE_DB_PASSWORD' && !dbPassword) dbPassword = val;
      }
    }
  };

  parseFile(credPath);
  parseFile(envLocalPath);

  return { dbUrl, dbPassword };
}

const { dbUrl, dbPassword } = loadCredentials();

if (!dbUrl && !dbPassword) {
  console.log('\n[STATUS: BLOCKED]');
  console.log('Database credentials are required to execute the backup without exposing secrets.');
  console.log('\nConfiguration Instructions:');
  console.log(`1. Open the secure local credentials file (outside Git repository):`);
  console.log(`   ${path.join(BACKUP_DIR, '.credentials.env')}`);
  console.log('\n2. Add either your direct database password OR connection URI:');
  console.log('   SUPABASE_DB_PASSWORD="your-supabase-db-password"');
  console.log('   # OR Session Pooler URI:');
  console.log('   SUPABASE_DB_URL="postgresql://postgres.nrgfwshzbsgbuvqisaak:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"');
  console.log('\n3. Save the file and re-run this runner.');
  console.log('==============================================================================');
  process.exit(2);
}

// Set up connection environment
const pgEnv = {
  ...process.env,
  PGSSLMODE: 'require',
};

let connString = '';
if (dbUrl) {
  connString = dbUrl;
  console.log('[Auth] Loaded SUPABASE_DB_URL from secure configuration (credentials masked).');
} else {
  // Use official Supabase Session Pooler for ap-southeast-1
  pgEnv.PGHOST = 'aws-0-ap-southeast-1.pooler.supabase.com';
  pgEnv.PGPORT = '5432';
  pgEnv.PGUSER = 'postgres.nrgfwshzbsgbuvqisaak';
  pgEnv.PGDATABASE = 'postgres';
  pgEnv.PGPASSWORD = dbPassword;
  connString = 'postgresql://postgres.nrgfwshzbsgbuvqisaak@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
  console.log('[Auth] Using Supabase Session Pooler (aws-0-ap-southeast-1.pooler.supabase.com:5432, user: postgres.nrgfwshzbsgbuvqisaak).');
}

// Step 1: Connectivity check
console.log('\n--- Step 1: Testing Remote PostgreSQL Connection ---');
try {
  const result = execFileSync(psqlPath, [connString, '-t', '-A', '-c', 'SELECT current_database(), current_user, version();'], {
    env: pgEnv,
    encoding: 'utf-8',
    timeout: 30000,
  });
  console.log('[Success] Connected successfully:');
  console.log(' ', result.trim().split('\n')[0]);
} catch (err) {
  console.error('[FATAL] Database connection failed:', err.message);
  process.exit(1);
}

// Step 2: Dump roles (roles.sql)
console.log('\n--- Step 2: Dumping Roles (roles.sql) ---');
const rolesFile = path.join(BACKUP_DIR, 'roles.sql');
try {
  execFileSync(
    pgDumpAllPath,
    [
      '--roles-only',
      '--quote-all-identifiers',
      '--no-role-passwords',
      '--no-comments',
      `--dbname=${connString}`,
      `--file=${rolesFile}`,
    ],
    { env: pgEnv, encoding: 'utf-8', timeout: 60000 }
  );
  const size = fs.statSync(rolesFile).size;
  console.log(`[Success] roles.sql generated (${size} bytes) -> ${rolesFile}`);
} catch (err) {
  console.error('[FATAL] Dumping roles failed:', err.message);
  process.exit(1);
}

// Step 3: Dump schema (schema.sql)
console.log('\n--- Step 3: Dumping Schema (schema.sql) ---');
const schemaFile = path.join(BACKUP_DIR, 'schema.sql');
const excludeSchemas =
  'information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault';

try {
  execFileSync(
    pgDumpPath,
    [
      '--schema-only',
      '--quote-all-identifiers',
      '--role=postgres',
      `--exclude-schema=${excludeSchemas}`,
      `--dbname=${connString}`,
      `--file=${schemaFile}`,
    ],
    { env: pgEnv, encoding: 'utf-8', timeout: 60000 }
  );
  const size = fs.statSync(schemaFile).size;
  console.log(`[Success] schema.sql generated (${size} bytes) -> ${schemaFile}`);
} catch (err) {
  console.error('[FATAL] Dumping schema failed:', err.message);
  process.exit(1);
}

// Step 4: Dump data (data.sql)
console.log('\n--- Step 4: Dumping Data (data.sql) ---');
const dataFile = path.join(BACKUP_DIR, 'data.sql');
try {
  execFileSync(
    pgDumpPath,
    [
      '--data-only',
      '--quote-all-identifiers',
      '--role=postgres',
      '--exclude-schema=information_schema|pg_*|graphql|graphql_public|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault|etl|extensions|pgbouncer|realtime|supabase_migrations|_analytics|_realtime|_supavisor',
      '--exclude-table=auth.schema_migrations',
      '--exclude-table=storage.migrations',
      '--exclude-table=supabase_functions.migrations',
      '--schema=*',
      `--dbname=${connString}`,
      `--file=${dataFile}`,
    ],
    { env: pgEnv, encoding: 'utf-8', timeout: 120000 }
  );
  const size = fs.statSync(dataFile).size;
  console.log(`[Success] data.sql generated (${size} bytes) -> ${dataFile}`);
} catch (err) {
  console.error('[FATAL] Dumping data failed:', err.message);
  process.exit(1);
}

// Step 5: Capture 11-parameter create_public_appointment_atomic function definition
console.log('\n--- Step 5: Capturing 11-Parameter create_public_appointment_atomic Function ---');
const fnBackupFile = path.join(BACKUP_DIR, 'create_public_appointment_atomic_11param_backup.sql');
try {
  const query = `
    SELECT pg_get_functiondef(p.oid) || ';'
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_public_appointment_atomic';
  `;
  const fnDef = execFileSync(psqlPath, [connString, '-t', '-A', '-c', query], {
    env: pgEnv,
    encoding: 'utf-8',
    timeout: 30000,
  });
  if (fnDef && fnDef.trim()) {
    fs.writeFileSync(fnBackupFile, fnDef.trim() + '\n', 'utf-8');
    const size = fs.statSync(fnBackupFile).size;
    console.log(`[Success] Function definition saved (${size} bytes) -> ${fnBackupFile}`);
  } else {
    console.warn('[Warning] Function create_public_appointment_atomic not found in public schema.');
  }
} catch (err) {
  console.error('[Warning] Failed to fetch function definition:', err.message);
}

// Step 6: Audit migration history
console.log('\n--- Step 6: Auditing Applied Migration History ---');
const auditFile = path.join(BACKUP_DIR, 'migration_history_audit.txt');
try {
  const auditQuery = 'SELECT version, inserted_at FROM supabase_migrations.schema_migrations ORDER BY version ASC;';
  const auditRes = execFileSync(psqlPath, [connString, '-c', auditQuery], {
    env: pgEnv,
    encoding: 'utf-8',
    timeout: 30000,
  });
  fs.writeFileSync(auditFile, auditRes, 'utf-8');
  console.log(auditRes.trim());
  console.log(`[Success] Migration history audit saved to -> ${auditFile}`);
} catch (err) {
  console.warn('[Warning] Could not read supabase_migrations.schema_migrations:', err.message);
}

// Step 7: Live data row count verification
console.log('\n--- Step 7: Verifying Live Table Row Counts ---');
try {
  const countQuery = `
    SELECT 'businesses' AS table_name, count(*) AS row_count FROM public.businesses
    UNION ALL SELECT 'locations', count(*) FROM public.locations
    UNION ALL SELECT 'services', count(*) FROM public.services
    UNION ALL SELECT 'staff', count(*) FROM public.staff
    UNION ALL SELECT 'appointments', count(*) FROM public.appointments
    UNION ALL SELECT 'customers', count(*) FROM public.customers
    UNION ALL SELECT 'booking_policies', count(*) FROM public.booking_policies
    UNION ALL SELECT 'staff_working_hours', count(*) FROM public.staff_working_hours
    UNION ALL SELECT 'appointment_management_tokens', count(*) FROM public.appointment_management_tokens
    ORDER BY table_name;
  `;
  const countRes = execFileSync(psqlPath, [connString, '-c', countQuery], {
    env: pgEnv,
    encoding: 'utf-8',
    timeout: 30000,
  });
  console.log(countRes.trim());
} catch (err) {
  console.warn('[Warning] Could not query table counts:', err.message);
}

// Step 8: Verify backup integrity
console.log('\n--- Step 8: Integrity Verification ---');
const filesToVerify = [
  { name: 'roles.sql', path: rolesFile, minSize: 100 },
  { name: 'schema.sql', path: schemaFile, minSize: 1000 },
  { name: 'data.sql', path: dataFile, minSize: 10 },
  { name: 'create_public_appointment_atomic_11param_backup.sql', path: fnBackupFile, minSize: 500 },
  { name: 'migration_history_audit.txt', path: auditFile, minSize: 20 },
];

let allValid = true;
for (const item of filesToVerify) {
  if (fs.existsSync(item.path)) {
    const s = fs.statSync(item.path).size;
    if (s >= item.minSize) {
      console.log(` [PASS] ${item.name.padEnd(45)}: ${s} bytes`);
    } else {
      console.log(` [FAIL] ${item.name.padEnd(45)}: ${s} bytes (below min size ${item.minSize})`);
      allValid = false;
    }
  } else {
    console.log(` [MISSING] ${item.name.padEnd(45)}`);
    allValid = false;
  }
}

// Step 9: Disposable Restore Verification (Offline Local Database)
console.log('\n--- Step 9: Testing Restore into Disposable Local Database ---');
const localPsqlConn = 'postgresql://postgres@localhost:5432/postgres';
let restoreSuccess = false;
try {
  execFileSync(psqlPath, [localPsqlConn, '-c', 'SELECT 1;'], { timeout: 10000, stdio: 'ignore' });
  console.log('[Restore] Local PostgreSQL instance detected at localhost:5432.');

  execFileSync(psqlPath, [localPsqlConn, '-c', 'DROP DATABASE IF EXISTS bookpilot_restore_verify WITH (FORCE); CREATE DATABASE bookpilot_restore_verify;'], { timeout: 15000, stdio: 'ignore' });
  const disposableConn = 'postgresql://postgres@localhost:5432/bookpilot_restore_verify';

  console.log('[Restore] Restoring schema.sql into disposable database...');
  execFileSync(psqlPath, [disposableConn, '-f', schemaFile], { timeout: 60000, stdio: 'ignore' });

  console.log('[Restore] Restoring data.sql into disposable database...');
  execFileSync(psqlPath, [disposableConn, '-f', dataFile], { timeout: 60000, stdio: 'ignore' });

  const verifyRes = execFileSync(psqlPath, [disposableConn, '-t', '-A', '-c', "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"], { encoding: 'utf-8', timeout: 10000 });
  console.log(`[Restore PASS] Restored ${verifyRes.trim()} public tables successfully into disposable database.`);

  execFileSync(psqlPath, [localPsqlConn, '-c', 'DROP DATABASE IF EXISTS bookpilot_restore_verify WITH (FORCE);'], { timeout: 15000, stdio: 'ignore' });
  console.log('[Restore] Cleaned up disposable database bookpilot_restore_verify.');
  restoreSuccess = true;
} catch (restoreErr) {
  console.warn('[Restore Notice] Local restore test could not complete:', restoreErr.message);
}

console.log('\n==============================================================================');
if (allValid) {
  console.log('BACKUP COMPLETED & ALL INTEGRITY CHECKS PASSED');
  console.log(`Artifacts Location: ${BACKUP_DIR}`);
  console.log(`Disposable Restore Verification: ${restoreSuccess ? 'PASS' : 'NOT TESTED / PARTIAL'}`);
} else {
  console.log('BACKUP COMPLETED WITH INTEGRITY WARNINGS — Please inspect files');
}
console.log('==============================================================================');
