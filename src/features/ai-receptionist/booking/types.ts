export type BookingDraftStage =
  | "idle"
  | "collecting_service"
  | "collecting_staff_preference"
  | "collecting_datetime"
  | "checking_availability"
  | "collecting_customer_details"
  | "awaiting_confirmation"
  | "confirming"
  | "confirmed"
  | "slot_unavailable"
  | "cancelled_draft"
  | "failed";

export type ConversationalChannel = "hosted_web" | "embedded_web" | "whatsapp";

export interface ChannelContext {
  channel: ConversationalChannel;
  businessId: string;
  businessSlug: string;
  conversationId: string;
  customerIdentityContext?: {
    externalId?: string;
    phone?: string;
    name?: string;
  };
  locale?: string;
  salonTimezone: string;
}

export interface BookingDraft {
  id: string; // Opaque draft UUID
  businessId: string;
  businessSlug: string;
  conversationId: string;
  channel: ConversationalChannel;
  serviceId?: string;
  serviceName?: string;
  servicePriceCents?: number;
  servicePriceFormatted?: string;
  serviceDurationMinutes?: number;
  staffId?: string | null;
  staffName?: string | null;
  staffPreference: "any" | "specific";
  slotDate?: string; // YYYY-MM-DD in salon timezone
  slotStartTime?: string; // HH:mm in salon timezone
  slotStartsAtUtc?: string; // ISO UTC timestamp
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNotes?: string;
  stage: BookingDraftStage;
  version: number;
  expiresAt: string; // ISO UTC
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
  lastValidationStatus?: "valid" | "incomplete" | "expired" | "slot_unavailable";
  idempotencyKey: string;
  tokenHash?: string;
  appointmentId?: string;
  bookingReference?: string;
  managementUrl?: string;
}

export interface BookingConfirmationRequest {
  businessSlug: string;
  draftId: string;
  draftToken: string;
  idempotencyKey: string;
  customerNotes?: string;
}

export interface BookingConfirmationOutcome {
  success: boolean;
  stage: BookingDraftStage;
  appointmentId?: string;
  bookingReference?: string;
  salonName?: string;
  serviceName?: string;
  staffName?: string;
  startsAtLocal?: string;
  dateLocal?: string;
  timeLocal?: string;
  priceFormatted?: string;
  timezone?: string;
  managementUrl?: string;
  emailQueued?: boolean;
  error?: string;
  code?: string;
}
