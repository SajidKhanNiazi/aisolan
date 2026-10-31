/**
 * Bookzello — Phase 1H-D1 WhatsApp Configuration & Feature Flags
 * Enforces secure defaults: all WhatsApp outbound network requests and booking writes
 * remain disabled by default until explicitly enabled by the SaaS owner.
 */

export type WhatsAppExecutionMode = "async_trigger" | "inline";

export interface WhatsAppConfig {
  enabled: boolean;
  outboundEnabled: boolean;
  bookingWritesEnabled: boolean;
  executionMode: WhatsAppExecutionMode;
  allowedSalons: string[];
  authorizedRecipients?: string[];
  graphApiVersion: string;
  appId?: string;
  appSecret?: string;
  verifyToken?: string;
  testPhoneNumberId?: string;
  testWabaId?: string;
  accessToken?: string;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const allowedSalonsRaw = process.env.WHATSAPP_PILOT_ALLOWED_SALONS?.trim();
  const allowedSalons = allowedSalonsRaw && allowedSalonsRaw.length > 0
    ? allowedSalonsRaw.split(",").map((s) => s.trim().toLowerCase())
    : ["bookpilot-qa-salon"];

  const recipientsRaw = process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS?.trim();
  const authorizedRecipients = recipientsRaw && recipientsRaw.length > 0
    ? recipientsRaw.split(",").map((r) => r.trim().replace(/^\+/, ""))
    : undefined;

  const executionMode: WhatsAppExecutionMode =
    process.env.WHATSAPP_EXECUTION_MODE === "inline" ? "inline" : "async_trigger";

  return {
    enabled: process.env.WHATSAPP_ENABLED === "true",
    outboundEnabled: process.env.WHATSAPP_OUTBOUND_ENABLED === "true",
    bookingWritesEnabled: process.env.WHATSAPP_BOOKING_WRITES_ENABLED === "true",
    executionMode,
    allowedSalons,
    authorizedRecipients,
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v26.0",
    appId: process.env.WHATSAPP_APP_ID?.trim() || undefined,
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || undefined,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || undefined,
    testPhoneNumberId: process.env.WHATSAPP_TEST_PHONE_NUMBER_ID?.trim() || undefined,
    testWabaId: process.env.WHATSAPP_TEST_WABA_ID?.trim() || undefined,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || undefined,
  };
}

export function getWhatsAppExecutionMode(): WhatsAppExecutionMode {
  return process.env.WHATSAPP_EXECUTION_MODE === "inline" ? "inline" : "async_trigger";
}

export function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true";
}

export function isWhatsAppOutboundEnabled(): boolean {
  return process.env.WHATSAPP_OUTBOUND_ENABLED === "true";
}

export function isWhatsAppBookingWritesEnabled(): boolean {
  return process.env.WHATSAPP_BOOKING_WRITES_ENABLED === "true";
}

export function isSalonAllowedForWhatsAppPilot(businessSlug: string): boolean {
  const config = getWhatsAppConfig();
  return config.allowedSalons.includes(businessSlug.toLowerCase().trim());
}

export function isRecipientAuthorizedForWhatsAppPilot(recipientWaId: string): boolean {
  const config = getWhatsAppConfig();
  if (!config.authorizedRecipients || config.authorizedRecipients.length === 0) {
    // If not explicitly restricted, allow in test-number mode (Meta itself restricts unauthorized numbers)
    return true;
  }
  const cleanId = recipientWaId.replace(/^\+/, "").trim();
  return config.authorizedRecipients.includes(cleanId);
}

