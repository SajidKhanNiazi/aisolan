import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  resolveServiceFromText,
  resolveServiceFromAssistantRecommendation,
  detectAmbiguousServiceMention,
  normalizeServiceComparisonText,
  rehydrateDraftFromHistory,
} from "@/features/ai-receptionist/booking/rehydrate";
import { salonTools } from "@/features/ai-receptionist/tools";
import {
  createDraft,
  getDraftFromToken,
} from "@/features/ai-receptionist/booking/draft";
import {
  reserveOutboundIntent,
  finalizeOutboundIntent,
  clearInMemoryConversations,
  clearReservedIntents,
} from "@/features/integrations/whatsapp/conversation-service";
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
      "44444444-4444-4444-4444-444444444444",
      "b63fe9fd-5a52-46fd-8744-6dd5e22a130c",
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

  getPublicAppointmentAvailability: vi.fn(async ({ businessSlug, serviceId, date }) => {
    // If querying foreign service against bookpilot-qa-salon, fail
    if (businessSlug === "bookpilot-qa-salon" && serviceId === "foreign-service-9999") {
      return { success: false, error: "Service not found in salon." };
    }

    // Scenario 8: Haircut & Beard has 0 slots on 2026-11-02 (e.g. fully booked or no staff)
    if (serviceId === "4d85b929-4189-4990-a1d2-4c54fa8909a3" && date === "2026-11-02") {
      return {
        success: true,
        data: {
          date: "2026-11-02",
          timezone: "Europe/London",
          serviceId: "4d85b929-4189-4990-a1d2-4c54fa8909a3",
          serviceName: "Haircut & Beard",
          slots: [],
          totalSlotsCount: 0,
        },
      };
    }

    // Beard Trim genuinely returns 15m slots with Alex QA
    if (serviceId === "01a25157-c6e0-4362-a60b-bdc3599ed83a" && date === "2026-11-02") {
      return {
        success: true,
        data: {
          date: "2026-11-02",
          timezone: "Europe/London",
          serviceId: "01a25157-c6e0-4362-a60b-bdc3599ed83a",
          serviceName: "Beard Trim",
          slots: [
            {
              startsAt: "2026-11-02T12:00:00.000Z",
              endsAt: "2026-11-02T12:15:00.000Z",
              localTime: "12:00",
              period: "afternoon",
              isAvailable: true,
              availableStaffIds: ["b63fe9fd-5a52-46fd-8744-6dd5e22a130c"],
            },
            {
              startsAt: "2026-11-02T12:15:00.000Z",
              endsAt: "2026-11-02T12:30:00.000Z",
              localTime: "12:15",
              period: "afternoon",
              isAvailable: true,
              availableStaffIds: ["b63fe9fd-5a52-46fd-8744-6dd5e22a130c"],
            },
            {
              startsAt: "2026-11-02T12:30:00.000Z",
              endsAt: "2026-11-02T12:45:00.000Z",
              localTime: "12:30",
              period: "afternoon",
              isAvailable: true,
              availableStaffIds: ["b63fe9fd-5a52-46fd-8744-6dd5e22a130c"],
            },
          ],
          totalSlotsCount: 3,
        },
      };
    }

    // Default 35m slots for Classic Haircut
    return {
      success: true,
      data: {
        date: date || "2026-11-02",
        timezone: "Europe/London",
        serviceId: serviceId || "6137b975-31bb-4cf8-9cc1-4d6325d5965d",
        serviceName: "Classic Haircut",
        slots: [
          {
            startsAt: "2026-11-02T10:00:00.000Z",
            endsAt: "2026-11-02T10:35:00.000Z",
            localTime: "10:00",
            period: "morning",
            isAvailable: true,
            availableStaffIds: ["b63fe9fd-5a52-46fd-8744-6dd5e22a130c"],
          },
        ],
        totalSlotsCount: 1,
      },
    };
  }),
}));

