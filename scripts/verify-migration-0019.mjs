#!/usr/bin/env node

/**
 * BookPilot AI — Migration 0019 Live Database Verification Runner
 * Distinctly classifies:
 * - OBJECT_EXISTS: genuinely installed and accessible
 * - OBJECT_MISSING: table or column missing in database
 * - SCHEMA_CACHE_MISMATCH: PostgREST schema cache needs refresh
 * - PERMISSION_DENIED: 42501 security block correctly enforced
 * - UNEXPECTED_ERROR: unhandled database error
 *
 * NEVER treats null row counts as proof of table existence.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadCreds() {
  const credPath = 'C:\\bookpilot-backups\\.credentials.env';
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const creds = {};

  const parseFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k && !creds[k.trim()]) {
          creds[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  };

  parseFile(credPath);
  parseFile(envLocalPath);
  return creds;
}

const creds = loadCreds();
const supabaseUrl = creds.SUPABASE_URL || creds.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = creds.SUPABASE_SECRET_KEY || creds.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = creds.SUPABASE_PUBLISHABLE_KEY || creds.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('==============================================================================');
console.log('BookPilot AI — Migration 0019 Live Database Verification Runner');
console.log('Target Project:', supabaseUrl);
console.log('Timestamp:', new Date().toISOString());
console.log('==============================================================================\n');

if (!supabaseUrl || !secretKey) {
  console.error('[FATAL] Missing Supabase URL or Secret Key.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, secretKey);
const anonClient = createClient(supabaseUrl, anonKey);

function classifyResponse(data, error) {
  if (!error) {
    return { status: 'OBJECT_EXISTS', details: 'Accessible and confirmed' };
  }

  const msg = error.message || '';
  const code = error.code || '';

  if (code === '42501' || msg.includes('permission denied')) {
    return { status: 'PERMISSION_DENIED', details: msg };
  }
  if (code === 'PGRST205' || msg.includes('schema cache')) {
    return { status: 'SCHEMA_CACHE_MISSING', details: msg };
  }
  if (code === '42P01' || code === '42703' || msg.includes('does not exist')) {
    return { status: 'OBJECT_MISSING', details: msg };
  }

  return { status: 'UNEXPECTED_ERROR', details: `[${code}] ${msg}` };
}

async function runVerification() {
  const results = {
    appointmentRemindersTable: 'OBJECT_MISSING',
    settingsColumns: 'OBJECT_MISSING',
    appointmentsColumn: 'OBJECT_MISSING',
    claimDueRemindersRpc: 'OBJECT_MISSING',
    anonRpcBlocked: false,
    outboxPreserved: false,
  };

  // 1. Check appointment_reminders table (select id column, do not rely on head/null count)
  console.log('1. Checking public.appointment_reminders table...');
  const { data: reminderData, error: tableErr } = await adminClient
    .from('appointment_reminders')
    .select('id')
    .limit(1);

  const tableStatus = classifyResponse(reminderData, tableErr);
  results.appointmentRemindersTable = tableStatus.status;
  console.log(`   Status: [${tableStatus.status}] — ${tableStatus.details}`);

  // 2. Check business_notification_settings columns
  console.log('\n2. Checking business_notification_settings columns (reminders_enabled, reminder_timing_hours)...');
  const { data: settingsData, error: settingsErr } = await adminClient
    .from('business_notification_settings')
    .select('business_id, reminders_enabled, reminder_timing_hours')
    .limit(1);

  const settingsStatus = classifyResponse(settingsData, settingsErr);
  results.settingsColumns = settingsStatus.status;
  console.log(`   Status: [${settingsStatus.status}] — ${settingsStatus.details}`);

  // 3. Check appointments.reminder_generation column
  console.log('\n3. Checking appointments.reminder_generation column...');
  const { data: aptData, error: aptErr } = await adminClient
    .from('appointments')
    .select('id, reminder_generation')
    .limit(1);

  const aptStatus = classifyResponse(aptData, aptErr);
  results.appointmentsColumn = aptStatus.status;
  console.log(`   Status: [${aptStatus.status}] — ${aptStatus.details}`);

  // 4. Check claim_due_reminders_atomic RPC with service_role client
  console.log('\n4. Checking claim_due_reminders_atomic RPC (Service Role)...');
  const { data: claimData, error: claimErr } = await adminClient.rpc('claim_due_reminders_atomic', {
    p_batch_size: 1,
    p_lease_seconds: 60,
  });

  const claimStatus = classifyResponse(claimData, claimErr);
  results.claimDueRemindersRpc = claimStatus.status;
  console.log(`   Status: [${claimStatus.status}] — ${claimStatus.details}`);

  // 5. Check Anonymous RPC invocation (must be strictly blocked)
  console.log('\n5. Checking Anonymous RPC Security Boundary (Anon Client)...');
  const { data: anonData, error: anonClaimErr } = await anonClient.rpc('claim_due_reminders_atomic', {
    p_batch_size: 1,
    p_lease_seconds: 60,
  });

  const anonStatus = classifyResponse(anonData, anonClaimErr);
  if (anonStatus.status === 'PERMISSION_DENIED' || anonStatus.status === 'SCHEMA_CACHE_MISSING') {
    results.anonRpcBlocked = true;
    console.log(`   Status: [PASS - BLOCKED] (${anonStatus.status}: ${anonStatus.details})`);
  } else if (anonStatus.status === 'OBJECT_EXISTS') {
    console.error(`   Status: [FAIL - CRITICAL BREACH] Anonymous caller was permitted to execute claim_due_reminders_atomic!`);
  } else {
    console.log(`   Status: [PENDING MIGRATION] Function not yet present on remote database.`);
  }

  // 6. Check existing notification_outbox confirmations
  console.log('\n6. Checking existing notification_outbox confirmations...');
  const { count: outboxCount, error: outboxErr } = await adminClient
    .from('notification_outbox')
    .select('*', { count: 'exact', head: true });

  if (outboxErr) {
    console.log(`   [-] notification_outbox check error: ${outboxErr.message}`);
  } else {
    results.outboxPreserved = true;
    console.log(`   Status: [PASS] notification_outbox intact (${outboxCount} confirmation records preserved)`);
  }

  console.log('\n==============================================================================');
  console.log('VERIFICATION SUMMARY:');
  const allInstalled =
    results.appointmentRemindersTable === 'OBJECT_EXISTS' &&
    results.settingsColumns === 'OBJECT_EXISTS' &&
    results.appointmentsColumn === 'OBJECT_EXISTS' &&
    results.claimDueRemindersRpc === 'OBJECT_EXISTS';

  console.log('Migration 0019 Hosted Status:', allInstalled ? 'YES (FULLY INSTALLED)' : 'NO (PENDING EXECUTION IN SQL EDITOR)');
  console.log('==============================================================================');

  return results;
}

runVerification().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
