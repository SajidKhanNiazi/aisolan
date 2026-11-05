"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Bot, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  User,
  ShieldCheck,
  Scissors,
  Check,
  CalendarCheck2
} from "lucide-react";

type HeroTab = "ai-receptionist" | "live-agenda" | "quick-book";

export function HeroVisual() {
  const [activeTab, setActiveTab] = useState<HeroTab>("ai-receptionist");

  // Tab 1: AI Chat state
  const [chatStep, setChatStep] = useState<"initial" | "typing" | "answered" | "confirmed">("initial");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");

  // Tab 2: Calendar state
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today");
  const [selectedSlot, setSelectedSlot] = useState<string | null>("11:30 AM");
  const [reservedSlotMessage, setReservedSlotMessage] = useState<string | null>(null);

  // Tab 3: Quick Book state
  const [selectedService, setSelectedService] = useState<string>("Cut & Blowdry");
  const [selectedStaff, setSelectedStaff] = useState<string>("Emma R.");
  const [selectedTime, setSelectedTime] = useState<string>("10:00 AM");
  const [isBookedSuccess, setIsBookedSuccess] = useState<boolean>(false);

  // AI prompt trigger
  const triggerAiPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    setChatStep("typing");
    setTimeout(() => {
      setChatStep("answered");
    }, 500);
  };

  const confirmAiBooking = () => {
    setChatStep("confirmed");
  };

  const resetAiChat = () => {
    setChatStep("initial");
    setSelectedPrompt("");
  };

  // Calendar slot booking
  const handleSelectSlot = (slotTime: string, stylist: string) => {
    setSelectedSlot(slotTime);
    setReservedSlotMessage(`Reserved ${slotTime} with ${stylist}! No double bookings.`);
    setTimeout(() => {
      setReservedSlotMessage(null);
    }, 3000);
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[490px]">
      
      {/* Editorial Ambient Aura */}
      <div 
        className="absolute -top-6 -left-6 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-[#EBC9C5]/45 blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />
      <div 
        className="absolute -bottom-8 -right-8 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-[#553B4B]/12 blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Interactive Beauty-Tech Tablet Console */}
      <div className="relative rounded-3xl border border-[#AF6D7B]/25 bg-white/95 backdrop-blur-xl shadow-2xl shadow-[#553B4B]/15 overflow-hidden transition-all duration-300">
        
        {/* Console Header Bar */}
        <div className="flex items-center justify-between border-b border-[#FBF6F3] bg-gradient-to-r from-[#FBF6F3] via-white to-[#FBF6F3] px-3.5 sm:px-4 py-2.5">
          {/* Studio Profile */}
          <div className="flex items-center gap-2">
            <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-[#AF6D7B]/30 shadow-2xs">
              <Image
                src="/images/salon-stylist-hero.jpg"
                alt="Elena Vance - Master Stylist"
                fill
                sizes="32px"
                className="object-cover object-top"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-[#27232B]">Luxe Studio</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[9px] sm:text-[10px] text-[#553B4B]/75 leading-none">
                Interactive Salon Console
              </p>
            </div>
          </div>

          {/* Quick Status Pill */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[9px] sm:text-[10px] font-semibold text-emerald-700">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Live System</span>
          </div>
        </div>

        {/* Interactive Mode Navigation Tabs */}
        <div className="flex items-center justify-between p-1.5 bg-[#FBF6F3]/80 border-b border-[#AF6D7B]/15">
          <button
            type="button"
            onClick={() => setActiveTab("ai-receptionist")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ai-receptionist"
                ? "bg-[#27232B] text-white shadow-xs"
                : "text-[#553B4B] hover:text-[#27232B] hover:bg-white/60"
            }`}
          >
            <Bot className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>AI Receptionist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("live-agenda")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "live-agenda"
                ? "bg-[#27232B] text-white shadow-xs"
                : "text-[#553B4B] hover:text-[#27232B] hover:bg-white/60"
            }`}
          >
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Live Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quick-book")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "quick-book"
                ? "bg-[#27232B] text-white shadow-xs"
                : "text-[#553B4B] hover:text-[#27232B] hover:bg-white/60"
            }`}
          >
            <Scissors className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Instant Book</span>
          </button>
        </div>

        {/* Tab Content Display Area */}
        <div className="p-3.5 sm:p-4 min-h-[295px] flex flex-col justify-between">
          
          {/* ======================================================= */}
          {/* TAB 1: AI RECEPTIONIST INTERACTIVE CONVERSATION        */}
          {/* ======================================================= */}
          {activeTab === "ai-receptionist" && (
            <div className="space-y-3">
              {/* Bot Welcome Bubble */}
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#AF6D7B] to-[#553B4B] text-white shadow-2xs">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-1 max-w-[85%]">
                  <div className="rounded-2xl rounded-tl-xs bg-[#FBF6F3] border border-[#AF6D7B]/20 p-2.5 text-xs text-[#27232B] leading-relaxed shadow-2xs">
                    <p className="font-semibold text-[#AF6D7B] text-[11px] mb-0.5">Bookzello AI • 24/7 Receptionist</p>
                    <p>
                      Hello! I can check real-time availability, hold slots, or book treatments with our stylists. Tap a prompt to test me:
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Simulation Area */}
              {chatStep === "initial" && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-semibold text-[#553B4B]/80 uppercase tracking-wider px-1">
                    Tap to ask the AI Receptionist:
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerAiPrompt("Book Hair Cut with Emma tomorrow")}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-[#FBF6F3] border border-[#AF6D7B]/25 hover:border-[#AF6D7B]/50 text-[11px] font-medium text-[#27232B] transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>✂️</span>
                        <span>&ldquo;Book Hair Cut with Emma tomorrow&rdquo;</span>
                      </span>
                      <ArrowRight className="h-3 w-3 text-[#AF6D7B] group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerAiPrompt("Is Sophia free for Balayage today?")}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-[#FBF6F3] border border-[#AF6D7B]/25 hover:border-[#AF6D7B]/50 text-[11px] font-medium text-[#27232B] transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🎨</span>
                        <span>&ldquo;Is Sophia free for Balayage today?&rdquo;</span>
                      </span>
                      <ArrowRight className="h-3 w-3 text-[#AF6D7B] group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerAiPrompt("What are your available times this afternoon?")}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-[#FBF6F3] border border-[#AF6D7B]/25 hover:border-[#AF6D7B]/50 text-[11px] font-medium text-[#27232B] transition-all cursor-pointer shadow-2xs group"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🕒</span>
                        <span>&ldquo;What times are free this afternoon?&rdquo;</span>
                      </span>
                      <ArrowRight className="h-3 w-3 text-[#AF6D7B] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Typing State */}
              {chatStep === "typing" && (
                <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-[#FBF6F3] text-xs text-[#AF6D7B]">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span className="font-semibold animate-pulse">Checking live stylist schedules...</span>
                </div>
              )}

              {/* Answered State with Direct Slot Action */}
              {chatStep === "answered" && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  {/* User query bubble */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-xs bg-[#27232B] text-white px-3 py-1.5 text-xs">
                      {selectedPrompt}
                    </div>
                  </div>

                  {/* AI Response Card */}
                  <div className="rounded-2xl bg-white border border-[#AF6D7B]/30 p-3 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Available Slot Located</span>
                      </span>
                      <span className="text-[10px] font-semibold text-[#AF6D7B]">
                        Emma R. • 30 mins
                      </span>
                    </div>

                    <p className="text-xs text-[#27232B]">
                      Great news! Emma R. has an opening tomorrow at <strong>10:00 AM</strong> for Hair Cut &amp; Finish (<strong>£35.00</strong>).
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={confirmAiBooking}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[#27232B] hover:bg-[#553B4B] py-2 px-3 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                      >
                        <span>Confirm 10:00 AM Slot</span>
                        <ArrowRight className="h-3 w-3 text-[#EBC9C5]" />
                      </button>
                      <button
                        type="button"
                        onClick={resetAiChat}
                        className="p-2 rounded-xl border border-stone-200 text-[#553B4B] hover:bg-stone-50 transition-colors cursor-pointer"
                        title="Reset conversation"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmed State */}
              {chatStep === "confirmed" && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-[#FBF6F3] border border-emerald-300/80 p-3.5 text-center space-y-2 animate-fadeIn">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Appointment Confirmed!</p>
                    <p className="text-[11px] text-[#553B4B] mt-0.5">
                      Ref: <strong>BK-9428</strong> • Emma R. tomorrow at 10:00 AM
                    </p>
                  </div>
                  <div className="pt-1 flex items-center justify-center gap-2">
                    <Link
                      href="/booking/bookpilot-qa-salon"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#27232B] hover:text-[#AF6D7B]"
                    >
                      <span>Explore Full Booking Demo</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <span className="text-[#AF6D7B]">•</span>
                    <button
                      type="button"
                      onClick={resetAiChat}
                      className="text-[11px] font-semibold text-[#AF6D7B] hover:underline cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 2: LIVE SALON AGENDA & DOUBLE-BOOKING PREVENTION   */}
          {/* ======================================================= */}
          {activeTab === "live-agenda" && (
            <div className="space-y-3">
              {/* Day Selector */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck2 className="h-4 w-4 text-[#AF6D7B]" />
                  <span className="text-xs font-bold text-[#27232B]">Staff Schedule</span>
                </div>
                <div className="inline-flex rounded-full bg-[#FBF6F3] p-0.5 border border-[#AF6D7B]/20">
                  <button
                    type="button"
                    onClick={() => setSelectedDay("today")}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                      selectedDay === "today"
                        ? "bg-[#27232B] text-white"
                        : "text-[#553B4B] hover:text-[#27232B]"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDay("tomorrow")}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                      selectedDay === "tomorrow"
                        ? "bg-[#27232B] text-white"
                        : "text-[#553B4B] hover:text-[#27232B]"
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              {/* Multi-Staff Time Slot Matrix */}
              <div className="space-y-2 text-xs">
                {/* Stylist 1 */}
                <div className="rounded-xl border border-stone-200/80 bg-white p-2.5 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#27232B] flex items-center gap-1">
                      <User className="h-3 w-3 text-[#AF6D7B]" />
                      <span>Emma R.</span>
                    </span>
                    <span className="text-[10px] text-[#553B4B]">Senior Stylist</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <span className="py-1 px-1.5 rounded-lg bg-stone-100 text-stone-400 text-center text-[10px] font-medium line-through">
                      09:30 (Booked)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectSlot("11:30 AM", "Emma R.")}
                      className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer ${
                        selectedSlot === "11:30 AM"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      11:30 AM Free
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSlot("02:00 PM", "Emma R.")}
                      className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer ${
                        selectedSlot === "02:00 PM"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      02:00 PM Free
                    </button>
                  </div>
                </div>

                {/* Stylist 2 */}
                <div className="rounded-xl border border-stone-200/80 bg-white p-2.5 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#27232B] flex items-center gap-1">
                      <User className="h-3 w-3 text-[#AF6D7B]" />
                      <span>Sophia L.</span>
                    </span>
                    <span className="text-[10px] text-[#553B4B]">Color Specialist</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectSlot("10:00 AM", "Sophia L.")}
                      className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer ${
                        selectedSlot === "10:00 AM"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      10:00 AM Free
                    </button>
                    <span className="py-1 px-1.5 rounded-lg bg-stone-100 text-stone-400 text-center text-[10px] font-medium line-through">
                      12:30 (Booked)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectSlot("03:30 PM", "Sophia L.")}
                      className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-bold transition-all cursor-pointer ${
                        selectedSlot === "03:30 PM"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      03:30 PM Free
                    </button>
                  </div>
                </div>
              </div>

              {/* Instant Notification Feedback */}
              {reservedSlotMessage && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-center text-[11px] font-semibold text-emerald-900 animate-fadeIn">
                  ✓ {reservedSlotMessage}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 3: INSTANT 30-SECOND CLIENT BOOKING SIMULATOR       */}
          {/* ======================================================= */}
          {activeTab === "quick-book" && (
            <div className="space-y-2.5">
              {!isBookedSuccess ? (
                <>
                  {/* Step 1: Treatment */}
                  <div>
                    <label className="text-[10px] font-bold text-[#553B4B] uppercase tracking-wider block mb-1">
                      1. Choose Treatment
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {["Cut & Blowdry", "Balayage", "Beard Trim"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedService(s)}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition-all cursor-pointer ${
                            selectedService === s
                              ? "bg-[#27232B] text-white border-[#27232B]"
                              : "bg-white text-[#27232B] border-stone-200 hover:border-[#AF6D7B]"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Specialist */}
                  <div>
                    <label className="text-[10px] font-bold text-[#553B4B] uppercase tracking-wider block mb-1">
                      2. Choose Specialist
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {["Emma R.", "Sophia L.", "Any Stylist"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedStaff(st)}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold border transition-all cursor-pointer ${
                            selectedStaff === st
                              ? "bg-[#27232B] text-white border-[#27232B]"
                              : "bg-white text-[#27232B] border-stone-200 hover:border-[#AF6D7B]"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Slot */}
                  <div>
                    <label className="text-[10px] font-bold text-[#553B4B] uppercase tracking-wider block mb-1">
                      3. Select Time
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {["10:00 AM", "02:30 PM", "04:15 PM"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                            selectedTime === t
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Book Trigger Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsBookedSuccess(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-[#AF6D7B] to-[#553B4B] hover:opacity-95 text-xs font-bold text-white shadow-md transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <span>Reserve {selectedService} ({selectedTime})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-[#FBF6F3] border border-emerald-300 p-4 text-center space-y-2 animate-fadeIn my-auto">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Booking Confirmed!</p>
                    <p className="text-xs text-[#553B4B] mt-0.5">
                      {selectedService} with {selectedStaff} at {selectedTime}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-200/60 text-[10px] text-emerald-800 font-medium">
                    ✓ Verified in salon database • No double booking conflict
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBookedSuccess(false)}
                      className="text-xs font-semibold text-[#AF6D7B] hover:underline cursor-pointer"
                    >
                      Book Another Treatment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Footer Indicator */}
          <div className="pt-2.5 mt-2 border-t border-[#FBF6F3] flex items-center justify-between text-[10px]">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Zero Double Bookings</span>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#AF6D7B]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Instant Cloud Sync</span>
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
