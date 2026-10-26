"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  AlertCircle,
  Bot,
  User,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type {
  PublicAiConfig,
  ChatMessage,
  BookingIntentHandoff,
} from "@/features/ai-receptionist/types";
import type { ConversationalCard } from "@/features/ai-receptionist/booking/adapter";
import type { BookingConfirmationOutcome } from "@/features/ai-receptionist/booking/types";

interface CustomerChatProps {
  businessSlug: string;
  salonName: string;
  aiConfig: PublicAiConfig;
  onBookingHandoff?: (handoff: BookingIntentHandoff) => void;
}

/**
 * Safe inline markdown tokenizer.
 * Renders bold text (**bold**) as <strong> elements and keeps other text safe from XSS.
 * Never uses dangerouslySetInnerHTML.
 */
export function SafeInlineText({
  text,
  isAssistant,
}: {
  text: string;
  isAssistant: boolean;
}) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          const boldContent = part.slice(2, -2);
          return (
            <strong
              key={i}
              className={
                isAssistant
                  ? "font-semibold text-zinc-900 dark:text-zinc-50"
                  : "font-semibold text-white"
              }
            >
              {boldContent}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Safe chat message content renderer.
 * Formats paragraphs, bullet lists (•, -, *), and bold text safely into React elements.
 */
export function SafeChatMessageContent({
  content,
  isAssistant,
}: {
  content: string;
  isAssistant: boolean;
}) {
  if (!content) return null;

  // Split into paragraphs by double newlines
  const paragraphs = content.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, pIdx) => {
        const lines = paragraph.split(/\n/);
        const isBulletList =
          lines.length > 0 &&
          lines.every((line) => /^\s*[•\-\*]\s+/.test(line.trim()));

        if (isBulletList) {
          return (
            <ul key={pIdx} className="space-y-1 my-1 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^\s*[•\-\*]\s+/, "");
                return (
                  <li key={lIdx} className="flex items-start gap-1.5">
                    <span
                      className={`select-none shrink-0 text-xs mt-0.5 ${
                        isAssistant
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-blue-200"
                      }`}
                    >
                      •
                    </span>
                    <span>
                      <SafeInlineText text={cleanLine} isAssistant={isAssistant} />
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {lIdx > 0 && <br />}
                <SafeInlineText text={line} isAssistant={isAssistant} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function CustomerChat({
  businessSlug,
  salonName,
  aiConfig,
  onBookingHandoff,
}: CustomerChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content:
        aiConfig.welcomeMessage ||
        `Hello! Welcome to ${salonName}. I'm your AI Virtual Receptionist. How can I assist you with services, prices, or finding a booking slot today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<ConversationalCard | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestedPrompts = [
    "How much is a haircut?",
    "Are you open tomorrow?",
    "Who is available this week?",
    "I need a haircut tomorrow at 10.",
  ];

  // Focus input and scroll to bottom on open, new message, or card update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, activeCard]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading || isConfirming) return;

    setError(null);
    setInput("");

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/businesses/${businessSlug}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          draftToken: draftToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to get response from AI Receptionist.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.message ||
              "I'm having trouble retrieving that information right now. Please feel free to use our booking wizard above directly!",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
        },
      ]);

      if (data.draftToken) {
        setDraftToken(data.draftToken);
      }

      if (data.card) {
        setActiveCard(data.card);
      } else if (text.toLowerCase().includes("cancel")) {
        setActiveCard(null);
      }

      if (data.bookingHandoff?.hasIntent && onBookingHandoff) {
        onBookingHandoff(data.bookingHandoff);
      }
    } catch {
      setError("Network connection issue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!activeCard?.draftId || !activeCard?.draftToken || isConfirming) return;

    setIsConfirming(true);
    setError(null);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `confirm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch(`/api/businesses/${businessSlug}/ai-chat/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: activeCard.draftId,
          draftToken: activeCard.draftToken,
          idempotencyKey,
        }),
      });

      const outcome: BookingConfirmationOutcome = await res.json();

      if (!res.ok || !outcome.success) {
        setError(outcome.error || "Booking confirmation could not be finalized.");
        return;
      }

      // Success! Update active card to success view
      setActiveCard({
        type: "success",
        title: "Booking Confirmed!",
        subtitle: `Your appointment reference is ${outcome.bookingReference || "confirmed"}.`,
        fields: [
          { label: "Reference", value: outcome.bookingReference || "" },
          { label: "Salon", value: outcome.salonName || salonName },
          { label: "Service", value: outcome.serviceName || "" },
          { label: "Specialist", value: outcome.staffName || "Specialist" },
          { label: "When", value: outcome.startsAtLocal || "" },
          { label: "Price", value: outcome.priceFormatted || "" },
          ...(outcome.emailQueued
            ? [{ label: "Email Confirmation", value: "Sent to your inbox" }]
            : []),
        ],
        actions: outcome.managementUrl
          ? [
              {
                id: "manage-booking-btn",
                label: "Manage Booking",
                type: "confirm",
                payload: { url: outcome.managementUrl },
              },
            ]
          : [],
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🎉 Your booking is confirmed! Your reference code is **${outcome.bookingReference}**. We look forward to seeing you at ${salonName}!`,
        },
      ]);

      setDraftToken(null);
    } catch {
      setError("Network error while confirming your booking. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!aiConfig.enabled && aiConfig.mode === "disabled") {
    return null;
  }

  return (
    <aside
      aria-label="AI Receptionist Assistant"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 max-w-[calc(100vw-2rem)]"
    >
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Chat with AI Receptionist"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <span>AI Receptionist</span>
        </button>
      )}

      {/* Slide-over / Modal Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`AI Receptionist for ${salonName}`}
          className="w-full sm:w-[420px] h-[580px] max-h-[88vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 text-blue-100" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate leading-tight">
                  {salonName} AI Receptionist
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-zinc-400 leading-none">
                    {aiConfig.mode === "mock" ? "Instant Assistant (Mock)" : "Online"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:outline-hidden"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
            {messages.map((m, idx) => {
              const isAssistant = m.role === "assistant";
              return (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${isAssistant ? "justify-start" : "justify-end"}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-900">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed break-words ${
                      isAssistant
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-tl-sm border border-zinc-200/60 dark:border-zinc-700/60"
                        : "bg-blue-600 text-white rounded-tr-sm shadow-xs"
                    }`}
                  >
                    <SafeChatMessageContent content={m.content} isAssistant={isAssistant} />
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Active Card: Confirmation Review */}
            {activeCard?.type === "confirmation_review" && (
              <div
                id="booking-review-card"
                className="my-3 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs space-y-3"
              >
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100 font-semibold text-xs sm:text-sm">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{activeCard.title}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-zinc-850 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80">
                  {activeCard.fields?.map((f, i) => (
                    <div key={i} className="space-y-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                        {f.label}
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    id="confirm-booking-btn"
                    onClick={handleConfirmBooking}
                    disabled={isConfirming || isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-xs"
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Booking</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="edit-details-btn"
                    onClick={() => handleSendMessage("I want to edit my booking details.")}
                    disabled={isConfirming || isLoading}
                    className="py-2 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors border border-zinc-200 dark:border-zinc-700"
                  >
                    Edit Details
                  </button>

                  <button
                    type="button"
                    id="cancel-draft-btn"
                    onClick={() => handleSendMessage("Cancel my booking draft")}
                    disabled={isConfirming || isLoading}
                    className="py-2 px-3 rounded-lg bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium text-xs transition-colors border border-zinc-200 dark:border-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Active Card: Confirmed Success */}
            {activeCard?.type === "success" && (
              <div
                id="booking-success-card"
                className="my-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs space-y-3"
              >
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{activeCard.title}</span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  {activeCard.subtitle}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-zinc-850 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80">
                  {activeCard.fields?.map((f, i) => (
                    <div key={i} className="space-y-0.5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                        {f.label}
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>

                {Boolean(activeCard.actions?.[0]?.payload?.url) && (
                  <a
                    id="manage-booking-link"
                    href={String(activeCard.actions?.[0]?.payload?.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors"
                  >
                    <span>Manage My Appointment</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 px-3.5 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800 font-medium hover:bg-rose-50 text-[11px]"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (visible when few messages) */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading || isConfirming}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about prices, services, or bookings..."
                disabled={isLoading || isConfirming}
                maxLength={500}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                aria-label="Message input"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading || isConfirming}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
