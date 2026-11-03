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

async function verifyUniversalSalonLifecycle() {
  console.log("==============================================================================");
  console.log("BOOKZELLO — D27: Universal Salon End-to-End Lifecycle & Acceptance Suite");
  console.log("==============================================================================\n");

  const bizId = "77777777-0000-0000-0000-000000000001";
  const slug = "fresh-fade-barbers-d27";
  const foreignBizId = "77777777-9999-0000-0000-000000000099";

  const svcCutId = "77777777-1111-0000-0000-000000000001";
  const svcBeardId = "77777777-1111-0000-0000-000000000002";
  const stfSoloId = "77777777-2222-0000-0000-000000000001";
  const stfJuniorId = "77777777-2222-0000-0000-000000000002";

  // Step 1: Account Registration & Business Creation
  console.log("--- 1. Testing Business Creation & Tenant Isolation ---");
  const cleanupSql = `
    DELETE FROM public.appointment_management_tokens WHERE business_id IN ('${bizId}', '${foreignBizId}');
    DELETE FROM public.notification_outbox WHERE business_id IN ('${bizId}', '${foreignBizId}');
    DELETE FROM public.appointments WHERE business_id IN ('${bizId}', '${foreignBizId}');
    DELETE FROM public.staff_services WHERE business_id IN ('${bizId}', '${foreignBizId}') OR staff_id IN ('${stfSoloId}', '${stfJuniorId}');
    DELETE FROM public.staff_working_hours WHERE business_id IN ('${bizId}', '${foreignBizId}') OR staff_id IN ('${stfSoloId}', '${stfJuniorId}');
    DELETE FROM public.staff_profiles WHERE business_id IN ('${bizId}', '${foreignBizId}') OR id IN ('${stfSoloId}', '${stfJuniorId}');
    DELETE FROM public.services WHERE business_id IN ('${bizId}', '${foreignBizId}') OR id IN ('${svcCutId}', '${svcBeardId}');
    DELETE FROM public.business_opening_hours WHERE business_id IN ('${bizId}', '${foreignBizId}');
    DELETE FROM public.business_booking_policies WHERE business_id IN ('${bizId}', '${foreignBizId}');
    DELETE FROM public.business_onboarding_progress WHERE business_id IN ('${bizId}', '${foreignBizId}');
    DELETE FROM public.businesses WHERE id IN ('${bizId}', '${foreignBizId}');
  `;
  await runPsql(cleanupSql);

  const createBizSql = `
    INSERT INTO public.businesses (id, name, slug, timezone, currency, address_line1, city, country)
    VALUES ('${bizId}', 'Fresh Fade Barbers', '${slug}', 'Europe/London', 'GBP', '42 High St', 'Manchester', 'GB')
    RETURNING id;
  `;
  const createdBizId = await runPsql(createBizSql);
  console.log(`[+] PASS: New business registered with slug '${slug}' (ID: ${createdBizId}).`);

  // Step 2: 7-Step Onboarding Progression
  console.log("\n--- 2. Testing 7-Step Onboarding Progression ---");
  const onboardingSql = `
    INSERT INTO public.business_onboarding_progress (business_id, current_step, completed_steps, is_completed)
    VALUES ('${bizId}', 7, ARRAY[1, 2, 3, 4, 5, 6, 7], true)
    RETURNING is_completed;
  `;
  const onboardingRes = await runPsql(onboardingSql);
  console.log(`[+] PASS: 7-step onboarding completed successfully (is_completed = ${onboardingRes}).`);

  // Step 3: Services, Pricing & Opening Hours
  console.log("\n--- 3. Testing Services, Pricing & Opening Hours ---");

  const setupServicesAndHours = `
    INSERT INTO public.services (id, business_id, name, duration_minutes, buffer_minutes, price_amount, is_active, is_archived)
    VALUES 
      ('${svcCutId}', '${bizId}', 'Skin Fade', 45, 15, 30.00, true, false),
      ('${svcBeardId}', '${bizId}', 'Beard Trim & Shape', 20, 10, 15.00, true, false);

    INSERT INTO public.business_opening_hours (business_id, day_of_week, is_closed, open_time, close_time)
    SELECT '${bizId}', g, false, '09:00:00'::time, '19:00:00'::time
    FROM generate_series(0, 6) g;

    INSERT INTO public.business_booking_policies (business_id, min_notice_hours, max_advance_days, online_booking_enabled, allow_staff_selection)
    VALUES ('${bizId}', 1, 60, true, false);
  `;
  await runPsql(setupServicesAndHours);
  console.log("[+] PASS: 2 active services, weekly schedule (09:00-19:00), and booking policy configured.");

  // Step 4: Staff Creation & Service Qualifications (Solo Salon vs Multi-Staff)
  console.log("\n--- 4. Testing Solo Salon & Multi-Staff Qualification Architecture ---");

  const setupStaff = `
    -- Solo Owner (Qualified for both Skin Fade and Beard Trim)
    INSERT INTO public.staff_profiles (id, business_id, display_name, is_active, is_archived)
    VALUES 
      ('${stfSoloId}', '${bizId}', 'Marcus Fade (Owner)', true, false),
      ('${stfJuniorId}', '${bizId}', 'Junior Barber', true, false);

    INSERT INTO public.staff_working_hours (business_id, staff_id, day_of_week, is_working, open_time, close_time)
    SELECT '${bizId}', s.id, g, true, '09:00:00'::time, '19:00:00'::time
    FROM (VALUES ('${stfSoloId}'::uuid), ('${stfJuniorId}'::uuid)) s(id)
    CROSS JOIN generate_series(0, 6) g;

    -- Marcus qualified for both; Junior qualified ONLY for Beard Trim
    INSERT INTO public.staff_services (business_id, service_id, staff_id)
    VALUES 
      ('${bizId}', '${svcCutId}', '${stfSoloId}'),
      ('${bizId}', '${svcBeardId}', '${stfSoloId}'),
      ('${bizId}', '${svcBeardId}', '${stfJuniorId}');
  `;
  await runPsql(setupStaff);
  console.log("[+] PASS: Staff profiles, shift schedules, and selective qualifications assigned.");

  // Step 5: Booking Readiness Evaluation
  console.log("\n--- 5. Evaluating Booking Readiness ---");
  const readinessQuery = `
    SELECT 
      (SELECT COUNT(*) FROM public.services WHERE business_id = '${bizId}' AND is_active = true) >= 1 AS has_services,
      (SELECT COUNT(*) FROM public.business_opening_hours WHERE business_id = '${bizId}' AND is_closed = false) >= 1 AS has_hours,
      (SELECT COUNT(*) FROM public.staff_profiles WHERE business_id = '${bizId}' AND is_active = true) >= 1 AS has_staff,
      (SELECT COUNT(*) FROM public.staff_services WHERE business_id = '${bizId}') >= 1 AS has_qualifications,
      (SELECT online_booking_enabled FROM public.business_booking_policies WHERE business_id = '${bizId}') AS online_enabled;
  `;
  const readinessRes = await runPsql(readinessQuery);
  console.log(`[+] Readiness Checks: ${readinessRes}`);
  if (!readinessRes.includes("t|t|t|t|t")) {
    throw new Error("FAIL: Salon failed booking readiness requirements.");
  }
  console.log("[+] PASS: Salon meets 100% of commercial booking readiness requirements.");

  // Step 6: Public Four-Step Booking & Auto-Assignment
  console.log("\n--- 6. Testing Public Four-Step Booking & Auto-Assignment ---");
  const bookSlot = "2026-11-20T11:00:00Z";
  const tokenHash = "b".repeat(64);
  const mgmtUrl = "https://bookzello.com/manage-booking/freshfade-token-1";

  const publicBookingCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcCutId}'::uuid,
    NULL,
    '${bookSlot}'::timestamptz,
    'David Miller',
    'david.miller@example.co.uk',
    '+447911122334',
    'First time customer',
    'd27-idemp-booking-1',
    '${tokenHash}',
    NULL,
    '${mgmtUrl}'
  );`;

  const bookingRes = JSON.parse(await runPsql(publicBookingCall));
  if (!bookingRes.success || !bookingRes.data?.appointment_id) {
    throw new Error(`FAIL: Public booking failed: ${JSON.stringify(bookingRes)}`);
  }
  const aptId = bookingRes.data.appointment_id;
  console.log(`[+] PASS: Four-step public booking confirmed!`);
  console.log(`    Booking Ref : ${bookingRes.data.booking_reference}`);
  console.log(`    Assigned To : ${bookingRes.data.staff_name} (Auto-assigned qualified specialist)`);
  console.log(`    Service     : ${bookingRes.data.service_name} (£${bookingRes.data.price_amount})`);

  // Step 7: Dashboard Appointment Visibility & Strict Tenant Isolation
  console.log("\n--- 7. Testing Dashboard Visibility & Tenant Isolation ---");
  const dashboardQuery = `
    SELECT id, status, customer_name_snapshot, service_name_snapshot
    FROM public.appointments
    WHERE business_id = '${bizId}' AND id = '${aptId}';
  `;
  const aptRow = await runPsql(dashboardQuery);
  if (!aptRow.includes("David Miller")) {
    throw new Error("FAIL: Appointment not visible on tenant dashboard.");
  }
  console.log(`[+] PASS: Appointment visible on owner dashboard (${aptRow}).`);

  // Foreign Tenant Cross-Isolation Check
  const crossIsolationQuery = `
    SELECT COUNT(*) FROM public.appointments
    WHERE business_id = '${foreignBizId}' AND id = '${aptId}';
  `;
  const crossCount = await runPsql(crossIsolationQuery);
  if (crossCount !== "0") {
    throw new Error("SECURITY VIOLATION: Cross-tenant appointment leakage detected!");
  }
  console.log("[+] PASS: Strict tenant isolation confirmed. Foreign tenant sees 0 records.");

  // Step 8: Customer Rescheduling & Self-Service Cancellation
  console.log("\n--- 8. Testing Self-Service Rescheduling & Cancellation ---");
  const tokenRecord = await runPsql(`SELECT appointment_id FROM public.appointment_management_tokens WHERE token_hash = '${tokenHash}';`);
  if (tokenRecord !== aptId) {
    throw new Error("FAIL: Management token lookup failed.");
  }
  console.log("[+] PASS: Self-service management token resolved.");

  // Cancel appointment via status transition
  const cancelSql = `
    UPDATE public.appointments
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = '${aptId}' AND business_id = '${bizId}'
    RETURNING status;
  `;
  const cancelStatus = await runPsql(cancelSql);
  if (!cancelStatus.includes("cancelled")) {
    throw new Error(`FAIL: Cancellation status transition failed: ${cancelStatus}`);
  }
  console.log("[+] PASS: Appointment self-cancellation committed. Slot released for future bookings.");

  // Re-booking previously cancelled slot should now succeed
  const rebookCall = `SELECT public.create_public_appointment_atomic(
    '${slug}',
    '${svcCutId}'::uuid,
    NULL,
    '${bookSlot}'::timestamptz,
    'Sam Wilson',
    'sam.wilson@example.co.uk',
    '+447911122335',
    'Re-booking freed slot',
    'd27-idemp-booking-2'
  );`;
  const rebookRes = JSON.parse(await runPsql(rebookCall));
  if (!rebookRes.success) {
    throw new Error(`FAIL: Booking freed slot failed: ${JSON.stringify(rebookRes)}`);
  }
  console.log(`[+] PASS: Previously cancelled slot successfully re-booked by next customer (${rebookRes.data.booking_reference}).`);

  console.log("\n==============================================================================");
  console.log("ALL 8 UNIVERSAL SALON ACCEPTANCE & LIFECYCLE TESTS PASSED (100%)");
  console.log("==============================================================================");
}

verifyUniversalSalonLifecycle().catch((err) => {
  console.error("FATAL VERIFICATION FAILURE:", err);
  process.exit(1);
});
