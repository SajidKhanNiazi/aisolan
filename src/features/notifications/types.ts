/**
 * BookPilot AI — Transactional Notification Outbox & Delivery Types
 * Phase 1G-A: Production-Ready Email Notifications
 */

export type NotificationEventType = "new_booking" | "reschedule" | "cancellation";

export type NotificationRecipientType = "customer" | "owner";

export type NotificationTemplateKey =
  | "customer_booking_confirmation"
  | "customer_rescheduling_confirmation"
  | "customer_cancellation_confirmation"
  | "owner_new_booking_alert"
  | "owner_reschedule_alert"
  | "owner_cancellation_alert";

export type NotificationStatus =
  | "queued"
  | "processing"
  | "sent"
  | "retry_pending"
  | "failed"
  | "skipped";

export interface NotificationTemplatePayload {
  business_name: string;
  business_slug: string;
  business_phone?: string | null;
  business_email?: string | null;
  business_timezone: string;
  business_address?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  service_name: string;
  staff_name: string;
  starts_at: string;
  service_ends_at: string;
  previous_starts_at?: string | null;
  previous_service_ends_at?: string | null;
  duration_minutes: number;
  price_minor: number;
  currency: string;
  booking_reference: string;
  cancellation_reason?: string | null;
  management_url?: string | null;
  [key: string]: unknown;
}

export interface NotificationOutboxItem {
  id: string;
  business_id: string;
  appointment_id: string;
  customer_id?: string | null;
  event_type: NotificationEventType;
  recipient_type: NotificationRecipientType;
  recipient_email: string;
  recipient_name?: string | null;
  template_key: NotificationTemplateKey;
  payload: NotificationTemplatePayload;
  status: NotificationStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string;
  claimed_at?: string | null;
  lease_expires_at?: string | null;
  provider_message_id?: string | null;
  last_error_code?: string | null;
  last_error_message?: string | null;
  dedupe_key: string;
  sent_at?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Sanitized delivery record for salon owner dashboard display.
 * Omits customer management tokens and sensitive payload parameters.
 */
export type NotificationHistoryItem = Omit<NotificationOutboxItem, "payload">;

export interface BusinessNotificationSettings {
  id?: string;
  business_id: string;
  notify_on_new_booking: boolean;
  notify_on_reschedule: boolean;
  notify_on_cancellation: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmailSendPayload {
  to: string;
  from?: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  isRetryable?: boolean;
}

export interface EmailDeliveryProvider {
  name: string;
  sendEmail(payload: EmailSendPayload): Promise<EmailSendResult>;
}

export interface ProcessBatchOutcome {
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string; code?: string }>;
}
