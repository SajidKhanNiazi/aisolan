import { z } from "zod";

export const MAX_CONVERSATION_TURNS = 10;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_TOTAL_MESSAGES = 20;

export const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().min(1, "Message content cannot be empty").max(MAX_MESSAGE_LENGTH, "Message is too long"),
});

export const aiChatInputSchema = z.object({
  businessSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid salon identifier format")
    .min(3)
    .max(60),
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(MAX_TOTAL_MESSAGES, "Conversation exceeds maximum message limit"),
});

export type AiChatInput = z.infer<typeof aiChatInputSchema>;

export const salonFaqItemSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(3, "Question must be at least 3 characters").max(200, "Question too long"),
  answer: z.string().trim().min(3, "Answer must be at least 3 characters").max(1000, "Answer too long"),
});

export const updateAiSettingsSchema = z.object({
  businessId: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid business ID"),
  ai_receptionist_enabled: z.boolean(),
  default_language: z.enum(["en", "ur", "ur-Latn"]),
  welcome_message: z.string().trim().max(500, "Welcome message too long").nullable().optional(),
  faqs: z.array(salonFaqItemSchema).max(10, "Maximum of 10 FAQs allowed"),
});

export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;

// Tool Argument Schemas
export const checkAvailabilityArgsSchema = z.object({
  serviceId: z.string().uuid().optional(),
  serviceName: z.string().max(100).optional(),
  staffId: z.string().uuid().optional(),
  staffName: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
});

export type CheckAvailabilityArgs = z.infer<typeof checkAvailabilityArgsSchema>;
