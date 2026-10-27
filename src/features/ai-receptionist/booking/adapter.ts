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

import { formatCurrency } from "@/features/services/types";

/**
 * Generates structured confirmation review card for hosted web and future channels.
 * Resolves duration and price from the server-verified service record.
 * Never displays "Standard" or "Standard rate". Blocks confirmation on incomplete metadata.
 */
export function buildConfirmationCard(
  draft: BookingDraft,
  draftToken: string,
  salonName?: string,
  serviceRecord?: {
    durationMinutes?: number;
    priceAmount?: number;
    currency?: string;
    name?: string;
  },
  currency?: string
): ConversationalCard {
  const durationMinutes =
    serviceRecord?.durationMinutes ?? draft.serviceDurationMinutes;
  const priceFormatted =
    serviceRecord?.priceAmount !== undefined && (currency || serviceRecord.currency)
      ? formatCurrency(serviceRecord.priceAmount, currency || serviceRecord.currency)
      : draft.servicePriceFormatted;

  // Defect 1H-B-003: Never display "Standard" or "Standard rate".
  // If authoritative service duration or price cannot be resolved, return an error card to block confirmation.
  if (
    !durationMinutes ||
    durationMinutes <= 0 ||
    !priceFormatted ||
    priceFormatted.trim() === ""
  ) {
    return {
      type: "error",
      title: "Service Details Incomplete",
      subtitle:
        "Unable to load complete service pricing and duration. Please re-select your service or use the booking wizard.",
      draftId: draft.id,
      draftToken,
      actions: [
        {
          id: "reselect-service-btn",
          label: "Select Service Again",
          type: "edit",
          payload: { draftId: draft.id },
        },
      ],
    };
  }

  return {
    type: "confirmation_review",
    title: "Please Review Your Appointment",
    subtitle: "Select 'Confirm Booking' to finalize your reservation.",
    fields: [
      { label: "Salon", value: salonName || draft.businessSlug },
      { label: "Service", value: serviceRecord?.name || draft.serviceName || "Selected Service" },
      { label: "Specialist", value: draft.staffName || "Any Specialist" },
      { label: "Date", value: draft.slotDate || "" },
      { label: "Time", value: draft.slotStartTime || "" },
      {
        label: "Duration",
        value: `${durationMinutes} minutes`,
      },
      {
        label: "Price",
        value: priceFormatted,
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
