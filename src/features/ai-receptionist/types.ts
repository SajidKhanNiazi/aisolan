export type AiReceptionistMode = "mock" | "openai" | "disabled";

export type SupportedLanguage = "en" | "ur" | "ur-Latn";

export interface SalonFaqItem {
  id?: string;
  question: string;
  answer: string;
}

export interface BusinessAiSettings {
  id?: string;
  business_id: string;
  ai_receptionist_enabled: boolean;
  default_language: SupportedLanguage;
  welcome_message: string | null;
  faqs: SalonFaqItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PublicAiConfig {
  enabled: boolean;
  mode: AiReceptionistMode;
  defaultLanguage: SupportedLanguage;
  welcomeMessage: string;
  faqs: SalonFaqItem[];
  modelName: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface BookingIntentHandoff {
  hasIntent: boolean;
  serviceId?: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  date?: string;
  time?: string;
  notes?: string;
}

import type { BookingDraft } from "./booking/types";
import type { ConversationalCard } from "./booking/adapter";

export interface AiChatResponse {
  success: boolean;
  message: string;
  bookingHandoff?: BookingIntentHandoff | null;
  draft?: BookingDraft;
  draftToken?: string;
  card?: ConversationalCard;
  toolsUsed: string[];
  mode: AiReceptionistMode;
  provider?: "openai" | "mock" | "disabled";
  model?: string;
  error?: string;
  code?: string;
}

export interface ToolExecutionContext {
  businessId: string;
  businessSlug: string;
  businessName: string;
  timezone: string;
  currency: string;
  draftToken?: string;
}