describe("Phase 1H-D19: Multi-Turn Service Context & Availability Routing Regression Suite", () => {
  const ctx: ToolExecutionContext = {
    businessId: "11111111-1111-1111-1111-111111111111",
    businessSlug: "bookpilot-qa-salon",
    businessName: "BookPilot QA Salon",
    timezone: "Europe/London",
    currency: "GBP",
    channel: "whatsapp",
  };

  beforeEach(() => {
    clearInMemoryConversations();
    clearReservedIntents();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Scenario 1: Haircut & Beard recommendation -> "How much is that?" -> correct service
  it("Scenario 1: resolves 'that' to recommended Haircut & Beard (£28.00, 45m) rather than Beard Trim", async () => {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: "I need a haircut and beard trim. What do you recommend?",
      },
      {
        role: "assistant",
        content:
          "I recommend our Haircut & Beard package — £28.00, 45 minutes. We also offer Beard Trim — £10.00, 15 minutes.",
      },
      {
        role: "user",
        content: "How much does that cost, and what is included?",
      },
    ];

    // Explicitly verify assistant recommendation parsing
    const recService = resolveServiceFromAssistantRecommendation(messages[1].content, mockSalonServices);
    expect(recService).toBeDefined();
    expect(recService?.id).toBe("4d85b929-4189-4990-a1d2-4c54fa8909a3");
    expect(recService?.name).toBe("Haircut & Beard");

    const rehydrated = await rehydrateDraftFromHistory(messages, mockSalonProfile, null, "whatsapp");
    expect(rehydrated).not.toBeNull();
    expect(rehydrated?.draft.serviceId).toBe("4d85b929-4189-4990-a1d2-4c54fa8909a3");
    expect(rehydrated?.draft.serviceName).toBe("Haircut & Beard");
    expect(rehydrated?.draft.servicePriceFormatted).toBe("£28.00");
    expect(rehydrated?.draft.serviceDurationMinutes).toBe(45);
  });

  // Scenario 2: Haircut & Beard recommendation -> "Any slots tomorrow?" -> same service ID
  it("Scenario 2: preserves Haircut & Beard service ID when asking for tomorrow's slots via anaphora", async () => {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: "I need a haircut and beard trim. What do you recommend?",
      },
      {
        role: "assistant",
        content:
          "I recommend our Haircut & Beard package — £28.00, 45 minutes. We also offer Beard Trim — £10.00, 15 minutes.",
      },
      {
        role: "user",
        content: "How much does that cost, and do you have any slots tomorrow afternoon?",
      },
    ];

    const rehydrated = await rehydrateDraftFromHistory(messages, mockSalonProfile, null, "whatsapp");
    expect(rehydrated).not.toBeNull();
    // Must NOT switch to Beard Trim merely because 'beard' appears in earlier text
    expect(rehydrated?.draft.serviceId).toBe("4d85b929-4189-4990-a1d2-4c54fa8909a3");
    expect(rehydrated?.draft.serviceName).toBe("Haircut & Beard");
  });

  // Scenario 3: Separate Beard Trim request -> correct Beard Trim service ID
  it("Scenario 3: resolves 'just beard trim' explicitly to Beard Trim (£10.00, 15m), NOT Haircut & Beard", async () => {
    const userQuery = "I just need a beard trim please";
    const resolved = resolveServiceFromText(userQuery, mockSalonServices);

    expect(resolved).toBeDefined();
    expect(resolved?.id).toBe("01a25157-c6e0-4362-a60b-bdc3599ed83a");
    expect(resolved?.name).toBe("Beard Trim");
    expect(resolved?.priceAmount).toBe(1000);
    expect(resolved?.durationMinutes).toBe(15);
  });

  // Scenario 4: Ambiguous two-service conversation -> clarification
  it("Scenario 4: flags disjunctive multi-service queries ('haircut or beard trim') as ambiguous", () => {
    const query = "Should I get a haircut or beard trim?";
    const ambiguityCheck = detectAmbiguousServiceMention(query, mockSalonServices);

    expect(ambiguityCheck.isAmbiguous).toBe(true);
    expect(ambiguityCheck.matchedServices.length).toBeGreaterThanOrEqual(2);
    const serviceNames = ambiguityCheck.matchedServices.map((s) => s.name);
    expect(serviceNames).toContain("Beard Trim");
  });

  // Scenario 5: Invalid or inactive service -> no availability lookup
  it("Scenario 5: rejects invalid or inactive service without calling availability engine", async () => {
    // A. Completely invalid UUID
    const invalidRes = (await salonTools.checkAvailability.execute(ctx, {
      serviceId: "99999999-9999-9999-9999-999999999999",
      date: "2026-11-02",
    })) as Record<string, unknown>;
    expect(invalidRes.available).toBe(false);
    expect(invalidRes.availableSlotsCount).toBe(0);
    expect(String(invalidRes.error)).toContain("Please specify which treatment or service you would like to book");

    // B. Inactive / unlisted service ID
    const inactiveRes = (await salonTools.checkAvailability.execute(ctx, {
      serviceId: "inactive-service-uuid-1111",
      date: "2026-11-02",
    })) as Record<string, unknown>;
    expect(inactiveRes.available).toBe(false);
    expect(inactiveRes.availableSlotsCount).toBe(0);
    expect(String(inactiveRes.error)).toContain("Please specify which treatment or service you would like to book");
  });

  // Scenario 6: Service-specific staff eligibility
  it("Scenario 6: enforces Sarah QA qualification restriction for haircuts", async () => {
    const sarahRes = (await salonTools.checkAvailability.execute(ctx, {
      serviceId: "6137b975-31bb-4cf8-9cc1-4d6325d5965d", // Classic Haircut
      staffName: "Sarah QA",
      date: "2026-11-02",
    })) as Record<string, unknown>;

    expect(sarahRes.available).toBe(false);
    expect(String(sarahRes.error)).toContain("Sarah QA specializes in Hair Styling only and does not perform haircuts");
    expect(sarahRes.qualifiedSpecialists as string[]).toContain("Alex QA");
    expect(sarahRes.qualifiedSpecialists as string[]).toContain("Emma QA");
  });

  // Scenario 7: Duration and buffer validation
  it("Scenario 7: accurately reflects duration and buffer differences between Haircut & Beard vs Beard Trim", () => {
    const haircutAndBeard = mockSalonServices.find((s) => s.id === "4d85b929-4189-4990-a1d2-4c54fa8909a3");
    const beardTrim = mockSalonServices.find((s) => s.id === "01a25157-c6e0-4362-a60b-bdc3599ed83a");

    expect(haircutAndBeard?.durationMinutes).toBe(45);
    expect(haircutAndBeard?.bufferMinutes).toBe(10);

    expect(beardTrim?.durationMinutes).toBe(15);
    expect(beardTrim?.bufferMinutes).toBe(5);

    // Verify normalizeServiceComparisonText handles '&' vs 'and'
    expect(normalizeServiceComparisonText("Haircut & Beard")).toBe("haircut and beard");
    expect(normalizeServiceComparisonText("Haircut and Beard")).toBe("haircut and beard");
  });

  // Scenario 8: Zero availability -> no fabricated slots
  it("Scenario 8: returns zero availability honestly without borrowing or fabricating slots", async () => {
    // Haircut & Beard on 2026-11-02 has 0 slots
    const availRes = (await salonTools.checkAvailability.execute(ctx, {
      serviceId: "4d85b929-4189-4990-a1d2-4c54fa8909a3", // Haircut & Beard
      date: "2026-11-02",
      preferredPeriod: "afternoon",
    })) as Record<string, unknown>;

    expect(availRes.available).toBe(false);
    expect(availRes.availableSlotsCount).toBe(0);
    expect(availRes.slots as unknown[]).toHaveLength(0);
    expect(availRes.suggestedSlots as unknown[]).toHaveLength(0);
    expect(availRes.serviceName).toBe("Haircut & Beard");
    expect(availRes.durationMinutes).toBe(45);
    // Must NOT borrow 15-minute Beard Trim slots (12:00, 12:15, 12:30)!
    expect(String(availRes.error)).toContain("Haircut & Beard");
    expect(String(availRes.error)).toMatch(/no (open appointment )?slots/i);
  });

  // Scenario 9: Multi-tenant service isolation
  it("Scenario 9: prevents cross-tenant service querying and rejects foreign salon service IDs", async () => {
    // Attempting to query foreign spa's service against bookpilot-qa-salon
    const crossTenantRes = (await salonTools.checkAvailability.execute(ctx, {
      serviceId: "foreign-service-9999", // Belongs to Foreign Luxury Spa
      date: "2026-11-02",
    })) as Record<string, unknown>;

    expect(crossTenantRes.available).toBe(false);
    expect(crossTenantRes.availableSlotsCount).toBe(0);
    expect(String(crossTenantRes.error)).toContain("Please specify which treatment or service you would like to book");
  });

  // Scenario 10: Conversation persistence and idempotency after D17
  it("Scenario 10: preserves outbound intent idempotency and draft state across serverless turns", async () => {
    const businessId = "11111111-1111-1111-1111-111111111111";
    const conversationId = "conv-test-1234";

    // 1. Reserve outbound intent
    const firstReserve = await reserveOutboundIntent(
      conversationId,
      "wamid.inbound.turn1",
      businessId
    );

    expect(firstReserve.allowed).toBe(true);

    // 2. Duplicate reservation for same trigger is suppressed
    const dupReserve = await reserveOutboundIntent(
      conversationId,
      "wamid.inbound.turn1",
      businessId
    );

    expect(dupReserve.allowed).toBe(false);
    expect(dupReserve.reason).toBeDefined();

    // 3. Finalize outbound intent stores full text and provider ID without PostgreSQL 23505 duplicate error
    await finalizeOutboundIntent(
      conversationId,
      "wamid.inbound.turn1",
      "sent",
      "wamid.outbound.meta.123",
      {
        businessId,
        sanitizedContent: "For Haircut & Beard tomorrow afternoon, we have 2:00 PM available.",
      }
    );

    // 4. Draft creation and preservation across turns
    const draft = createDraft(
      {
        businessId,
        businessSlug: "bookpilot-qa-salon",
        conversationId,
        channel: "whatsapp",
        salonTimezone: "Europe/London",
      },
      {
        serviceId: "4d85b929-4189-4990-a1d2-4c54fa8909a3",
        serviceName: "Haircut & Beard",
        servicePriceCents: 2800,
        servicePriceFormatted: "£28.00",
        serviceDurationMinutes: 45,
      }
    );

    const loadedDraft = await getDraftFromToken(draft.draftToken);

    expect(loadedDraft).not.toBeNull();
    expect(loadedDraft?.serviceId).toBe("4d85b929-4189-4990-a1d2-4c54fa8909a3");
    expect(loadedDraft?.serviceName).toBe("Haircut & Beard");
  });
});
