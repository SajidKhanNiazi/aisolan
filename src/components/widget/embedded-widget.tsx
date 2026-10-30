"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Phone,
  Mail,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PublicSalonProfile, PublicService, PublicSlot } from "@/features/public-booking/types";
import type { PublicAiConfig } from "@/features/ai-receptionist/types";
import type { BookingDraft } from "@/features/ai-receptionist/booking/types";
import { getPublicAppointmentAvailability, createPublicBooking } from "@/features/public-booking/server";

interface Message {
  id: string;
  sender: "customer" | "ai";
  text: string;
  timestamp: string;
  draft?: BookingDraft;
  suggestedSlots?: Array<{ time: string; period?: string; staffName?: string }>;
}

interface EmbeddedWidgetProps {
  salon: PublicSalonProfile;
  aiConfig: PublicAiConfig | null;
}

export function EmbeddedWidget({ salon, aiConfig }: EmbeddedWidgetProps) {
  // Navigation / Phase
  const [activeView, setActiveView] = useState<"chat" | "checkout" | "success">("chat");

  // Chat State
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "msg-welcome",
      sender: "ai",
      text:
        aiConfig?.welcomeMessage ||
        `Hello! Welcome to ${salon.name}. I'm your AI virtual receptionist. Ask me about our treatments, prices, or book an appointment directly here!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<BookingDraft | null>(null);

  // Inline Booking Form / Confirmation State
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [revalidatingSlot, setRevalidatingSlot] = useState(false);
  const [revalidationConflict, setRevalidationConflict] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    bookingReference: string;
    startsAt: string;
    serviceName: string;
    staffName: string | null;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (activeView === "chat") {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAiLoading, activeView]);

  // Handle postMessage to parent host
  const handleClose = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "bookzello:close" }, "*");
    }
  };

  const handleReset = () => {
    setDraftToken(null);
    setActiveDraft(null);
    setActiveView("chat");
    setBookingResult(null);
    setBookingError(null);
    setRevalidationConflict(null);
    const welcomeText =
      aiConfig?.welcomeMessage ||
      `Hello! Welcome to ${salon.name}. How can I assist you with treatments, specialists, or appointment bookings today?`;
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: "ai",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Send message to AI Receptionist
  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isAiLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "customer",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsAiLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "msg-welcome")
        .map((m) => ({
          role: m.sender === "customer" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));

      history.push({ role: "user", content: query });

      const res = await fetch(`/api/businesses/${encodeURIComponent(salon.slug)}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          draftToken: draftToken || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.draftToken) setDraftToken(data.draftToken);
        if (data.draft) setActiveDraft(data.draft);

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          draft: data.draft,
          suggestedSlots: data.suggestedSlots,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg: Message = {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: data.message || "I apologize, I'm having trouble retrieving details right now. Please try again or select a service.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "Connection lost. Please check your network or try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Switch to inline booking checkout phase
  const handleProceedToBooking = async (draftToUse?: BookingDraft) => {
    const draft = draftToUse || activeDraft;
    if (!draft) return;

    // Match service
    const svc =
      salon.services.find((s) => s.id === draft.serviceId) ||
      salon.services.find((s) => s.name.toLowerCase() === draft.serviceName?.toLowerCase()) ||
      salon.services[0];
    setSelectedService(svc || null);

    // Match staff
    let resolvedStaffId: string | null = null;
    if (draft.staffId) {
      const st = salon.staff.find((s) => s.id === draft.staffId);
      if (st) resolvedStaffId = st.id;
    } else if (draft.staffName && draft.staffName.toLowerCase() !== "any specialist") {
      const st = salon.staff.find((s) => s.displayName.toLowerCase().includes(draft.staffName!.toLowerCase()));
      if (st) resolvedStaffId = st.id;
    }
    setSelectedStaffId(resolvedStaffId);

    const targetDate = draft.slotDate || new Date().toISOString().split("T")[0];
    setSelectedDate(targetDate);

    if (draft.customerName) setCustomerName(draft.customerName);
    if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
    if (draft.customerEmail) setCustomerEmail(draft.customerEmail);

    setActiveView("checkout");
    setRevalidationConflict(null);
    setBookingError(null);
    setRevalidatingSlot(true);

    // Live Slot Revalidation
    try {
      const availRes = await getPublicAppointmentAvailability({
        businessSlug: salon.slug,
        serviceId: svc?.id || salon.services[0]?.id || "",
        staffId: resolvedStaffId || undefined,
        staffPreference: resolvedStaffId ? "specific" : "any",
        date: targetDate,
      });

      if (availRes.success && availRes.data?.slots) {
        const availableSlots = availRes.data.slots;
        const targetTime = draft.slotStartTime;

        let matched = targetTime ? availableSlots.find((s) => s.localTime === targetTime) : null;
        if (!matched && availableSlots.length > 0) {
          matched = availableSlots[0];
        }

        if (matched) {
          setSelectedSlot(matched);
        } else {
          setRevalidationConflict(`The requested time (${targetTime || "selected slot"}) is no longer available. Please select another slot.`);
        }
      } else {
        setRevalidationConflict("No open appointments available on this date. Please pick another date.");
      }
    } catch {
      setRevalidationConflict("Could not verify slot availability. Please try selecting a time below.");
    } finally {
      setRevalidatingSlot(false);
    }
  };

  // Submit Final Booking via createPublicBooking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot || !selectedDate) {
      setBookingError("Please ensure service, date, and appointment slot are selected.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setBookingError("Please provide your full name and phone number.");
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const idempotencyKey = `wgt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const res = await createPublicBooking({
        businessSlug: salon.slug,
        serviceId: selectedService.id,
        staffId: selectedStaffId || undefined,
        startsAt: selectedSlot.startsAt,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey,
      });

      if (res.success && res.data) {
        const resultPayload = {
          id: res.data.appointmentId,
          bookingReference: res.data.bookingReference,
          startsAt: res.data.startsAt,
          serviceName: selectedService.name,
          staffName: res.data.staffName || "Specialist",
        };
        setBookingResult(resultPayload);
        setActiveView("success");

        // Notify parent host via postMessage
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "bookzello:booking-success",
              payload: resultPayload,
            },
            "*"
          );
        }
      } else {
        setBookingError(res.error || "Unable to confirm booking. The requested slot may have been taken.");
      }
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "An unexpected network error occurred.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const currencySymbol = salon.currency === "GBP" ? "£" : salon.currency === "EUR" ? "€" : "$";
  const formatMoney = (cents: number) => `${currencySymbol}${(cents / 100).toFixed(2)}`;

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-800 antialiased overflow-hidden select-none font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1852E8] to-[#00C8FF] text-white shadow-sm shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate leading-tight">{salon.name}</h1>
            <p className="text-[11px] text-white/90 truncate flex items-center gap-1">
              <span>Virtual Receptionist</span>
              <span>•</span>
              <span className="text-emerald-200">Online</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
            title="Close widget"
            aria-label="Close widget"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* VIEW 1: CONVERSATIONAL CHAT */}
        {activeView === "chat" && (
          <>
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
              {messages.map((m) => {
                const isCustomer = m.sender === "customer";
                return (
                  <div key={m.id} className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                        isCustomer
                          ? "bg-[#1852E8] text-white rounded-br-xs"
                          : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>

                    {/* Interactive Slots Pill Recommendation */}
                    {m.suggestedSlots && m.suggestedSlots.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                        {m.suggestedSlots.map((slot, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => sendMessage(`I would like ${slot.time}`)}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-[#1852E8] hover:bg-blue-100 transition-colors shadow-2xs"
                          >
                            <Clock className="h-3 w-3" />
                            <span>{slot.time}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Unconfirmed Interactive Booking Review Card */}
                    {m.draft && m.draft.serviceName && m.draft.slotDate && m.draft.slotStartTime && (
                      <Card className="mt-3 w-full max-w-sm border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-3.5 shadow-sm text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                              Ready for Review
                            </Badge>
                          </div>
                          <span className="text-xs font-bold text-[#1852E8]">
                            {m.draft.servicePriceFormatted || ""}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{m.draft.serviceName}</span>
                            <span className="text-slate-400">({m.draft.serviceDurationMinutes || 30} mins)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{m.draft.staffName || "Any Specialist"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{m.draft.slotDate} at {m.draft.slotStartTime}</span>
                          </div>
                          {m.draft.customerName && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <span className="text-slate-400">For:</span>
                              <span className="font-medium text-slate-800">{m.draft.customerName}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleProceedToBooking(m.draft)}
                            className="w-full bg-[#1852E8] hover:bg-[#1240BE] text-white font-semibold text-xs py-2 shadow-sm flex items-center justify-center gap-1.5 rounded-lg"
                          >
                            <span>Review &amp; Confirm Reservation</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                );
              })}

              {isAiLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-xl w-fit">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1852E8]" />
                  <span>Checking treatments and availability...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Quick:</span>
              <button
                type="button"
                onClick={() => sendMessage("What treatments do you offer?")}
                className="text-[11px] bg-white border border-slate-200 hover:border-blue-300 text-slate-700 rounded-full px-2.5 py-0.5 whitespace-nowrap shadow-2xs transition-colors"
              >
                Treatments &amp; Prices
              </button>
              <button
                type="button"
                onClick={() => sendMessage("What times are open tomorrow?")}
                className="text-[11px] bg-white border border-slate-200 hover:border-blue-300 text-slate-700 rounded-full px-2.5 py-0.5 whitespace-nowrap shadow-2xs transition-colors"
              >
                Open Slots Tomorrow
              </button>
              <button
                type="button"
                onClick={() => sendMessage("I'd like to book an appointment.")}
                className="text-[11px] bg-white border border-slate-200 hover:border-blue-300 text-slate-700 rounded-full px-2.5 py-0.5 whitespace-nowrap shadow-2xs transition-colors"
              >
                Book Treatment
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="Ask about treatments or reply..."
                disabled={isAiLoading}
                className="flex-1 text-xs sm:text-sm h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1852E8]"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isAiLoading}
                className="h-10 w-10 bg-[#1852E8] hover:bg-[#1240BE] text-white rounded-xl shrink-0 p-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}

        {/* VIEW 2: INLINE BOOKING CONFIRMATION & REVALIDATION */}
        {activeView === "checkout" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("chat")}
                className="h-7 text-xs text-slate-600 gap-1 pl-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Back to chat</span>
              </Button>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Review your reservation</p>
                <p className="text-[11px] text-blue-800">
                  Please verify your booking details below. Your reservation is confirmed only after clicking Confirm.
                </p>
              </div>
            </div>

            {/* Revalidation Alert */}
            {revalidatingSlot && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#1852E8]" />
                <span>Revalidating slot availability with salon schedule...</span>
              </div>
            )}

            {revalidationConflict && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Slot conflict</p>
                  <p>{revalidationConflict}</p>
                </div>
              </div>
            )}

            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Booking failed</p>
                  <p>{bookingError}</p>
                </div>
              </div>
            )}

            {/* Appointment Summary Card */}
            {selectedService && (
              <Card className="p-3.5 border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{selectedService.name}</h3>
                  <span className="text-sm font-extrabold text-[#1852E8]">
                    {formatMoney(selectedService.priceAmount)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedService.durationMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{salon.staff.find((s) => s.id === selectedStaffId)?.displayName || "Any Specialist"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedDate} at {selectedSlot?.localTime || "Pending"}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Customer Details Form */}
            <form onSubmit={handleConfirmBooking} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={customerName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className="w-full text-xs h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(for confirmation)</span>
                </label>
                <div className="relative">
                  <Mail className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full text-xs h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Special Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={customerNotes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerNotes(e.target.value)}
                  placeholder="Preferred styling, allergies, etc."
                  className="w-full text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submittingBooking || revalidatingSlot || !selectedSlot}
                  className="w-full h-11 bg-[#1852E8] hover:bg-[#1240BE] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
                >
                  {submittingBooking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Securing Appointment...</span>
                    </span>
                  ) : (
                    <span>Confirm Booking</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 3: SUCCESS CONFIRMATION */}
        {activeView === "success" && bookingResult && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Appointment Confirmed!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your reservation at <span className="font-semibold text-slate-800">{salon.name}</span> has been confirmed.
              </p>
            </div>

            <Card className="w-full p-4 border-slate-200 bg-slate-50/60 text-left space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Booking Ref</span>
                <span className="text-xs font-mono font-bold text-slate-800">{bookingResult.bookingReference}</span>
              </div>
              <div className="text-xs space-y-1 text-slate-700 pt-1">
                <p>
                  <span className="text-slate-400">Treatment: </span>
                  <span className="font-semibold text-slate-900">{bookingResult.serviceName}</span>
                </p>
                <p>
                  <span className="text-slate-400">Specialist: </span>
                  <span className="font-semibold text-slate-900">{bookingResult.staffName}</span>
                </p>
                <p>
                  <span className="text-slate-400">When: </span>
                  <span className="font-semibold text-slate-900">
                    {new Date(bookingResult.startsAt).toLocaleDateString([], {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })} at {new Date(bookingResult.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
              </div>
            </Card>

            <div className="w-full space-y-2 pt-2">
              <Button
                type="button"
                onClick={handleClose}
                className="w-full bg-[#1852E8] hover:bg-[#1240BE] text-white font-semibold text-xs rounded-xl h-10 shadow-sm"
              >
                Done
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="w-full border-slate-200 text-slate-700 text-xs rounded-xl h-9"
              >
                Book Another Appointment
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Powered by Bookzello Footer Bar */}
      <footer className="py-2 px-3 border-t border-slate-100 bg-slate-50/80 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
        <span>Protected by Bookzello deterministic engine</span>
        <span className="font-semibold text-slate-500">Bookzello AI</span>
      </footer>
    </div>
  );
}
