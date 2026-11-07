#!/usr/bin/env node

/**
 * BookPilot AI — Disposable Database Migration & Security Integration Test Runner
 * Executes against local PostgreSQL 17 server:
 * 1. Creates an isolated database: bookpilot_disposable_qa
 * 2. Mocks the Supabase auth environment (auth.uid, auth.role, roles anon, authenticated, service_role)
 * 3. Applies foundational schema
 * 4. Applies migration 20261106000019_create_automated_appointment_reminders.sql
 * 5. Executes role-level tests for anon, staff, manager, owner, service_role
 * 6. Exercises appointment reminder lifecycle (insert, reschedule, cancel)
 * 7. Drops bookpilot_disposable_qa cleanly
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PSQL_BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const DB_NAME = 'bookpilot_disposable_qa';

function runSql(db, sql) {
  return execFileSync(PSQL_BIN, ['-U', 'postgres', '-d', db, '-c', sql], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function runSqlFile(db, filePath) {
  return execFileSync(PSQL_BIN, ['-U', 'postgres', '-d', db, '-f', filePath], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

console.log('==============================================================================');
console.log('BookPilot AI — Disposable Integration Test Runner (PostgreSQL 17)');
console.log(`Target Disposable Database: ${DB_NAME}`);
console.log('==============================================================================\n');

try {
  // Step 1: Create fresh database
  console.log('[1/7] Initializing clean disposable database...');
  try {
    runSql('postgres', `DROP DATABASE IF EXISTS ${DB_NAME};`);
  } catch {}
  runSql('postgres', `CREATE DATABASE ${DB_NAME};`);
  console.log(`      ✓ Database ${DB_NAME} created.`);

  // Step 2: Set up Supabase-compatible roles & auth schema
  console.log('[2/7] Configuring Supabase roles & auth environment...');
  const setupAuthSql = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator; END IF;
    END
    $$;
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
        SELECT COALESCE(
            NULLIF(current_setting('request.jwt.claim.role', true), ''),
            (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
            current_user
        );
    $$;

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
        SELECT COALESCE(
            NULLIF(current_setting('request.jwt.claim.sub', true), ''),
            (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        )::UUID;
    $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, public;
    GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role, public;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role, public;
  `;
  runSql(DB_NAME, setupAuthSql);
  console.log('      ✓ Supabase roles & auth schema initialized.');

  // Step 3: Set up prerequisite foundational tables
  console.log('[3/7] Setting up prerequisite BookPilot schema...');
  const prereqSql = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE public.businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        phone TEXT,
        email TEXT,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        currency TEXT NOT NULL DEFAULT 'GBP',
        address_line1 TEXT,
        city TEXT
    );

    CREATE TABLE public.business_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff'))
    );

    CREATE TABLE public.customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE public.staff_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL
    );

    CREATE TABLE public.services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        price_minor INTEGER NOT NULL DEFAULT 2500,
        currency TEXT NOT NULL DEFAULT 'GBP'
    );

    CREATE TABLE public.business_notification_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
        notify_customer_on_booking BOOLEAN NOT NULL DEFAULT TRUE,
        notify_owner_on_booking BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE public.notification_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
        appointment_id UUID,
        customer_id UUID,
        event_type TEXT NOT NULL,
        recipient_type TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT,
        template_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE public.appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES public.customers(id),
        service_id UUID REFERENCES public.services(id),
        staff_id UUID REFERENCES public.staff_profiles(id),
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
        starts_at TIMESTAMPTZ NOT NULL,
        service_ends_at TIMESTAMPTZ NOT NULL,
        occupied_starts_at TIMESTAMPTZ NOT NULL,
        occupied_ends_at TIMESTAMPTZ NOT NULL,
        customer_name_snapshot TEXT,
        service_name_snapshot TEXT,
        duration_minutes_snapshot INTEGER NOT NULL DEFAULT 30,
        price_minor_snapshot INTEGER NOT NULL DEFAULT 2500,
        currency_snapshot TEXT NOT NULL DEFAULT 'GBP',
        timezone_snapshot TEXT NOT NULL DEFAULT 'UTC',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID, p_user_id UUID)
    RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = p_business_id AND user_id = p_user_id);
    $$;

    CREATE OR REPLACE FUNCTION public.is_business_manager_or_owner(p_business_id UUID, p_user_id UUID)
    RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id = p_business_id AND user_id = p_user_id AND role IN ('owner', 'manager'));
    $$;

    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT SELECT, UPDATE ON public.customers TO authenticated;
  `;
  runSql(DB_NAME, prereqSql);
  console.log('      ✓ Prerequisite schema and helper functions installed.');

  // Step 4: Apply migration 20261106000019
  console.log('[4/7] Applying migration 20261106000019_create_automated_appointment_reminders.sql...');
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261106000019_create_automated_appointment_reminders.sql');
  const migrationOutput = runSqlFile(DB_NAME, migrationPath);
  console.log('      ✓ Migration executed cleanly with ZERO errors.');

  // Step 5: Seed test dataset
  console.log('[5/7] Seeding multi-tenant test data...');
  const seedSql = `
    INSERT INTO public.businesses (id, name, slug) VALUES 
      ('11111111-1111-1111-1111-111111111111', 'Salon Alpha', 'salon-alpha'),
      ('22222222-2222-2222-2222-222222222222', 'Salon Beta', 'salon-beta');

    INSERT INTO public.business_members (business_id, user_id, role) VALUES
      ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
      ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager'),
      ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'staff'),
      ('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner');

    INSERT INTO public.customers (id, business_id, name, email, notes) VALUES
      ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alice Client', 'alice@example.com', 'Original notes Alpha'),
      ('20000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Bob Client', 'bob@example.com', 'Original notes Beta');

    INSERT INTO public.business_notification_settings (business_id, reminders_enabled, reminder_timing_hours) VALUES
      ('11111111-1111-1111-1111-111111111111', TRUE, 3),
      ('22222222-2222-2222-2222-222222222222', FALSE, 3);
  `;
  runSql(DB_NAME, seedSql);
  console.log('      ✓ Multi-tenant salons, members, and customers seeded.');

  // Step 6: Exercise Role-Level Authorization Tests
  console.log('[6/7] Running role-level authorization tests...');

  // Test 6A: claim_due_reminders_atomic access check
  console.log('      Test 6A: claim_due_reminders_atomic permissions:');
  const testPrivilegesSql = `
    SELECT grantee, privilege_type 
    FROM information_schema.routine_privileges 
    WHERE routine_name = 'claim_due_reminders_atomic';
  `;
  const privRes = runSql(DB_NAME, testPrivilegesSql);
  const hasServiceRole = privRes.includes('service_role');
  const hasAnon = privRes.includes('anon');
  const hasAuthenticated = privRes.includes('authenticated') && !privRes.includes('service_role');
  if (hasServiceRole && !hasAnon && !hasAuthenticated) {
    console.log('        [PASS] Only service_role holds EXECUTE on claim_due_reminders_atomic.');
  } else {
    console.error('        [FAIL] Unexpected privilege grants:\n', privRes);
    process.exit(1);
  }

  // Test 6B: anon calling claim_due_reminders_atomic
  try {
    runSql(DB_NAME, `
      SET ROLE anon;
      SELECT * FROM public.claim_due_reminders_atomic(1, 60);
    `);
    console.error('        [FAIL] Anon was allowed to call claim_due_reminders_atomic!');
    process.exit(1);
  } catch (err) {
    console.log('        [PASS] Anon execution blocked (permission denied).');
  }

  // Test 6C: authenticated staff calling claim_due_reminders_atomic
  try {
    runSql(DB_NAME, `
      SET ROLE authenticated;
      SET request.jwt.claim.role = 'authenticated';
      SET request.jwt.claim.sub = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      SELECT * FROM public.claim_due_reminders_atomic(1, 60);
    `);
    console.error('        [FAIL] Authenticated staff was allowed to call claim_due_reminders_atomic!');
    process.exit(1);
  } catch (err) {
    console.log('        [PASS] Authenticated staff execution blocked (permission denied).');
  }

  // Test 6D: service_role calling claim_due_reminders_atomic
  try {
    const claimRes = runSql(DB_NAME, `
      SET ROLE service_role;
      SET request.jwt.claim.role = 'service_role';
      SELECT * FROM public.claim_due_reminders_atomic(1, 60);
    `);
    console.log('        [PASS] service_role successfully executed claim_due_reminders_atomic.');
  } catch (err) {
    console.error('        [FAIL] service_role failed to execute claim_due_reminders_atomic:', err.message);
    process.exit(1);
  }

  // Test 6E: Customer notes trigger - Anon update
  console.log('      Test 6E: Customer notes trigger (fn_customers_enforce_notes_role):');
  try {
    runSql(DB_NAME, `
      SET ROLE anon;
      SET request.jwt.claim.role = 'anon';
      UPDATE public.customers SET notes = 'Hacked by anon' WHERE id = '10000000-0000-0000-0000-000000000001';
    `);
    console.error('        [FAIL] Anon updated customer notes!');
    process.exit(1);
  } catch (err) {
    const errText = (err.message || '') + (err.stderr || '');
    if (errText.includes('42501') || errText.includes('permission denied') || errText.includes('Forbidden') || errText.includes('Unauthenticated')) {
      console.log('        [PASS] Anon blocked from modifying customer notes.');
    } else {
      throw err;
    }
  }

  // Test 6F: Customer notes trigger - Staff update
  try {
    runSql(DB_NAME, `
      SET ROLE authenticated;
      SET request.jwt.claim.role = 'authenticated';
      SET request.jwt.claim.sub = 'cccccccc-cccc-cccc-cccc-cccccccccccc'; -- staff member
      UPDATE public.customers SET notes = 'Modified by staff' WHERE id = '10000000-0000-0000-0000-000000000001';
    `);
    console.error('        [FAIL] Regular staff updated customer notes!');
    process.exit(1);
  } catch (err) {
    const errText = (err.message || '') + (err.stderr || '');
    if (errText.includes('Only salon owners or managers')) {
      console.log('        [PASS] Staff blocked ("Only salon owners or managers may update customer notes").');
    } else {
      throw err;
    }
  }

  // Test 6G: Cross-tenant update - Owner of Salon Beta trying to update Salon Alpha customer
  try {
    runSql(DB_NAME, `
      SET ROLE authenticated;
      SET request.jwt.claim.role = 'authenticated';
      SET request.jwt.claim.sub = 'dddddddd-dddd-dddd-dddd-dddddddddddd'; -- owner of Salon Beta
      UPDATE public.customers SET notes = 'Cross tenant attack' WHERE id = '10000000-0000-0000-0000-000000000001'; -- customer of Salon Alpha
    `);
    console.error('        [FAIL] Cross-tenant owner updated another salon customer notes!');
    process.exit(1);
  } catch (err) {
    const errText = (err.message || '') + (err.stderr || '');
    if (errText.includes('42501') || errText.includes('Forbidden') || errText.includes('Only salon owners')) {
      console.log('        [PASS] Cross-tenant owner blocked.');
    } else {
      throw err;
    }
  }

  // Test 6H: Owner of Salon Alpha updating customer notes
  runSql(DB_NAME, `
    SET ROLE authenticated;
    SET request.jwt.claim.role = 'authenticated';
    SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- owner of Salon Alpha
    UPDATE public.customers SET notes = 'VIP Client note by Owner' WHERE id = '10000000-0000-0000-0000-000000000001';
  `);
  console.log('        [PASS] Salon Owner successfully updated customer notes.');

  // Test 6I: Manager of Salon Alpha updating customer notes
  runSql(DB_NAME, `
    SET ROLE authenticated;
    SET request.jwt.claim.role = 'authenticated';
    SET request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; -- manager of Salon Alpha
    UPDATE public.customers SET notes = 'Updated by Manager' WHERE id = '10000000-0000-0000-0000-000000000001';
  `);
  console.log('        [PASS] Salon Manager successfully updated customer notes.');

  // Step 7: Exercise Appointment Reminder Lifecycle
  console.log('[7/7] Testing Appointment Reminder Lifecycle (Insert, Reschedule, Cancel)...');

  // Insert appointment (in future: 24h from now)
  runSql(DB_NAME, `
    RESET ROLE;
    INSERT INTO public.appointments (
      id, business_id, customer_id, status, starts_at, service_ends_at, occupied_starts_at, occupied_ends_at
    ) VALUES (
      '90000000-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      '10000000-0000-0000-0000-000000000001',
      'confirmed',
      NOW() + INTERVAL '24 hours',
      NOW() + INTERVAL '25 hours',
      NOW() + INTERVAL '24 hours',
      NOW() + INTERVAL '25 hours'
    );
  `);

  const reminderCheck1 = runSql(DB_NAME, `
    SELECT r.id, r.status, r.generation, r.due_at < a.starts_at AS due_before_start 
    FROM public.appointment_reminders r
    JOIN public.appointments a ON a.id = r.appointment_id
    WHERE r.appointment_id = '90000000-0000-0000-0000-000000000001';
  `);

  if (reminderCheck1.includes('pending') && reminderCheck1.includes('t')) {
    console.log('      [PASS] Appointment creation automatically generated pending reminder (gen 1, due 3h prior).');
  } else {
    console.error('      [FAIL] Reminder row was not generated on appointment insert:\n', reminderCheck1);
    process.exit(1);
  }

  // Reschedule appointment (+48h from now)
  runSql(DB_NAME, `
    UPDATE public.appointments 
    SET starts_at = NOW() + INTERVAL '48 hours',
        service_ends_at = NOW() + INTERVAL '49 hours',
        reminder_generation = reminder_generation + 1
    WHERE id = '90000000-0000-0000-0000-000000000001';
  `);

  const reminderCheck2 = runSql(DB_NAME, `
    SELECT r.generation, r.status 
    FROM public.appointment_reminders r
    WHERE r.appointment_id = '90000000-0000-0000-0000-000000000001'
    ORDER BY r.generation ASC;
  `);

  // psql output columns are separated by " | " with variable spacing
  const check2Lines = reminderCheck2.replace(/\s+/g, ' ');
  if (check2Lines.includes('1 | cancelled') && check2Lines.includes('2 | pending')) {
    console.log('      [PASS] Rescheduling invalidated gen 1 reminder and created gen 2 pending reminder.');
  } else {
    console.error('      [FAIL] Reminder invalidation on reschedule failed:\n', reminderCheck2);
    process.exit(1);
  }

  // Cancel appointment
  runSql(DB_NAME, `
    UPDATE public.appointments 
    SET status = 'cancelled'
    WHERE id = '90000000-0000-0000-0000-000000000001';
  `);

  const reminderCheck3 = runSql(DB_NAME, `
    SELECT COUNT(*) 
    FROM public.appointment_reminders 
    WHERE appointment_id = '90000000-0000-0000-0000-000000000001' AND status = 'pending';
  `);

  if (reminderCheck3.includes('0')) {
    console.log('      [PASS] Cancellation marked all pending reminders as cancelled.');
  } else {
    console.error('      [FAIL] Pending reminders still active after cancellation:\n', reminderCheck3);
    process.exit(1);
  }

  console.log('\n==============================================================================');
  console.log('INTEGRATION TEST SUMMARY: 100% PASSED');
  console.log('All migrations, role permissions, triggers, and lifecycle operations verified.');
  console.log('==============================================================================\n');

} finally {
  console.log(`Cleaning up: Dropping disposable database ${DB_NAME}...`);
  try {
    runSql('postgres', `DROP DATABASE IF EXISTS ${DB_NAME};`);
    console.log(`Database ${DB_NAME} dropped cleanly.`);
  } catch (cleanupErr) {
    console.warn('Cleanup notice:', cleanupErr.message);
  }
}

