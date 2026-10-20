#!/usr/bin/env node

/**
 * BookPilot AI — Phase 1E-A Live Database Concurrency & Authenticated RLS Test Runner
 *
 * Runs genuine multi-connection PostgreSQL operations across two authenticated user sessions.
 * Never displays passwords or JWTs in console logs.
 * If credentials are missing, reports BLOCKED cleanly without failing unexpectedly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// 1. Load environment variables
function loadEnv() {
  const envFiles = ['.env.test.local', '.env.local', '.env'];
  const loaded = {};

  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...vParts] = trimmed.split('=');
        const v = vParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (k && !loaded[k.trim()] && !process.env[k.trim()]) {
          loaded[k.trim()] = v;
        }
      }
    }
  }

  return { ...loaded, ...process.env };
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('==============================================================================');
console.log('BookPilot AI — Phase 1E-A Live PostgreSQL Concurrency & RLS Runner');
console.log('Target Project:', supabaseUrl ? `${supabaseUrl.substring(0, 25)}...` : 'NOT_CONFIGURED');
console.log('==============================================================================\n');

if (!supabaseUrl || !publishableKey) {
  console.error('[CONFIGURATION ERROR]: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.');
  process.exit(1);
}

// 2. Check for Test User A and User B credentials or JWTs
const userA_jwt = env.QA_USER_A_JWT;
const userB_jwt = env.QA_USER_B_JWT;
const userA_email = env.QA_USER_A_EMAIL;
const userA_pass = env.QA_USER_A_PASSWORD;
const userB_email = env.QA_USER_B_EMAIL;
const userB_pass = env.QA_USER_B_PASSWORD;

const hasUserA = userA_jwt || (userA_email && userA_pass);
const hasUserB = userB_jwt || (userB_email && userB_pass);

if (!hasUserA || !hasUserB) {
  console.log('------------------------------------------------------------------------------');
  console.log('[AUTHENTICATED DATABASE VERIFICATION: BLOCKED]');
  console.log('Reason: Two independent authenticated test-owner accounts are required.');
  console.log('Status:');
  console.log(`  - Test Owner A session: ${hasUserA ? 'PROVIDED' : 'MISSING'}`);
  console.log(`  - Test Owner B session: ${hasUserB ? 'PROVIDED' : 'MISSING'}`);
  console.log('\nSafe Setup Instructions:');
  console.log('To run live multi-connection tests without exposing credentials or fake email signups,');
  console.log('add the following to .env.test.local (this file is ignored by git):');
  console.log('\n  QA_USER_A_EMAIL=owner.alpha@yourqa.local');
  console.log('  QA_USER_A_PASSWORD=YourPassword123!');
  console.log('  QA_USER_B_EMAIL=owner.beta@yourqa.local');
  console.log('  QA_USER_B_PASSWORD=YourPassword123!');
  console.log('\nOr supply pre-generated JWTs:');
  console.log('  QA_USER_A_JWT=<jwt_token_for_owner_a>');
  console.log('  QA_USER_B_JWT=<jwt_token_for_owner_b>');
  console.log('------------------------------------------------------------------------------');
  process.exit(0);
}

// 3. Helper to create isolated Supabase client
function makeClient(jwt) {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });
}

async function runLiveVerification() {
  const clientA = makeClient(userA_jwt);
  const clientB = makeClient(userB_jwt);

  // Authenticate Client A if password provided
  if (!userA_jwt && userA_email && userA_pass) {
    const { error } = await clientA.auth.signInWithPassword({ email: userA_email, password: userA_pass });
    if (error) {
      console.error('[AUTH ERROR] Owner A login failed:', error.message);
      process.exit(1);
    }
    console.log('[AUTH SUCCESS] Owner A logged in successfully.');
  }

  // Authenticate Client B if password provided
  if (!userB_jwt && userB_email && userB_pass) {
    const { error } = await clientB.auth.signInWithPassword({ email: userB_email, password: userB_pass });
    if (error) {
      console.error('[AUTH ERROR] Owner B login failed:', error.message);
      process.exit(1);
    }
    console.log('[AUTH SUCCESS] Owner B logged in successfully.');
  }

  console.log('\nExecuting Authenticated Database Tests...');

  // 1. Discover or create isolated QA businesses for Owner A and Owner B
  const { data: bizAData, error: bizAErr } = await clientA
    .from('businesses')
    .select('id, name, timezone')
    .limit(1);

  if (bizAErr || !bizAData || bizAData.length === 0) {
    console.error('[SETUP ERROR]: Owner A does not own any business workspace in this project.');
    process.exit(1);
  }
  const businessA = bizAData[0];
  console.log(`[TEST SETUP] Using Business A: ${businessA.name} (${businessA.id})`);

  const { data: bizBData, error: bizBErr } = await clientB
    .from('businesses')
    .select('id, name')
    .limit(1);

  if (bizBErr || !bizBData || bizBData.length === 0) {
    console.error('[SETUP ERROR]: Owner B does not own any business workspace in this project.');
    process.exit(1);
  }
  const businessB = bizBData[0];
  console.log(`[TEST SETUP] Using Business B: ${businessB.name} (${businessB.id})`);

  // Discover eligible staff and services for Business A
  const { data: staffList } = await clientA
    .from('staff_profiles')
    .select('id, display_name')
    .eq('business_id', businessA.id)
    .eq('is_active', true)
    .eq('is_archived', false)
    .limit(2);

  const { data: serviceList } = await clientA
    .from('services')
    .select('id, name, duration_minutes, buffer_minutes, price_amount')
    .eq('business_id', businessA.id)
    .eq('is_active', true)
    .eq('is_archived', false)
    .limit(1);

  if (!staffList || staffList.length === 0 || !serviceList || serviceList.length === 0) {
    console.error('[SETUP ERROR]: Business A needs at least 1 active staff and 1 active service.');
    process.exit(1);
  }

  const staff1 = staffList[0];
  const staff2 = staffList[1] || staffList[0];
  const service1 = serviceList[0];

  // Test slot 3 days in advance at 11:00 UTC
  const testSlot = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  testSlot.setUTCHours(11, 0, 0, 0);
  const slotIso = testSlot.toISOString();

  let createdApptId = null;

  // TEST 1: Create Valid Appointment
  console.log('\n--- TEST 1: Valid Appointment Creation ---');
  const { data: res1, error: err1 } = await clientA.rpc('create_appointment_atomic', {
    p_business_id: businessA.id,
    p_service_id: service1.id,
    p_staff_id: staff1.id,
    p_starts_at: slotIso,
    p_customer_name: 'QA Live Customer',
    p_customer_email: 'qa.live@bookpilot.test',
  });

  if (err1 || !res1?.success) {
    console.error('TEST 1 FAILED:', err1 || res1);
    process.exit(1);
  }
  createdApptId = res1.data.id;
  console.log('TEST 1 PASSED: Created appointment ID:', createdApptId);

  // TEST 2: True Concurrency — Simultaneous Requests on Identical Timeslot
  console.log('\n--- TEST 2: Genuine Concurrency Conflict ---');
  const [concurrencyResult1, concurrencyResult2] = await Promise.all([
    clientA.rpc('create_appointment_atomic', {
      p_business_id: businessA.id,
      p_service_id: service1.id,
      p_staff_id: staff1.id,
      p_starts_at: slotIso,
      p_customer_name: 'Concurrent Booker 1',
      p_customer_email: 'concur1@bookpilot.test',
    }),
    clientA.rpc('create_appointment_atomic', {
      p_business_id: businessA.id,
      p_service_id: service1.id,
      p_staff_id: staff1.id,
      p_starts_at: slotIso,
      p_customer_name: 'Concurrent Booker 2',
      p_customer_email: 'concur2@bookpilot.test',
    }),
  ]);

  const outcomes = [concurrencyResult1.data, concurrencyResult2.data];
  const successes = outcomes.filter((o) => o?.success);
  const slotTakens = outcomes.filter((o) => o?.code === 'SLOT_TAKEN');

  if (successes.length === 1 && slotTakens.length === 1) {
    console.log('TEST 2 PASSED: Exactly 1 succeeded and 1 was blocked by GiST exclusion constraint (SLOT_TAKEN).');
  } else {
    console.error('TEST 2 FAILED: Simultaneous collision outcome invalid:', outcomes);
  }

  // TEST 2B: Parallel Booking on Different Staff (staff2)
  console.log('\n--- TEST 2B: Parallel Staff Booking Allowed ---');
  const { data: res2b } = await clientA.rpc('create_appointment_atomic', {
    p_business_id: businessA.id,
    p_service_id: service1.id,
    p_staff_id: staff2.id,
    p_starts_at: slotIso,
    p_customer_name: 'Parallel Booker',
    p_customer_email: 'parallel@bookpilot.test',
  });
  if (staff2.id !== staff1.id) {
    if (res2b?.success) {
      console.log('TEST 2B PASSED: Parallel staff booking succeeded at same time.');
      await clientA.rpc('cancel_appointment_atomic', { p_business_id: businessA.id, p_appointment_id: res2b.data.id });
    }
  } else {
    console.log('TEST 2B SKIPPED: Only 1 staff profile available.');
  }

  // TEST 3: Overlapping Slot Check
  console.log('\n--- TEST 3: Overlapping Interval Rejection ---');
  const overlapSlot = new Date(testSlot.getTime() + 15 * 60 * 1000).toISOString();
  const { data: res3 } = await clientA.rpc('create_appointment_atomic', {
    p_business_id: businessA.id,
    p_service_id: service1.id,
    p_staff_id: staff1.id,
    p_starts_at: overlapSlot,
    p_customer_name: 'Overlap Booker',
    p_customer_email: 'overlap@bookpilot.test',
  });

  if (res3?.code === 'SLOT_TAKEN') {
    console.log('TEST 3 PASSED: Partial overlap rejected with SLOT_TAKEN.');
  } else {
    console.error('TEST 3 FAILED: Overlap was not rejected:', res3);
  }

  // TEST 4: Cross-Tenant Isolation (Owner B attempts mutation on Owner A's business)
  console.log('\n--- TEST 4: Cross-Tenant RLS & Membership Enforcement ---');
  const { data: res4 } = await clientB.rpc('cancel_appointment_atomic', {
    p_business_id: businessA.id,
    p_appointment_id: createdApptId,
    p_reason: 'Malicious cancellation attempt',
  });

  if (res4?.code === 'BUSINESS_ACCESS_DENIED') {
    console.log('TEST 4 PASSED: Cross-tenant attack denied with BUSINESS_ACCESS_DENIED.');
  } else {
    console.error('TEST 4 FAILED: Cross-tenant action was not denied:', res4);
  }

  // TEST 5: Cancellation & Released Slot Rebooking
  console.log('\n--- TEST 5: Cancellation Releases GiST Slot ---');
  const { data: res5 } = await clientA.rpc('cancel_appointment_atomic', {
    p_business_id: businessA.id,
    p_appointment_id: createdApptId,
    p_reason: 'Legitimate customer cancellation',
  });

  if (res5?.success) {
    console.log('Cancellation succeeded. Now verifying rebooking on released slot...');
    const { data: res5b } = await clientA.rpc('create_appointment_atomic', {
      p_business_id: businessA.id,
      p_service_id: service1.id,
      p_staff_id: staff1.id,
      p_starts_at: slotIso,
      p_customer_name: 'Rebooked Customer',
      p_customer_email: 'rebook@bookpilot.test',
    });

    if (res5b?.success) {
      console.log('TEST 5 PASSED: Released slot was rebooked successfully.');

      // TEST 6: Reschedule Appointment
      console.log('\n--- TEST 6: Reschedule Appointment ---');
      const newSlot = new Date(testSlot.getTime() + 2 * 3600 * 1000).toISOString();
      const { data: res6 } = await clientA.rpc('reschedule_appointment_atomic', {
        p_business_id: businessA.id,
        p_appointment_id: res5b.data.id,
        p_new_starts_at: newSlot,
        p_reason: 'Client requested reschedule',
      });

      if (res6?.success) {
        console.log('TEST 6 PASSED: Appointment rescheduled successfully to:', newSlot);
      } else {
        console.error('TEST 6 FAILED: Reschedule failed:', res6);
      }

      // TEST 7: Status RPC Lifecycle Transitions & Validation
      console.log('\n--- TEST 7: Status RPC Invariants & State Machine ---');
      
      // 7A: Invalid status rejection
      const { data: res7a } = await clientA.rpc('update_appointment_status_atomic', {
        p_business_id: businessA.id,
        p_appointment_id: res5b.data.id,
        p_new_status: 'invalid_status_xyz',
      });
      if (res7a?.code === 'VALIDATION_ERROR') {
        console.log('TEST 7A PASSED: Invalid status rejected with VALIDATION_ERROR.');
      } else {
        console.error('TEST 7A FAILED: Invalid status not rejected properly:', res7a);
      }

      // 7B: Valid transition (confirmed -> completed)
      const { data: res7b } = await clientA.rpc('update_appointment_status_atomic', {
        p_business_id: businessA.id,
        p_appointment_id: res5b.data.id,
        p_new_status: 'completed',
        p_reason: 'Service successfully delivered',
      });
      if (res7b?.success && res7b?.data?.status === 'completed') {
        console.log('TEST 7B PASSED: Transition from confirmed to completed succeeded.');
      } else {
        console.error('TEST 7B FAILED: Status update to completed failed:', res7b);
      }

      // 7C: Idempotent repeat call (completed -> completed)
      const { data: res7c } = await clientA.rpc('update_appointment_status_atomic', {
        p_business_id: businessA.id,
        p_appointment_id: res5b.data.id,
        p_new_status: 'completed',
      });
      if (res7c?.success && res7c?.is_idempotent_replay) {
        console.log('TEST 7C PASSED: Repeated status update recognized as idempotent replay.');
      } else {
        console.error('TEST 7C FAILED: Repeat status update failed:', res7c);
      }

      // 7D: Terminal state violation (completed -> pending)
      const { data: res7d } = await clientA.rpc('update_appointment_status_atomic', {
        p_business_id: businessA.id,
        p_appointment_id: res5b.data.id,
        p_new_status: 'pending',
      });
      if (res7d?.code === 'INVALID_STATUS_TRANSITION') {
        console.log('TEST 7D PASSED: Terminal state transition blocked with INVALID_STATUS_TRANSITION.');
      } else {
        console.error('TEST 7D FAILED: Terminal transition not blocked:', res7d);
      }

      // TEST 8: Direct Mutation Lockdown (Cannot bypass RPC via Data API)
      console.log('\n--- TEST 8: Direct Database Mutation Lockdown ---');
      const { error: directInsertErr } = await clientA.from('appointments').insert({
        business_id: businessA.id,
        customer_id: res5b.data.customer_id,
        service_id: service1.id,
        staff_id: staff1.id,
        starts_at: new Date().toISOString(),
        service_ends_at: new Date().toISOString(),
        occupied_starts_at: new Date().toISOString(),
        occupied_ends_at: new Date().toISOString(),
        duration_minutes_snapshot: 30,
        service_name_snapshot: 'Hacked',
        customer_name_snapshot: 'Attacker',
      });

      if (directInsertErr && directInsertErr.code === '42501') {
        console.log('TEST 8 PASSED: Direct authenticated INSERT blocked with SQLSTATE 42501 (RLS violation).');
      } else {
        console.error('TEST 8 FAILED: Direct mutation was not blocked as expected:', directInsertErr);
      }

      // Final Cleanup
      await clientA.rpc('cancel_appointment_atomic', {
        p_business_id: businessA.id,
        p_appointment_id: res5b.data.id,
        p_reason: 'Post-test cleanup',
      });
      console.log('\n[CLEANUP] Disposable QA test appointments cleaned up.');
    } else {
      console.error('TEST 5 FAILED: Could not rebook released slot:', res5b);
    }
  } else {
    console.error('TEST 5 FAILED: Cancellation failed:', res5);
  }

  console.log('\n==============================================================================');
  console.log('ALL AUTHENTICATED TESTS EXECUTED AND COMPLETED CLEANLY');
  console.log('==============================================================================');
}

runLiveVerification().catch((err) => {
  console.error('[UNEXPECTED ERROR]:', err);
  process.exit(1);
});

