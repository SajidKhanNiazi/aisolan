import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  rehydrateDraftFromHistory,
} from "@/features/ai-receptionist/booking/rehydrate";
import { salonTools } from "@/features/ai-receptionist/tools";
import { isAiBookingWritesEnabled } from "@/features/ai-receptionist/booking/confirm";
import { isWhatsAppBookingWritesEnabled } from "@/features/integrations/whatsapp/config";
import type { ToolExecutionContext, ChatMessage } from "@/features/ai-receptionist/types";
import type { PublicSalonProfile, PublicService } from "@/features/public-booking/types";

// Authoritative Salon Catalog for testing conforming strictly to PublicService
const mockSalonServices: PublicService[] = [
  {
    id: "4d85b929-4189-4990-a1d2-4c54fa8909a3",
    name: "Haircut & Beard",
    description: "Full haircut and beard sculpt.",
    priceAmount: 2800,
    currency: "GBP",
    durationMinutes: 45,
    bufferMinutes: 10,
    assignedStaffIds: ["b63fe9fd-5a52-46fd-8744-6dd5e22a130c"], // Alex QA
  },
  {
    id: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
    name: "Classic Haircut",
    description: "Classic styling.",
    priceAmount: 2450,
    currency: "GBP",
    durationMinutes: 35,
    bufferMinutes: 5,
    assignedStaffIds: [
      "44444444-4444-4444-4444-444444444444", // Emma QA
      "b63fe9fd-5a52-46fd-8744-6dd5e22a130c", // Alex QA
    ],
  },
  {
    id: "01a25157-c6e0-4362-a60b-bdc3599ed83a",
    name: "Beard Trim",
    description: "Tidy beard trim.",
    priceAmount: 1000,
    currency: "GBP",
    durationMinutes: 15,
    bufferMinutes: 5,
    assignedStaffIds: ["b63fe9fd-5a52-46fd-8744-6dd5e22a130c"], // Alex QA
  },
  {
    id: "f8e3ea70-0aa1-4018-8f55-195feac2fb2d",
    name: "Hair Styling",
    description: "Blowdry and styling.",
    priceAmount: 1500,
    currency: "GBP",
    durationMinutes: 30,
    bufferMinutes: 5,
    assignedStaffIds: ["66666666-6666-6666-6666-666666666666"], // Sarah QA
  },
  {
    id: "unassigned-service-uuid-1234",
    name: "Deluxe Hot Towel Treatment",
    description: "No staff assigned yet.",
    priceAmount: 3500,
    currency: "GBP",
    durationMinutes: 30,
    bufferMinutes: 5,
    assignedStaffIds: [], // 0 staff assigned!
  },
];

const mockSalonProfile: PublicSalonProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "BookPilot QA Salon",
  slug: "bookpilot-qa-salon",
  businessType: "salon",
  description: "Authoritative grooming salon.",
  logoUrl: null,
  phone: "+44 20 7946 0123",
  email: "qa@bookzello.com",
  website: null,
  addressLine1: "45 Oxford Street",
  addressLine2: null,
  city: "London",
  postalCode: "W1D 2DZ",
  country: "GB",
  timezone: "Europe/London",
  currency: "GBP",
  onlineBookingEnabled: true,
  cancellationPolicyText: "Free cancellation up to 24 hours prior.",
  cancellationNoticeHours: 24,
  minNoticeHours: 2,
  maxAdvanceDays: 30,
  openingHours: [
    { dayOfWeek: 1, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 2, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 3, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 4, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 5, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 6, isClosed: false, openTime: "09:00:00", closeTime: "18:00:00" },
    { dayOfWeek: 0, isClosed: true, openTime: null, closeTime: null },
  ],
  services: mockSalonServices,
  staff: [
    {
      id: "b63fe9fd-5a52-46fd-8744-6dd5e22a130c",
      displayName: "Alex QA",
      displayOrder: 1,
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      displayName: "Emma QA",
      displayOrder: 2,
    },
    {
      id: "66666666-6666-6666-6666-666666666666",
      displayName: "Sarah QA",
      displayOrder: 3,
    },
  ],
};

