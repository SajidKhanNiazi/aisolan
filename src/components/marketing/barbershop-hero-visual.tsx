"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  Bot, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw,
  Users,
  ShieldCheck,
  Scissors,
  Check,
  Clock
} from "lucide-react";

type BarbershopTab = "agenda" | "ai-chat" | "booking";

export function BarbershopHeroVisual() {
  const [activeTab, setActiveTab] = useState<BarbershopTab>("agenda");

  // Tab 1: Schedule state
  const [selectedBarber, setSelectedBarber] = useState<"all" | "daniel" | "emma" | "sarah">("all");

  // Tab 2: AI Receptionist state
  const [aiChatStep, setAiChatStep] = useState<"initial" | "answered" | "confirmed">("initial");

  // Tab 3: Quick Booking state
  const [selectedService, setSelectedService] = useState<string>("Classic Haircut & Beard");
  const [selectedStaff, setSelectedStaff] = useState<string>("Daniel");
  const [selectedSlot, setSelectedSlot] = useState<string>("10:35 AM");
  const [isBooked, setIsBooked] = useState<boolean>(false);

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[500px]">
      
      {/* Editorial Ambient Aura */}
      <div 
        className="absolute -top-6 -left-6 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-[#EBC9C5]/45 blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />
      <div 
        className="absolute -bottom-8 -right-8 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-[#553B4B]/15 blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main SaaS Tablet Console */}
      <div className="relative rounded-3xl border border-[#AF6D7B]/25 bg-white/95 backdrop-blur-xl shadow-2xl shadow-[#553B4B]/12 overflow-hidden transition-all duration-300">
        
        {/* Console Header Bar */}
        <div className="flex items-center justify-between border-b border-[#AF6D7B]/15 bg-gradient-to-r from-[#FBF6F3] via-white to-[#FBF6F3] px-3.5 py-2">
          {/* Shop Profile */}
          <div className="flex items-center gap-2">
            <div className="relative h-7 w-7 rounded-full overflow-hidden border border-[#AF6D7B]/30 shadow-2xs">
              <Image
                src="/images/salon-stylist-hero.jpg"
                alt="Bookzello Barbershop Management"
                fill
                sizes="28px"
                className="object-cover object-top"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-[#27232B]">Master Barbershop</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-[#553B4B]/80 font-medium">3 Barbers • Live Schedule</p>
            </div>
          </div>

          {/* Collision-Safe Live Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF6F3] border border-[#AF6D7B]/25 px-2.5 py-1 text-[10px] font-semibold text-[#AF6D7B]">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span className="hidden sm:inline">Zero Collisions</span>
            <span className="sm:hidden">Protected</span>
          </div>
        </div>

        {/* Console Nav Tabs */}
        <div className="grid grid-cols-3 border-b border-[#AF6D7B]/15 bg-[#FBF6F3]/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "agenda"
                ? "border-[#27232B] text-[#27232B] bg-white font-bold"
                : "border-transparent text-[#553B4B]/80 hover:text-[#27232B]"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-[#AF6D7B]" />
            <span>Today&apos;s Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai-chat")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "ai-chat"
                ? "border-[#27232B] text-[#27232B] bg-white font-bold"
                : "border-transparent text-[#553B4B]/80 hover:text-[#27232B]"
            }`}
          >
            <Bot className="h-3.5 w-3.5 text-[#AF6D7B]" />
            <span>AI Receptionist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("booking")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "booking"
                ? "border-[#27232B] text-[#27232B] bg-white font-bold"
                : "border-transparent text-[#553B4B]/80 hover:text-[#27232B]"
            }`}
          >
            <Scissors className="h-3.5 w-3.5 text-[#AF6D7B]" />
            <span>Client Booking</span>
          </button>
        </div>

        {/* Tab 1: Today's Agenda View */}
        {activeTab === "agenda" && (
          <div className="p-3 space-y-2.5 bg-white">
            {/* Filter pills */}
            <div className="flex items-center justify-between pb-0.5">
              <span className="text-[11px] font-semibold text-[#553B4B]">Staff Schedules:</span>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedBarber("all")}
                  className={`px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedBarber === "all" ? "bg-[#27232B] text-white" : "bg-[#FBF6F3] text-[#553B4B] hover:bg-[#EBC9C5]/30"
                  }`}
                >
                  All (3)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBarber("daniel")}
                  className={`px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedBarber === "daniel" ? "bg-[#27232B] text-white" : "bg-[#FBF6F3] text-[#553B4B] hover:bg-[#EBC9C5]/30"
                  }`}
                >
                  Daniel
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBarber("emma")}
                  className={`px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedBarber === "emma" ? "bg-[#27232B] text-white" : "bg-[#FBF6F3] text-[#553B4B] hover:bg-[#EBC9C5]/30"
                  }`}
                >
                  Emma
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBarber("sarah")}
                  className={`px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedBarber === "sarah" ? "bg-[#27232B] text-white" : "bg-[#FBF6F3] text-[#553B4B] hover:bg-[#EBC9C5]/30"
                  }`}
                >
                  Sarah
                </button>
              </div>
            </div>

            {/* Appointment cards list */}
            <div className="space-y-1.5 text-xs">
              {(selectedBarber === "all" || selectedBarber === "daniel") && (
                <div className="rounded-2xl border border-[#AF6D7B]/20 bg-[#FBF6F3]/50 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-[#27232B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      D
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#27232B]">10:00 AM</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full font-medium">Confirmed</span>
                      </div>
                      <p className="text-[11px] text-[#553B4B]">Classic Haircut (30m + 5m buffer)</p>
                      <p className="text-[10px] text-[#553B4B]/70">Barber: Daniel • Client: Marcus T.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#27232B]">£28</span>
                </div>
              )}

              {(selectedBarber === "all" || selectedBarber === "emma") && (
                <div className="rounded-2xl border border-[#AF6D7B]/20 bg-[#FBF6F3]/50 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-[#553B4B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      E
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#27232B]">10:00 AM</span>
                        <span className="text-[10px] text-[#AF6D7B] bg-[#FBF6F3] border border-[#AF6D7B]/20 px-1.5 py-0.2 rounded-full font-medium">Simultaneous</span>
                      </div>
                      <p className="text-[11px] text-[#553B4B]">Beard Trim &amp; Hot Towel (30m)</p>
                      <p className="text-[10px] text-[#553B4B]/70">Barber: Emma • Client: David W.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#27232B]">£22</span>
                </div>
              )}

              {(selectedBarber === "all" || selectedBarber === "daniel") && (
                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-1.5 text-center text-[10px] font-semibold text-emerald-800">
                  <Clock className="inline h-3 w-3 mr-1" />
                  10:35 AM — Next Available Slot (5m cleanup verified)
                </div>
              )}

              {(selectedBarber === "all" || selectedBarber === "sarah") && (
                <div className="rounded-2xl border border-[#AF6D7B]/20 bg-white p-2 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-[#AF6D7B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      S
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#27232B]">11:15 AM</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full font-medium">Confirmed</span>
                      </div>
                      <p className="text-[11px] text-[#553B4B]">Skin Fade &amp; Styling (45m)</p>
                      <p className="text-[10px] text-[#553B4B]/70">Barber: Sarah • Client: Liam P.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#27232B]">£35</span>
                </div>
              )}
            </div>

            <div className="pt-0.5 flex items-center justify-between text-[10px] text-[#553B4B]/80 border-t border-[#AF6D7B]/10">
              <span>Today&apos;s Scheduled Total: 16 visits</span>
              <span className="font-semibold text-[#27232B]">Zero Overlaps Detected</span>
            </div>
          </div>
        )}

        {/* Tab 2: AI Receptionist View */}
        {activeTab === "ai-chat" && (
          <div className="p-3.5 sm:p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between pb-1 border-b border-[#AF6D7B]/10">
              <span className="text-[11px] font-semibold text-[#27232B] flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-[#AF6D7B]" />
                <span>Conversational Barber Assistant</span>
              </span>
              <button 
                type="button"
                onClick={() => setAiChatStep("initial")}
                className="text-[10px] text-[#AF6D7B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-none bg-[#FBF6F3] border border-[#AF6D7B]/20 p-2.5 text-[#27232B] max-w-[85%]">
                  Can I book a haircut with Daniel today at 10:00 AM?
                </div>
              </div>

              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-none bg-[#27232B] text-white p-2.5 max-w-[90%] space-y-1.5 shadow-xs">
                  <p className="text-[11px] leading-relaxed">
                    Daniel is booked at 10:00 AM (runs until 10:35 AM with buffer).
                  </p>
                  <p className="text-[10px] text-[#EBC9C5]">
                    Emma is available at <strong>10:00 AM</strong>, or Daniel can take you at <strong>10:35 AM</strong>. Which do you prefer?
                  </p>
                </div>
              </div>

              {aiChatStep === "initial" && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAiChatStep("answered")}
                    className="text-left text-[11px] font-semibold text-[#AF6D7B] bg-[#FBF6F3] hover:bg-[#EBC9C5]/30 p-2 rounded-xl border border-[#AF6D7B]/20 transition-colors cursor-pointer"
                  >
                    👉 Book Daniel at 10:35 AM (Classic Haircut)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiChatStep("confirmed")}
                    className="text-left text-[11px] font-semibold text-[#27232B] bg-[#FBF6F3] hover:bg-[#EBC9C5]/30 p-2 rounded-xl border border-[#AF6D7B]/20 transition-colors cursor-pointer"
                  >
                    👉 Book Emma at 10:00 AM instead
                  </button>
                </div>
              )}

              {(aiChatStep === "answered" || aiChatStep === "confirmed") && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-2.5 flex items-center gap-2 text-emerald-800 text-[11px] font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {aiChatStep === "answered" ? "Reserved: Daniel at 10:35 AM confirmed!" : "Reserved: Emma at 10:00 AM confirmed!"}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-[#553B4B]/70 italic pt-1 text-center">
              Shared calendar verification prevents false confirmations.
            </p>
          </div>
        )}

        {/* Tab 3: Quick Client Booking View */}
        {activeTab === "booking" && (
          <div className="p-3.5 sm:p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between pb-1 border-b border-[#AF6D7B]/10">
              <span className="text-[11px] font-semibold text-[#27232B]">Select Service &amp; Barber:</span>
              <span className="text-[10px] text-[#AF6D7B] font-semibold">Step 2 of 3</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Service options */}
              <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setSelectedService("Classic Haircut")}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedService === "Classic Haircut"
                      ? "border-[#27232B] bg-[#27232B] text-white font-semibold"
                      : "border-[#AF6D7B]/20 bg-[#FBF6F3] text-[#27232B] hover:border-[#AF6D7B]"
                  }`}
                >
                  <p className="font-semibold">Classic Haircut</p>
                  <p className="text-[9.5px] opacity-80">30 min • £28</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedService("Classic Haircut & Beard")}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedService === "Classic Haircut & Beard"
                      ? "border-[#27232B] bg-[#27232B] text-white font-semibold"
                      : "border-[#AF6D7B]/20 bg-[#FBF6F3] text-[#27232B] hover:border-[#AF6D7B]"
                  }`}
                >
                  <p className="font-semibold">Cut &amp; Beard Trim</p>
                  <p className="text-[9.5px] opacity-80">45 min • £40</p>
                </button>
              </div>

              {/* Barber Selector */}
              <div>
                <p className="text-[10.5px] font-semibold text-[#553B4B] mb-1">Choose Specialist:</p>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  {["Daniel", "Emma", "Sarah"].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedStaff(name)}
                      className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        selectedStaff === name
                          ? "border-[#AF6D7B] bg-[#FBF6F3] text-[#AF6D7B]"
                          : "border-slate-200 bg-white text-[#553B4B] hover:border-slate-300"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Slots */}
              <div>
                <p className="text-[10.5px] font-semibold text-[#553B4B] mb-1">Eligible Times Today:</p>
                <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
                  {["10:35 AM", "01:15 PM", "03:45 PM"].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedSlot(time)}
                      className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        selectedSlot === time
                          ? "border-[#27232B] bg-[#27232B] text-white"
                          : "border-[#AF6D7B]/20 bg-[#FBF6F3] text-[#27232B] hover:border-[#AF6D7B]"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmation Button */}
              <button
                type="button"
                onClick={() => setIsBooked(true)}
                className="w-full mt-1 py-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isBooked ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Appointment Confirmed!</span>
                  </>
                ) : (
                  <>
                    <span>Confirm with {selectedStaff} ({selectedSlot})</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#EBC9C5]" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Console Footer */}
        <div className="border-t border-[#AF6D7B]/15 bg-[#FBF6F3]/60 px-3.5 py-2 flex items-center justify-between text-[10px] text-[#553B4B]/80">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Interactive Barbershop Sandbox</span>
          </span>
          <span className="font-semibold text-[#AF6D7B]">Bookzello Engine</span>
        </div>
      </div>

      {/* Floating Card 1: Zero Overlaps / Collision Protection (Top Left) */}
      <div className="absolute -top-6 -left-6 sm:-top-7 sm:-left-8 bg-white/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 shadow-lg border border-[#AF6D7B]/20 max-w-[160px] sm:max-w-[190px] animate-float-slow hover:scale-105 transition-transform duration-300 z-20 hidden sm:block">
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#27232B] text-[#EBC9C5] shadow-xs">
            <ShieldCheck className="h-3 w-3" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-[10.5px] font-bold text-[#27232B] leading-tight">
              Zero Double Bookings
            </p>
            <p className="text-[8px] sm:text-[9px] text-[#553B4B]/80 leading-tight">
              Buffers &amp; shifts verified
            </p>
          </div>
        </div>
      </div>

      {/* Floating Card 2: 3 Barbers Active (Bottom Right) */}
      <div className="absolute -bottom-3 -right-2 sm:-bottom-4 sm:-right-6 bg-white/95 backdrop-blur-md rounded-2xl px-3 py-2 shadow-lg border border-[#AF6D7B]/20 hidden sm:flex items-center gap-2 animate-float-delayed hover:scale-105 transition-transform duration-300 z-10">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#FBF6F3] text-[#AF6D7B] border border-[#AF6D7B]/20">
          <Users className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#AF6D7B] leading-tight">
            3 Active Barbers
          </p>
          <p className="text-[8.5px] sm:text-[9.5px] text-[#553B4B]/80 leading-tight">
            Daniel, Emma &amp; Sarah
          </p>
        </div>
      </div>

    </div>
  );
}

