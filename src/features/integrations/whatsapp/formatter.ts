import type { BookingDraft } from "@/features/ai-receptionist/booking/types";

/**
 * Converts standard Markdown syntax to WhatsApp-compatible text formatting.
 * Rules:
 * - `**bold**` -> `*bold*`
 * - `__italic__` -> `_italic_`
 * - `### Header` -> `*Header*`
 * - Strip out HTML tags or raw JSON structures
 * - Clean up redundant blank lines
 */
export function formatWhatsAppMessage(text: string): string {
  if (!text) return "";

  const formatted = text
    // Replace markdown headers `### Heading` with `*Heading*`
    .replace(/^#{1,4}\s+(.+)$/gm, "*$1*")
    // Replace `**bold**` with `*bold*`
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    // Replace `__italic__` with `_italic_`
    .replace(/__(.*?)__/g, "_$1_")
    // Convert backticks `code` into normal text or monospace ```code```
    .replace(/`([^`]+)`/g, "$1")
    // Normalize bullet points to clean unicode bullet
    .replace(/^\s*[-*]\s+/gm, "• ")
    // Remove consecutive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return formatted;
}

/**
 * Builds a structured, high-clarity WhatsApp booking summary from an active draft.
 */
export function buildWhatsAppBookingSummary(
  draft: BookingDraft,
  businessName: string,
  timezone: string = "Europe/London"
): string {
  const service = draft.serviceName || "Treatment";
  const price = draft.servicePriceFormatted || "N/A";
  const duration = draft.serviceDurationMinutes ? `${draft.serviceDurationMinutes} mins` : "N/A";
  const specialist = draft.staffName || "Any Specialist";
  const date = draft.slotDate || "Pending date";
  const time = draft.slotStartTime || "Pending time";
  const customerName = draft.customerName || "Customer";

  return [
    `📋 *Booking Summary — ${businessName}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `• *Service:* ${service} (${duration})`,
    `• *Price:* ${price}`,
    `• *Specialist:* ${specialist}`,
    `• *Date & Time:* ${date} at ${time} (${timezone})`,
    `• *Client Name:* ${customerName}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_To reserve this slot, please reply *Confirm* or let me know if you would like to change any detail._`,
  ].join("\n");
}

/**
 * Builds an interactive button message payload for Meta Cloud API.
 * Meta allows up to 3 quick-reply buttons per interactive message.
 */
export function buildWhatsAppInteractiveButtons(
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Record<string, unknown> {
  const formattedBody = formatWhatsAppMessage(bodyText);

  return {
    type: "button",
    body: {
      text: formattedBody,
    },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: "reply",
        reply: {
          id: b.id,
          title: b.title.slice(0, 20), // Meta limit: 20 chars per button title
        },
      })),
    },
  };
}