const mockForeignSalonProfile: PublicSalonProfile = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Foreign Luxury Spa",
  slug: "foreign-spa",
  businessType: "spa",
  description: "Independent spa.",
  logoUrl: null,
  phone: "+44 20 7946 0999",
  email: "spa@example.com",
  website: null,
  addressLine1: "10 Kensington High St",
  addressLine2: null,
  city: "London",
  postalCode: "W8 4PF",
  country: "GB",
  timezone: "Europe/London",
  currency: "GBP",
  onlineBookingEnabled: true,
  cancellationPolicyText: "24h cancellation.",
  cancellationNoticeHours: 24,
  minNoticeHours: 2,
  maxAdvanceDays: 30,
  openingHours: [],
  services: [
    {
      id: "foreign-service-9999",
      name: "Deluxe Hot Stone Massage",
      description: null,
      priceAmount: 7500,
      currency: "GBP",
      durationMinutes: 75,
      bufferMinutes: 15,
      assignedStaffIds: ["foreign-staff-8888"],
    },
  ],
  staff: [
    {
      id: "foreign-staff-8888",
      displayName: "Elena Spa",
      displayOrder: 1,
    },
  ],
};

// Mock public booking server
vi.mock("@/features/public-booking/server", () => ({
  getPublicSalonProfile: vi.fn(async (slug: string) => {
    if (slug === "bookpilot-qa-salon") {
      return { success: true, data: mockSalonProfile };
    }
    if (slug === "foreign-spa") {
      return { success: true, data: mockForeignSalonProfile };
    }
    return { success: false, error: "Salon not found." };
  }),

  getPublicAppointmentAvailability: vi.fn(async ({ businessSlug, serviceId, staffId, staffPreference, date }) => {
    if (businessSlug === "bookpilot-qa-salon" && serviceId === "foreign-service-9999") {
      return { success: false, error: "Service not found in salon." };
    }

    // Zero eligible staff case
    if (serviceId === "unassigned-service-uuid-1234") {
      return {
        success: true,
        data: {
          date: date || "2026-11-03",
          timezone: "Europe/London",
          serviceId,
          serviceName: "Deluxe Hot Towel Treatment",
          slots: [],
          totalSlotsCount: 0,
        },
      };
    }

    // Classic Haircut: Alex QA has 10:00 & 11:00; Emma QA has 10:00 & 12:00
    if (serviceId === "6137b975-31bb-4cf8-9cc1-4d6325d5965d") {
      const alexStaffId = "b63fe9fd-5a52-46fd-8744-6dd5e22a130c";
      const emmaStaffId = "44444444-4444-4444-4444-444444444444";

      if (staffPreference === "specific" && staffId === emmaStaffId) {
        return {
          success: true,
          data: {
            date: date || "2026-11-03",
            timezone: "Europe/London",
            serviceId,
            serviceName: "Classic Haircut",
            slots: [
              {
                startsAt: "2026-11-03T10:00:00.000Z",
                localTime: "10:00",
                period: "morning",
                isAvailable: true,
                availableStaffIds: [emmaStaffId],
              },
              {
                startsAt: "2026-11-03T12:00:00.000Z",
                localTime: "12:00",
                period: "afternoon",
                isAvailable: true,
                availableStaffIds: [emmaStaffId],
              },
            ],
            totalSlotsCount: 2,
          },
        };
      }

      if (staffPreference === "specific" && staffId === alexStaffId) {
        return {
          success: true,
          data: {
            date: date || "2026-11-03",
            timezone: "Europe/London",
            serviceId,
            serviceName: "Classic Haircut",
            slots: [
              {
                startsAt: "2026-11-03T10:00:00.000Z",
                localTime: "10:00",
                period: "morning",
                isAvailable: true,
                availableStaffIds: [alexStaffId],
              },
              {
                startsAt: "2026-11-03T11:00:00.000Z",
                localTime: "11:00",
                period: "morning",
                isAvailable: true,
                availableStaffIds: [alexStaffId],
              },
            ],
            totalSlotsCount: 2,
          },
        };
      }

      // Default "any": combined and deduplicated union (10:00 has both, 11:00 has Alex, 12:00 has Emma)
      return {
        success: true,
        data: {
          date: date || "2026-11-03",
          timezone: "Europe/London",
          serviceId,
          serviceName: "Classic Haircut",
          slots: [
            {
              startsAt: "2026-11-03T10:00:00.000Z",
              localTime: "10:00",
              period: "morning",
              isAvailable: true,
              availableStaffIds: [alexStaffId, emmaStaffId],
            },
            {
              startsAt: "2026-11-03T11:00:00.000Z",
              localTime: "11:00",
              period: "morning",
              isAvailable: true,
              availableStaffIds: [alexStaffId],
            },
            {
              startsAt: "2026-11-03T12:00:00.000Z",
              localTime: "12:00",
              period: "afternoon",
              isAvailable: true,
              availableStaffIds: [emmaStaffId],
            },
          ],
          totalSlotsCount: 3,
        },
      };
    }

    // Default 0 slots for empty queries
    return {
      success: true,
      data: {
        date: date || "2026-11-03",
        timezone: "Europe/London",
        serviceId,
        serviceName: "Unknown",
        slots: [],
        totalSlotsCount: 0,
      },
    };
  }),
}));

