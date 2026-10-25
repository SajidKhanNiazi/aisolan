import { salonTools } from "./tools";
import type {
  ChatMessage,
  AiChatResponse,
  ToolExecutionContext,
  BookingIntentHandoff,
  SalonFaqItem,
} from "./types";

/**
 * Deterministic mock provider that runs without any external API keys or network latency.
 * Grounds all responses strictly in real salon data retrieved via read-only tools.
 */
export async function executeMockChat(
  ctx: ToolExecutionContext,
  messages: ChatMessage[],
  faqs: SalonFaqItem[] = []
): Promise<AiChatResponse> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const query = (lastUserMsg?.content || "").trim();
  const lower = query.toLowerCase();

  const toolsUsed: string[] = [];
  let bookingHandoff: BookingIntentHandoff | null = null;

  // 1. Prompt Injection / System Exposure Guard
  if (
    lower.includes("ignore previous instructions") ||
    lower.includes("system prompt") ||
    lower.includes("reveal your instructions") ||
    lower.includes("show me your prompt") ||
    lower.includes("who programmed you") ||
    lower.includes("override your rules")
  ) {
    return {
      success: true,
      message: `I am the virtual receptionist for ${ctx.businessName}. I am here to help you explore our services, check specialist availability, and schedule your appointment! How may I assist you with your booking today?`,
      toolsUsed: [],
      mode: "mock",
    };
  }

  // 2. Custom Salon FAQs check
  for (const faq of faqs) {
    const qLower = faq.question.toLowerCase();
    const words = qLower.split(/\s+/).filter((w) => w.length > 3);
    const matches = words.filter((w) => lower.includes(w));
    if (matches.length >= Math.min(2, words.length)) {
      return {
        success: true,
        message: faq.answer,
        toolsUsed: ["faqLookup"],
        mode: "mock",
      };
    }
  }

  // 3. Greeting / Salon Intro (English & Urdu/Roman Urdu)
  if (
    /^(hi|hello|hey|greetings|good (morning|afternoon|evening)|salam|assalam|aoa|slam)\b/i.test(
      query
    ) ||
    lower === "hi" ||
    lower === "hello"
  ) {
    toolsUsed.push("getSalonInfo");
    const info = (await salonTools.getSalonInfo.execute(ctx, {})) as Record<string, string>;
    const desc = info.description ? ` ${info.description}` : "";
    return {
      success: true,
      message: `Welcome to ${ctx.businessName}!${desc} We're delighted to assist you. You can ask me about our services, pricing, opening hours, or check specialist availability. How can I help you today?`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 4. Booking Intent Detection (English & Roman Urdu)
  const isBookingQuery =
    /\b(book|booking|reserve|reservation|appointment|schedule|chahiye|karni hai|book karna)\b/i.test(
      lower
    );

  if (isBookingQuery && (lower.includes("want to book") || lower.includes("like to book") || lower.includes("appointment chahiye") || lower.includes("book an appointment") || lower.includes("book a haircut") || lower.includes("book a service"))) {
    toolsUsed.push("listServices");
    const servicesResult = (await salonTools.listServices.execute(ctx, {})) as {
      currency: string;
      services: Array<{ id: string; name: string; priceFormatted: string }>;
    };

    // Detect if a specific service was mentioned in query
    let matchedService: { id: string; name: string } | undefined;
    if (servicesResult.services) {
      matchedService = servicesResult.services.find((s) =>
        lower.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().split(/\s+/).some((word) => word.length > 4 && lower.includes(word))
      );
    }

    bookingHandoff = {
      hasIntent: true,
      serviceId: matchedService?.id,
      serviceName: matchedService?.name,
    };

    if (matchedService) {
      return {
        success: true,
        message: `I'd love to help you book our **${matchedService.name}**! You can select your preferred specialist and time right here in the booking wizard, or let me know your preferred day to check live openings.`,
        bookingHandoff,
        toolsUsed,
        mode: "mock",
      };
    }

    return {
      success: true,
      message: `I can certainly help you book an appointment at ${ctx.businessName}! Please choose your desired service in the booking wizard below or let me know what treatment you're looking for.`,
      bookingHandoff,
      toolsUsed,
      mode: "mock",
    };
  }

  // 5. Pricing and Services (English & Roman Urdu)
  if (
    lower.includes("price") ||
    lower.includes("rate") ||
    lower.includes("cost") ||
    lower.includes("how much") ||
    lower.includes("menu") ||
    lower.includes("services") ||
    lower.includes("haircut") ||
    lower.includes("kya rate") ||
    lower.includes("kitne ka")
  ) {
    toolsUsed.push("listServices");
    const res = (await salonTools.listServices.execute(ctx, {})) as {
      currency: string;
      services: Array<{
        name: string;
        priceFormatted: string;
        durationMinutes: number;
        category?: string;
      }>;
    };

    if (!res.services || res.services.length === 0) {
      return {
        success: true,
        message: `We currently have no services listed online. Please contact ${ctx.businessName} directly.`,
        toolsUsed,
        mode: "mock",
      };
    }

    // Check if user asked about a specific service
    const specific = res.services.find((s) =>
      lower.includes(s.name.toLowerCase())
    );

    if (specific) {
      return {
        success: true,
        message: `Our **${specific.name}** is **${specific.priceFormatted}** (duration: ${specific.durationMinutes} mins). Would you like to check available slots for this service?`,
        bookingHandoff: {
          hasIntent: false,
          serviceName: specific.name,
        },
        toolsUsed,
        mode: "mock",
      };
    }

    const serviceList = res.services
      .map(
        (s) =>
          `• **${s.name}** — ${s.priceFormatted} (${s.durationMinutes} mins)`
      )
      .join("\n");

    return {
      success: true,
      message: `Here are the active services at ${ctx.businessName}:\n\n${serviceList}\n\nWould you like to book one of these treatments?`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 6. Availability and Slots Checking
  if (
    lower.includes("available") ||
    lower.includes("availability") ||
    lower.includes("slot") ||
    lower.includes("openings") ||
    lower.includes("free") ||
    lower.includes("friday") ||
    lower.includes("saturday") ||
    lower.includes("sunday") ||
    lower.includes("tomorrow") ||
    lower.includes("today")
  ) {
    toolsUsed.push("checkAvailability");

    // Calculate a target date from the prompt
    const targetDate = new Date();
    if (lower.includes("tomorrow") || lower.includes("kal")) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes("friday")) {
      const day = targetDate.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + diff);
    } else {
      // Default to tomorrow for safe horizon
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const dateStr = targetDate.toISOString().split("T")[0];

    const avail = (await salonTools.checkAvailability.execute(ctx, {
      date: dateStr,
    })) as {
      available: boolean;
      serviceName?: string;
      suggestedSlots?: Array<{ time: string; staffName: string }>;
      error?: string;
    };

    if (avail.available && avail.suggestedSlots && avail.suggestedSlots.length > 0) {
      const slotStrings = avail.suggestedSlots
        .slice(0, 4)
        .map((s) => `• ${s.time} with ${s.staffName}`)
        .join("\n");

      return {
        success: true,
        message: `Yes, we have verified openings for **${avail.serviceName || "appointments"}** on **${dateStr}**:\n\n${slotStrings}\n\nWould you like to reserve one of these times in the booking wizard?`,
        bookingHandoff: {
          hasIntent: true,
          date: dateStr,
          serviceName: avail.serviceName,
        },
        toolsUsed,
        mode: "mock",
      };
    }

    return {
      success: true,
      message: `I checked our live schedule for **${dateStr}**, but no open appointment slots were found matching that criteria. Would you like to check another day?`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 7. Staff & Specialists
  if (
    lower.includes("staff") ||
    lower.includes("stylist") ||
    lower.includes("barber") ||
    lower.includes("specialist") ||
    lower.includes("team") ||
    lower.includes("who works")
  ) {
    toolsUsed.push("listStaff");
    const staffRes = (await salonTools.listStaff.execute(ctx, {})) as {
      staff: Array<{ name: string; role: string }>;
    };

    if (!staffRes.staff || staffRes.staff.length === 0) {
      return {
        success: true,
        message: `Our specialists are ready to welcome you! You can select 'Any Available Specialist' when booking online.`,
        toolsUsed,
        mode: "mock",
      };
    }

    const staffList = staffRes.staff
      .map((st) => `• **${st.name}** (${st.role})`)
      .join("\n");

    return {
      success: true,
      message: `Here are our team members at ${ctx.businessName}:\n\n${staffList}\n\nYou can request any specialist specifically when making a booking.`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 8. Opening Hours & Location
  if (
    lower.includes("hour") ||
    lower.includes("open") ||
    lower.includes("close") ||
    lower.includes("timing") ||
    lower.includes("address") ||
    lower.includes("location") ||
    lower.includes("where are you") ||
    lower.includes("kahan")
  ) {
    toolsUsed.push("getOpeningHours");
    toolsUsed.push("getSalonInfo");

    const [hoursRes, infoRes] = await Promise.all([
      salonTools.getOpeningHours.execute(ctx, {}) as Promise<{
        timezone: string;
        openingHours: Array<{ day: string; isClosed: boolean; openTime: string; closeTime: string }>;
      }>,
      salonTools.getSalonInfo.execute(ctx, {}) as Promise<{ address: string; phone: string }>,
    ]);

    const activeDays = hoursRes.openingHours
      .map((h) =>
        h.isClosed ? `• ${h.day}: Closed` : `• ${h.day}: ${h.openTime} – ${h.closeTime}`
      )
      .join("\n");

    const addressText = infoRes.address ? `\n\n📍 **Location**: ${infoRes.address}` : "";

    return {
      success: true,
      message: `Here are the regular hours for ${ctx.businessName} (${hoursRes.timezone}):\n\n${activeDays}${addressText}`,
      toolsUsed,
      mode: "mock",
    };
  }

  // 9. Graceful unsupported fallback
  return {
    success: true,
    message: `I can help you with services, prices, specialist availability, salon hours, and booking appointments at ${ctx.businessName}. Please feel free to ask about our treatments or when you'd like to visit!`,
    toolsUsed: [],
    mode: "mock",
  };
}
