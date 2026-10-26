import type {
  BookingDraft,
  BookingConfirmationOutcome,
  ConversationalChannel,
} from "./types";

export interface ChannelCardAction {
  id: string;
  label: string;
  type: "confirm" | "edit" | "cancel" | "select_slot" | "select_service";
  payload?: Record<string, unknown>;
}

export interface ConversationalCard {
  type: "service_picker" | "slot_picker" | "details_form" | "confirmation_review" | "success" | "error";
  title: string;
  subtitle?: string;
  fields?: Array<{ label: string; value: string }>;
  actions?: ChannelCardAction[];
  draftToken?: string;
  draftId?: string;
}

export interface ChannelFormattedResponse {
  channel: ConversationalChannel;
  textMessage: string;
  card?: ConversationalCard;
  draft?: BookingDraft;
  draftToken?: string;
}

/**
 * Generates structured confirmation review card for hosted web and future channels.
 */
export function buildConfirmationCard(
  draft: BookingDraft,
  draftToken: string,
  salonName?: string
): ConversationalCard {
  return {
    type: "confirmation_review",
    title: "Please Review Your Appointment",
    subtitle: "Select 'Confirm Booking' to finalize your reservation.",
    fields: [
      { label: "Salon", value: salonName || draft.businessSlug },
      { label: "Service", value: draft.serviceName || "Selected Service" },
      { label: "Specialist", value: draft.staffName || "Any Specialist" },
      { label: "Date", value: draft.slotDate || "" },
      { label: "Time", value: draft.slotStartTime || "" },
      {
        label: "Duration",
        value: draft.serviceDurationMinutes
          ? `${draft.serviceDurationMinutes} minutes`
          : "Standard",
      },
      {
        label: "Price",
        value: draft.servicePriceFormatted || "Standard rate",
      },
      { label: "Name", value: draft.customerName || "" },
      { label: "Phone", value: draft.customerPhone || "" },
      ...(draft.customerEmail
        ? [{ label: "Email", value: draft.customerEmail }]
        : []),
    ],
    actions: [
      {
        id: "confirm-booking-btn",
        label: "Confirm Booking",
        type: "confirm",
        payload: { draftId: draft.id, draftToken },
      },
      {
        id: "edit-details-btn",
        label: "Edit Details",
        type: "edit",
        payload: { draftId: draft.id },
      },
      {
        id: "cancel-draft-btn",
        label: "Cancel",
        type: "cancel",
        payload: { draftId: draft.id },
      },
    ],
    draftId: draft.id,
    draftToken,
  };
}

/**
 * Generates confirmed booking outcome card.
 */
export function buildSuccessCard(
  outcome: BookingConfirmationOutcome
): ConversationalCard {
  return {
    type: "success",
    title: "Booking Confirmed!",
    subtitle: `Your appointment reference is ${outcome.bookingReference || "confirmed"}.`,
    fields: [
      { label: "Reference", value: outcome.bookingReference || "" },
      { label: "Salon", value: outcome.salonName || "" },
      { label: "Service", value: outcome.serviceName || "" },
      { label: "Specialist", value: outcome.staffName || "Specialist" },
      { label: "When", value: outcome.startsAtLocal || "" },
      { label: "Price", value: outcome.priceFormatted || "" },
      ...(outcome.emailQueued
        ? [{ label: "Confirmation Email", value: "Queued" }]
        : []),
    ],
    actions: outcome.managementUrl
      ? [
          {
            id: "manage-booking-link",
            label: "Manage Booking",
            type: "confirm",
            payload: { url: outcome.managementUrl },
          },
        ]
      : [],
  };
}
