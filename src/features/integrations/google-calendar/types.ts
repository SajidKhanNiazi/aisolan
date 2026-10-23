/**
 * BookPilot AI — Google Calendar Integration Types
 * Phase 1G-B: Types for Connections, OAuth State, Sync Outbox, and Event Mappings
 */

export type GoogleConnectionStatus = "active" | "disconnected" | "needs_reconnect" | "error";

export type CalendarEventSyncStatus = "synced" | "sync_failed" | "deleted";

export type CalendarSyncAction = "create" | "update" | "delete";

export type CalendarSyncOutboxStatus =
  | "queued"
  | "processing"
  | "completed"
  | "retry_pending"
  | "failed"
  | "skipped";

export interface GoogleCalendarConnection {
  id: string;
  business_id: string;
  user_id: string;
  google_account_email: string;
  google_calendar_id: string | null;
  google_calendar_name: string | null;
  status: GoogleConnectionStatus;
  sync_enabled: boolean;
  last_successful_sync_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  canEdit: boolean;
}

export interface AppointmentCalendarEventMapping {
  id: string;
  business_id: string;
  appointment_id: string;
  connection_id: string;
  google_event_id: string;
  google_calendar_id: string;
  last_synchronized_version: string;
  status: CalendarEventSyncStatus;
  last_synced_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncEventPayload {
  business_name: string;
  business_slug: string;
  business_timezone: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string;
  staff_name: string;
  starts_at: string;
  service_ends_at: string;
  status: string;
  booking_reference: string;
  cancellation_reason?: string | null;
  appointment_id?: string;
  business_id?: string;
}

export interface CalendarSyncOutboxItem {
  id: string;
  business_id: string;
  appointment_id: string;
  action: CalendarSyncAction;
  connection_id: string | null;
  source_version: string;
  payload: CalendarSyncEventPayload;
  status: CalendarSyncOutboxStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string;
  claimed_at: string | null;
  lease_expires_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessSyncBatchOutcome {
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string; code?: string }>;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GoogleOAuthStatePayload {
  userId: string;
  businessId: string;
  businessSlug: string;
  expiresAt: number;
  nonce: string;
}
