# Supabase Database Migrations — BookPilot AI

> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) Section 5, 6 & [docs/data-model.md](file:///c:/laragon/www/Ai%20Salon%20software/docs/data-model.md)

---

## 1. Migration Directory Overview
This directory stores version-controlled, idempotent SQL migrations for the BookPilot AI PostgreSQL database hosted on Supabase.

### Current Milestone Status (Phase 1A)
- **Phase 1A Status:** Database foundation preparation only.
- **Strict Scope Restriction:** Business tables (`organizations`, `staff`, `services`, `appointments`, etc.) are explicitly NOT created in Phase 1A. They will be applied in Phase 1B (Multi-Tenant Foundation) and Phase 1C (Booking Engine).

---

## 2. Migration Naming Conventions
All migration files must adhere to the standard timestamped format:

```text
YYYYMMDDHHMMSS_<descriptive_action_name>.sql
```

Examples:
- `20261019000001_create_tenants_and_auth_tables.sql`
- `20261019000002_create_locations_and_schedules.sql`
- `20261019000003_create_bookings_and_concurrency_locks.sql`

---

## 3. Non-Negotiable RLS & Tenant Isolation Conventions

1. **Mandatory Tenant Scoping:** Every tenant-owned table must include an `organization_id UUID NOT NULL` column referencing `organizations(id) ON DELETE CASCADE`.
2. **Row Level Security (RLS):** RLS must be explicitly enabled on every tenant table:
   ```sql
   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
   ```
3. **No Unchecked Primary Key Lookups:** Application queries must never query `WHERE id = $id`. Queries must enforce `WHERE id = $id AND organization_id = $organizationId`.
4. **Exclusion Constraints for Bookings:** Double-booking prevention uses `btree_gist` extension with `tstzrange` exclusion constraints:
   ```sql
   ALTER TABLE appointments ADD CONSTRAINT prevent_staff_appointment_overlap
   EXCLUDE USING gist (staff_id WITH =, tstzrange(start_time, end_time) WITH &&)
   WHERE (status IN ('confirmed', 'pending_hold'));
   ```

---

## 4. Local Execution & Supabase CLI
When the project owner links a Supabase development project:
```bash
# Link project
npx supabase link --project-ref <your-project-ref>

# Apply migrations
npx supabase db push
```
