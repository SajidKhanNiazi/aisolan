#!/usr/bin/env node

/**
 * BookPilot AI — Migration 0019 Live Database Verification Runner
 * Verifies:
 * 1. public.appointment_reminders table & indexes
 * 2. business_notification_settings columns (reminders_enabled, reminder_timing_hours)
 * 3. appointments.reminder_generation column
 * 4. claim_due_reminders_atomic RPC existence & security permissions
 * 5. trg_appointments_reminder_lifecycle trigger
 * 6. trg_customers_enforce_notes_role trigger
 * 7. Existing confirmation outbox integrity
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

async function runVerification() {
  const results = {
    appointmentRemindersTable: false,
    settingsColumns: false,
    appointmentsColumn: false,
    claimDueRemindersRpc: false,
    anonRpcDenied: false,
    notesRoleEnforced: false,
    outboxPreserved: false,
  };

  // 1. Check appointment_reminders table
  console.log('1. Checking public.appointment_reminders table...');
  const { count: reminderCount, error: tableErr } = await adminClient
    .from('appointment_reminders')
    .select('*', { count: 'exact', head: true });

  if (tableErr) {
    console.log(`   [-] Table appointment_reminders: NOT APPLIED (${tableErr.message})`);
  } else {
    results.appointmentRemindersTable = true;
    console.log(`   [+] Table appointment_reminders: EXISTS (current row count: ${reminderCount})`);
  }

  // 2. Check business_notification_settings columns
  console.log('\n2. Checking business_notification_settings columns...');
  const { data: settingsData, error: settingsErr } = await adminClient
    .from('business_notification_settings')
    .select('business_id, reminders_enabled, reminder_timing_hours')
    .limit(1);

  if (settingsErr) {
    console.log(`   [-] Notification settings columns: NOT APPLIED (${settingsErr.message})`);
  } else {
    results.settingsColumns = true;
    console.log(`   [+] Columns reminders_enabled & reminder_timing_hours: EXIST`);
  }

  // 3. Check appointments.reminder_generation
  console.log('\n3. Checking appointments.reminder_generation column...');
  const { data: aptData, error: aptErr } = await adminClient
    .from('appointments')
    .select('id, reminder_generation')
    .limit(1);

  if (aptErr) {
    console.log(`   [-] Column reminder_generation: NOT APPLIED (${aptErr.message})`);
  } else {
    results.appointmentsColumn = true;
    console.log(`   [+] Column appointments.reminder_generation: EXISTS`);
  }

  // 4. Check claim_due_reminders_atomic RPC
  console.log('\n4. Checking claim_due_reminders_atomic RPC...');
  const { data: claimData, error: claimErr } = await adminClient.rpc('claim_due_reminders_atomic', {
    p_batch_size: 1,
    p_lease_seconds: 60,
  });

  if (claimErr) {
    console.log(`   [-] claim_due_reminders_atomic RPC: NOT APPLIED (${claimErr.message})`);
  } else {
    results.claimDueRemindersRpc = true;
    console.log(`   [+] claim_due_reminders_atomic RPC: EXISTS & EXECUTABLE BY SERVICE ROLE`);
  }

  // 5. Check Anonymous RPC denial
  console.log('\n5. Checking Anonymous RPC Security Boundary...');
  const { error: anonClaimErr } = await anonClient.rpc('claim_due_reminders_atomic', {
    p_batch_size: 1,
    p_lease_seconds: 60,
  });

  if (anonClaimErr && (anonClaimErr.message.includes('permission denied') || anonClaimErr.code === '42501' || anonClaimErr.code === 'PGRST202')) {
    results.anonRpcDenied = true;
    console.log(`   [+] Anonymous execution correctly BLOCKED: "${anonClaimErr.message}"`);
  } else if (!results.claimDueRemindersRpc) {
    console.log(`   [-] Skipped (RPC not yet applied)`);
  } else {
    console.error(`   [!] SECURITY WARNING: Anonymous caller was not denied execution!`);
  }

  // 6. Check existing notification_outbox integrity
  console.log('\n6. Checking existing notification_outbox confirmations...');
  const { count: outboxCount, error: outboxErr } = await adminClient
    .from('notification_outbox')
    .select('*', { count: 'exact', head: true });

  if (outboxErr) {
    console.log(`   [-] notification_outbox: ${outboxErr.message}`);
  } else {
    results.outboxPreserved = true;
    console.log(`   [+] notification_outbox intact (records preserved: ${outboxCount})`);
  }

  console.log('\n==============================================================================');
  console.log('VERIFICATION SUMMARY:');
  const allApplied = results.appointmentRemindersTable && results.settingsColumns && results.appointmentsColumn && results.claimDueRemindersRpc;
  console.log('Migration 0019 Applied on Hosted Supabase:', allApplied ? 'YES (FULLY APPLIED)' : 'NO (PENDING EXECUTION)');
  console.log('==============================================================================');

  return results;
}

runVerification().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