describe("Phase 1H-D21: Universal Service-First, Time-First AI Booking Suite", () => {
  const whatsappCtx: ToolExecutionContext = {
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    businessName: "BookPilot QA Salon",
    timezone: "Europe/London",
    currency: "GBP",
    channel: "whatsapp",
  };

  const embeddedCtx: ToolExecutionContext = {
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    businessName: "BookPilot QA Salon",
    timezone: "Europe/London",
    currency: "GBP",
    channel: "embedded_web",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Any qualified staff returns combined, deduplicated time slots
  it("Test 1: combines and deduplicates slots across multiple eligible staff members", async () => {
    const res = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d", // Classic Haircut
      date: "2026-11-03",
    })) as Record<string, unknown>;

    expect(res.available).toBe(true);
    expect(res.availableSlotsCount).toBe(3);
    expect(res.staffPreference).toBe("any");

    const suggested = res.suggestedSlots as Array<{ time: string; period: string }>;
    expect(suggested).toHaveLength(3);
    const times = suggested.map((s) => s.time);
    expect(times).toEqual(["10:00", "11:00", "12:00"]);
  });

  // Test 2: Staff names are hidden by default
  it("Test 2: hides staff names by default when customer did not request a specialist", async () => {
    const res = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    const suggested = res.suggestedSlots as Array<{ time: string; staffName?: string }>;
    for (const slot of suggested) {
      expect(slot.staffName).toBeUndefined();
    }
    expect(res.staffName).toBeUndefined();
  });

  // Test 3: Explicit named-staff request is respected
  it("Test 3: respects explicit named-staff request and displays staffName only when requested", async () => {
    const res = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      staffName: "Emma QA",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    expect(res.available).toBe(true);
    expect(res.staffPreference).toBe("specific");
    expect(res.staffName).toBe("Emma QA");

    const suggested = res.suggestedSlots as Array<{ time: string; staffName?: string }>;
    expect(suggested).toHaveLength(2);
    // Only Emma QA's slots (10:00 and 12:00; Alex QA's 11:00 slot is filtered out)
    const times = suggested.map((s) => s.time);
    expect(times).toEqual(["10:00", "12:00"]);
    for (const slot of suggested) {
      expect(slot.staffName).toBe("Emma QA");
    }
  });

  // Test 4: Zero eligible staff returns zero bookable slots
  it("Test 4: returns zero bookable slots and surfaces setup warning when no staff are assigned", async () => {
    const res = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "unassigned-service-uuid-1234",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    expect(res.available).toBe(false);
    expect(res.availableSlotsCount).toBe(0);
    expect(res.isStaffConfigMissing).toBe(true);
    expect(String(res.error)).toContain("not available for online booking as no specialists are assigned");
    expect(String(res.error)).toContain("Setup warning: Salon owner must assign qualified staff");
  });

  // Test 5: No fabricated slots
  it("Test 5: never invents or fabricates slots when engine returns zero availability", async () => {
    const res = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "4d85b929-4189-4990-a1d2-4c54fa8909a3", // Haircut & Beard (0 slots)
      date: "2026-11-03",
    })) as Record<string, unknown>;

    expect(res.available).toBe(false);
    expect(res.availableSlotsCount).toBe(0);
    expect(res.slots).toEqual([]);
    expect(res.suggestedSlots).toEqual([]);
  });

  // Test 6: Correct selected service across multiple turns (D19 preservation)
  it("Test 6: preserves compound service across multi-turn anaphora and does not degrade to Beard Trim", async () => {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: "I need a haircut and beard trim. What do you recommend?",
      },
      {
        role: "assistant",
        content:
          "I recommend our Haircut & Beard service for £28.00 (45 minutes). We also offer Beard Trim for £10.00 (15 minutes).",
      },
      {
        role: "user",
        content: "How much is that and what times are free tomorrow?",
      },
    ];

    const rehydrated = await rehydrateDraftFromHistory(messages, mockSalonProfile, null, "whatsapp");
    expect(rehydrated).not.toBeNull();
    expect(rehydrated?.draft.serviceId).toBe("4d85b929-4189-4990-a1d2-4c54fa8909a3");
    expect(rehydrated?.draft.serviceName).toBe("Haircut & Beard");
    expect(rehydrated?.draft.serviceDurationMinutes).toBe(45);
  });

  // Test 7: Staff qualification and duration enforcement
  it("Test 7: enforces Sarah QA styling-only qualification restriction on haircuts", async () => {
    const sarahRes = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d", // Classic Haircut
      staffName: "Sarah QA",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    expect(sarahRes.available).toBe(false);
    expect(String(sarahRes.error)).toContain("Sarah QA specializes in Hair Styling only and does not perform haircuts");
  });

  // Test 8: Multi-tenant isolation
  it("Test 8: prevents querying services belonging to foreign salons", async () => {
    const crossTenantRes = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "foreign-service-9999",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    expect(crossTenantRes.available).toBe(false);
    expect(String(crossTenantRes.error)).toContain("Please specify which treatment or service you would like to book");
  });

  // Test 9: Staff IDs are not exposed in customer-facing messages
  it("Test 9: strictly suppresses internal staff UUIDs from customer-facing suggestedSlots", async () => {
    const res = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    const suggested = res.suggestedSlots as Array<Record<string, unknown>>;
    for (const slot of suggested) {
      expect(slot.availableStaffIds).toBeUndefined();
      expect(slot.staffId).toBeUndefined();
    }
  });

  // Test 10: Booking writes remain disabled for WhatsApp
  it("Test 10: keeps pilot booking writes strictly disabled (isAiBookingWritesEnabled = false)", () => {
    expect(isAiBookingWritesEnabled()).toBe(false);
    expect(isWhatsAppBookingWritesEnabled()).toBe(false);
    expect(process.env.WHATSAPP_BOOKING_WRITES_ENABLED === "true").toBe(false);
  });

  // Test 11: Service-first draft initialization defaults to staffPreference 'any'
  it("Test 11: prepareBookingDraft defaults to staffPreference 'any' when staff is not requested", async () => {
    const draftRes = (await salonTools.prepareBookingDraft.execute(whatsappCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      date: "2026-11-03",
      time: "10:00",
    })) as Record<string, unknown>;

    expect(draftRes.success).toBe(true);
    const draft = draftRes.draft as { staffPreference: string; staffId: string | null; staffName: string };
    expect(draft.staffPreference).toBe("any");
    expect(draft.staffId).toBeUndefined();
    expect(draft.staffName).toBe("Any Specialist");
  });

  // Test 12: Embedded chatbot and WhatsApp have consistent availability results
  it("Test 12: provides identical service-first availability across WhatsApp and Embedded Chatbot", async () => {
    const waRes = (await salonTools.checkAvailability.execute(whatsappCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    const webRes = (await salonTools.checkAvailability.execute(embeddedCtx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
      date: "2026-11-03",
    })) as Record<string, unknown>;

    expect(waRes.available).toBe(webRes.available);
    expect(waRes.availableSlotsCount).toBe(webRes.availableSlotsCount);
    expect(waRes.suggestedSlots).toEqual(webRes.suggestedSlots);
  });
});
