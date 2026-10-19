# Domain Features Architecture — BookPilot AI

> **Governing Standards:** [AGENTS.md](file:///c:/laragon/www/Ai%20Salon%20software/AGENTS.md) Section 4 & [docs/architecture.md](file:///c:/laragon/www/Ai%20Salon%20software/docs/architecture.md)

---

## Modular Domain Folders
In BookPilot AI, domain logic is partitioned into dedicated modular feature directories under `src/features/` to maintain clean separation of concerns, testability, and avoid code duplication:

- `src/features/organizations/`: Business profile, multi-tenant workspace onboarding, and organization membership.
- `src/features/locations/`: Physical salon locations, operating hours, and IANA timezone management.
- `src/features/staff/`: Staff profiles, user account links, and staff-service capability mapping.
- `src/features/services/`: Service definitions, categories, durations, buffers, and pricing rules.
- `src/features/schedules/`: Regular shifts, recurring breaks, holidays, and approved time-off.
- `src/features/bookings/`: Availability engine, concurrency protection, idempotency, and appointment state machine.
- `src/features/customers/`: Client records, secure tokenized lookup, and GDPR notification consent.
- `src/features/notifications/`: Transactional email templates, dispatch queue, and retry policies.
- `src/features/ai-receptionist/`: Deterministic server tool adapters, conversational context, and audit logs.

*Note: In Phase 1A, these modules serve as architectural boundaries. Feature implementations will be developed in small, reviewable increments starting in Phase 1B.*
