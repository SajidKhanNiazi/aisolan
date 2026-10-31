import { updateConversationAiMode } from "./conversation-service";
import type { WhatsAppConversation } from "./types";

const HANDOFF_KEYWORDS = [
  "talk to a person",
  "human agent",
  "salon owner",
  "speak to staff",
  "speak with staff",
  "talk to human",
  "real person",
  "speak to a person",
  "speak to a human",
  "talk to someone",
  "customer service",
  "connect me to a person",
  "human please",
  "human receptionist",
  "bande se baat karni hai",
  "insaan se baat",
];

const OPTOUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "cancel messages",
  "cancel subscription",
  "optout",
  "opt out",
  "stop messages",
];

/**
 * Checks if a customer message triggers an explicit human handoff request.
 */
export function isHumanHandoffRequest(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return HANDOFF_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Checks if a customer message triggers an opt-out / STOP request.
 */
export function isOptOutRequest(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return OPTOUT_KEYWORDS.some((kw) => lower === kw || lower.startsWith(kw + " "));
}

/**
 * Processes a human handoff request: updates session to human_handoff and returns reply text.
 */
export async function executeHumanHandoff(
  conversationOrId: WhatsAppConversation | string,
  businessNameOrReason: string = "the salon"
): Promise<string> {
  const conversationId = typeof conversationOrId === "string" ? conversationOrId : conversationOrId.id;
  await updateConversationAiMode(conversationId, "human_handoff");

  return (
    `I have paused the automated assistant and notified the team at *${businessNameOrReason}*.\n\n` +
    `A staff member will read your messages and reply to you directly on this WhatsApp chat as soon as possible. Thank you for your patience!`
  );
}

/**
 * Processes an opt-out request: acknowledges opt-out.
 */
export async function executeOptOut(
  conversationOrId: WhatsAppConversation | string,
  businessName: string = "the salon"
): Promise<string> {
  const conversationId = typeof conversationOrId === "string" ? conversationOrId : conversationOrId.id;
  await updateConversationAiMode(conversationId, "paused");

  return (
    `You have unsubscribed from automated messages from *${businessName}*.\n\n` +
    `We will not send you further automated messages. You can reach out directly or reply START if you ever wish to resume.`
  );
}

