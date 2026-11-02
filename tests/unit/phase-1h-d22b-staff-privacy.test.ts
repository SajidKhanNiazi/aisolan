import { describe, it, expect } from "vitest";
import { buildWhatsAppBookingSummary } from "@/features/integrations/whatsapp/formatter";
import { buildConfirmationCard } from "@/features/ai-receptionist/booking/adapter";
import type { BookingDraft } from "@/features/ai-receptionist/booking/types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function sampleDraft(overrides: Partial<BookingDraft> = {}): BookingDraft {
  return {
    id: "draft-1",
    businessId: "0c60d233-a86f-499d-9846-4cd3daf8ca1a",
    businessSlug: "bookpilot-qa-salon",
    conversationId: "conv-1",
    channel: "whatsapp",
    serviceId: "4d85b929-4189-4990-a1d2-4c54fa8909a3",
    serviceName: "Haircut & Beard",
    servicePriceFormatted: "£28.00",
    serviceDurationMinutes: 45,
    staffId: null,
    staffName: "Any Specialist",
    staffPreference: "any",
    slotDate: "2026-11-02",
    slotStartTime: "14:00",
    stage: "awaiting_confirmation",
    version: 1,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    idempotencyKey: "idem-1",
    ...overrides,
  };
}

describe("Phase 1H-D22B: Staff name privacy hardening", () => {
  it("WhatsApp booking summary omits named specialists when preference is any", () => {
    const text = buildWhatsAppBookingSummary(sampleDraft(), "BookPilot QA Salon");
    expect(text).toContain("Any available specialist");
    expect(text).not.toContain("Alex QA");
    expect(text).not.toContain("Emma QA");
    expect(text).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
  });

  it("WhatsApp booking summary includes specialist only when explicitly requested", () => {
    const text = buildWhatsAppBookingSummary(
      sampleDraft({
        staffPreference: "specific",
        staffId: "b63fe9fd-5a52-46fd-8744-6dd5e22a130c",
        staffName: "Alex QA",
      }),
      "BookPilot QA Salon"
    );
    expect(text).toContain("Alex QA");
    expect(text).not.toContain("Any available specialist");
  });

  it("confirmation review card uses generic specialist label for staffPreference any", () => {
    const card = buildConfirmationCard(sampleDraft(), "tok", "BookPilot QA Salon");
    expect(card.type).toBe("confirmation_review");
    const specialistField = card.fields?.find((f) => f.label === "Specialist");
    expect(specialistField?.value).toBe("Any available specialist");
  });

  it("confirmation review card keeps named specialist when preference is specific", () => {
    const card = buildConfirmationCard(
      sampleDraft({
        staffPreference: "specific",
        staffName: "Emma QA",
        staffId: "85ca3642-7090-4f90-ae73-30f2767228a8",
      }),
      "tok",
      "BookPilot QA Salon"
    );
    expect(card.type).toBe("confirmation_review");
    const specialistField = card.fields?.find((f) => f.label === "Specialist");
    expect(specialistField?.value).toBe("Emma QA");
  });

  it("system prompt no longer hardcodes Alex QA / Emma QA recommendations", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/features/ai-receptionist/openai-provider.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/recommend Alex QA or Emma QA/);
    expect(src).toMatch(/Never invent specialist names/);
    expect(src).toMatch(
      /NEVER mention staff names in availability replies unless the customer explicitly requested/
    );
  });

  it("availability tool no longer leaks staff names via channel-gated fallback", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/features/ai-receptionist/tools.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/ctx\.channel \? null :/);
    expect(src).toMatch(/omit staff names unless the customer explicitly requested/);
  });
});
