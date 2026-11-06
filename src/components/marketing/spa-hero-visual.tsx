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
  Check,
  Clock,
  Sparkles
} from "lucide-react";

type SpaTab = "agenda" | "ai-chat" | "booking";

export function SpaHeroVisual() {
  const [activeTab, setActiveTab] = useState<SpaTab>("agenda");

  // Tab 1: Schedule state
  const [selectedTherapist, setSelectedTherapist] = useState<"all" | "emma" | "sarah" | "daniel">("all");

  // Tab 2: AI Receptionist state
  const [aiChatStep, setAiChatStep] = useState<"initial" | "answered" | "confirmed">("initial");

  // Tab 3: Booking state
  const [selectedService, setSelectedService] = useState<string>("Swedish Massage");
  const [selectedStaff, setSelectedStaff] = useState<string>("Daniel");
  const [selectedSlot, setSelectedSlot] = useState<string>("1:00 PM");
  const [isBooked, setIsBooked] = useState<boolean>(false);

  // Therapist-service eligibility map
  const serviceTherapists: Record<string, string[]> = {
    "Classic Facial": ["Emma", "Sarah"],
    "Hydrating Facial": ["Emma", "Sarah"],
    "Swedish Massage": ["Daniel"],
    "Deep Tissue Massage": ["Daniel"],
    "Scalp Treatment": ["Emma"],
  };

  const eligibleStaff = serviceTherapists[selectedService] || ["Emma", "Sarah", "Daniel"];

  return (
    <div className="relative mx-auto w-full max-w-[350px] sm:max-w-[460px] lg:max-w-[500px]">
      
      {/* Ambient Wellness Aura */}
      <div 
        className="absolute -top-6 -left-6 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-[#EBCFCB]/45 blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />
      <div 
        className="absolute -bottom-8 -right-8 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-[#594250]/15 blur-3xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main SaaS Tablet Console */}
      <div className="relative rounded-3xl border border-[#B87D89]/25 bg-white/95 backdrop-blur-xl shadow-2xl shadow-[#594250]/12 overflow-hidden transition-all duration-300">
        
        {/* Console Header Bar */}
        <div className="flex items-center justify-between border-b border-[#B87D89]/15 bg-gradient-to-r from-[#FBF7F4] via-white to-[#FBF7F4] px-3.5 sm:px-4 py-2.5">
          {/* Spa Profile */}
          <div className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 rounded-full overflow-hidden border border-[#B87D89]/30 shadow-2xs">
              <Image
                src="/images/salon-stylist-hero.jpg"
                alt="Serenity Day Spa Management"
                fill
                sizes="32px"
                className="object-cover object-top"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-[#29262B]">Serenity Day Spa</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#594250]/80 font-medium">3 Therapists • Live Schedule</p>
            </div>
          </div>

          {/* Zero-Conflict Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF7F4] border border-[#B87D89]/25 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-semibold text-[#B87D89]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Zero Conflicts</span>
          </div>
        </div>

        {/* Console Nav Tabs */}
        <div className="grid grid-cols-3 border-b border-[#B87D89]/15 bg-[#FBF7F4]/50 text-[11px] sm:text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "agenda"
                ? "border-[#B87D89] text-[#29262B] bg-white font-bold"
                : "border-transparent text-[#594250]/80 hover:text-[#29262B]"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-[#B87D89]" />
            <span className="hidden xs:inline sm:inline">Schedule</span>
            <span className="xs:hidden">Today</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai-chat")}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "ai-chat"
                ? "border-[#B87D89] text-[#29262B] bg-white font-bold"
                : "border-transparent text-[#594250]/80 hover:text-[#29262B]"
            }`}
          >
            <Bot className="h-3.5 w-3.5 text-[#B87D89]" />
            <span>AI Receptionist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("booking")}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "booking"
                ? "border-[#B87D89] text-[#29262B] bg-white font-bold"
                : "border-transparent text-[#594250]/80 hover:text-[#29262B]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#B87D89]" />
            <span>Book Online</span>
          </button>
        </div>

        {/* Tab 1: Today's Schedule View */}
        {activeTab === "agenda" && (
          <div className="p-3 sm:p-3.5 space-y-2.5 bg-white">
            {/* Filter pills */}
            <div className="flex items-center justify-between pb-0.5">
              <span className="text-[11px] sm:text-xs font-semibold text-[#594250]">Therapist Schedules:</span>
              <div className="flex gap-1 text-[10px] sm:text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedTherapist("all")}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedTherapist === "all" ? "bg-[#B87D89] text-white" : "bg-[#FBF7F4] text-[#594250] hover:bg-[#EBCFCB]/30"
                  }`}
                >
                  All (3)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTherapist("emma")}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedTherapist === "emma" ? "bg-[#B87D89] text-white" : "bg-[#FBF7F4] text-[#594250] hover:bg-[#EBCFCB]/30"
                  }`}
                >
                  Emma
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTherapist("sarah")}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedTherapist === "sarah" ? "bg-[#B87D89] text-white" : "bg-[#FBF7F4] text-[#594250] hover:bg-[#EBCFCB]/30"
                  }`}
                >
                  Sarah
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTherapist("daniel")}
                  className={`px-2 sm:px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedTherapist === "daniel" ? "bg-[#B87D89] text-white" : "bg-[#FBF7F4] text-[#594250] hover:bg-[#EBCFCB]/30"
                  }`}
                >
                  Daniel
                </button>
              </div>
            </div>

            {/* Appointment cards list */}
            <div className="space-y-1.5 sm:space-y-2 text-xs">
              {(selectedTherapist === "all" || selectedTherapist === "emma") && (
                <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4]/50 p-2 sm:p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#B87D89] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      E
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#29262B]">9:00 AM</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Confirmed ✓</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#594250] font-medium">Classic Facial (30m)</p>
                      <p className="text-[10px] text-[#594250]/70">Therapist: Emma • Client: Olivia R.</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedTherapist === "all" || selectedTherapist === "daniel") && (
                <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4]/50 p-2 sm:p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#29262B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      D
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#29262B]">9:30 AM</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Confirmed ✓</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#594250] font-medium">Deep Tissue Massage (90m)</p>
                      <p className="text-[10px] text-[#594250]/70">Therapist: Daniel • Client: James K.</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedTherapist === "all" || selectedTherapist === "sarah") && (
                <div className="rounded-2xl border border-[#B87D89]/20 bg-white p-2 sm:p-2.5 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#594250] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      S
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#29262B]">10:00 AM</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Confirmed ✓</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#594250] font-medium">Hydrating Facial (60m)</p>
                      <p className="text-[10px] text-[#594250]/70">Therapist: Sarah • Client: Mia L.</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedTherapist === "all" || selectedTherapist === "daniel") && (
                <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4]/50 p-2 sm:p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#29262B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      D
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#29262B]">11:15 AM</span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">Pending</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#594250] font-medium">Swedish Massage (60m)</p>
                      <p className="text-[10px] text-[#594250]/70">Therapist: Daniel • Client: Noah W.</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedTherapist === "all" || selectedTherapist === "emma") && (
                <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4]/50 p-2 sm:p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#B87D89] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      E
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#29262B]">12:00 PM</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Confirmed ✓</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#594250] font-medium">Scalp Treatment (30m)</p>
                      <p className="text-[10px] text-[#594250]/70">Therapist: Emma • Client: Sophia T.</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedTherapist === "all" || selectedTherapist === "sarah") && (
                <div className="rounded-2xl border border-[#B87D89]/20 bg-[#FBF7F4]/50 p-2 sm:p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#594250] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      S
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#29262B]">1:00 PM</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Confirmed ✓</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#594250] font-medium">Body Treatment (60m)</p>
                      <p className="text-[10px] text-[#594250]/70">Therapist: Sarah • Client: Ava M.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-0.5 flex items-center justify-between text-[10px] text-[#594250]/80 border-t border-[#B87D89]/10">
              <span>Today&apos;s Scheduled Total: 12 treatments</span>
              <span className="font-semibold text-[#29262B]">Zero Overlaps Detected</span>
            </div>
          </div>
        )}

        {/* Tab 2: AI Receptionist View */}
        {activeTab === "ai-chat" && (
          <div className="p-3.5 sm:p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between pb-1 border-b border-[#B87D89]/10">
              <span className="text-[11px] font-semibold text-[#29262B] flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-[#B87D89]" />
                <span>Wellness Booking Assistant</span>
              </span>
              <button 
                type="button"
                onClick={() => setAiChatStep("initial")}
                className="text-[10px] text-[#B87D89] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="space-y-2 text-xs">
              {/* Customer message */}
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-none bg-[#FBF7F4] border border-[#B87D89]/20 p-2.5 text-[#29262B] max-w-[85%]">
                  Do you have a 60-minute massage available tomorrow afternoon?
                </div>
              </div>

              {/* AI response - always visible */}
              {aiChatStep === "initial" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-[#594250] text-white p-2.5 max-w-[90%] space-y-1.5 shadow-xs">
                    <p className="text-[11px] leading-relaxed">
                      Let me check Daniel&apos;s availability for a 60-minute massage tomorrow afternoon…
                    </p>
                    <p className="text-[10px] text-[#EBCFCB] flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 inline" />
                      <span>Searching schedule…</span>
                    </p>
                  </div>
                </div>
              )}

              {aiChatStep === "initial" && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setAiChatStep("answered")}
                    className="text-[11px] font-semibold text-white bg-[#B87D89] hover:bg-[#594250] px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {(aiChatStep === "answered" || aiChatStep === "confirmed") && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-[#594250] text-white p-2.5 max-w-[90%] space-y-1.5 shadow-xs">
                    <p className="text-[11px] leading-relaxed">
                      I found two options for a 60-minute Swedish massage tomorrow:
                    </p>
                    <div className="text-[10px] text-[#EBCFCB] space-y-0.5">
                      <p>🕑 <strong>2:00 PM</strong> with Daniel</p>
                      <p>🕑 <strong>3:30 PM</strong> with Daniel</p>
                    </div>
                    <p className="text-[10px] text-[#EBCFCB]">
                      Would you like to book either of these?
                    </p>
                  </div>
                </div>
              )}

              {aiChatStep === "answered" && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAiChatStep("confirmed")}
                    className="text-left text-[11px] font-semibold text-[#B87D89] bg-[#FBF7F4] hover:bg-[#EBCFCB]/30 p-2 rounded-xl border border-[#B87D89]/20 transition-colors cursor-pointer"
                  >
                    👉 Book the 2:00 PM slot please
                  </button>
                </div>
              )}

              {aiChatStep === "confirmed" && (
                <>
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-none bg-[#FBF7F4] border border-[#B87D89]/20 p-2.5 text-[#29262B] max-w-[85%]">
                      Book the 2:00 PM slot please
                    </div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 text-[11px] font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Booking Confirmed!</span>
                    </div>
                    <div className="text-[10px] text-emerald-700 space-y-0.5 pl-6">
                      <p><strong>Service:</strong> Swedish Massage (60 min)</p>
                      <p><strong>Therapist:</strong> Daniel</p>
                      <p><strong>Time:</strong> Tomorrow at 2:00 PM</p>
                      <p><strong>Ref:</strong> #SDS-0847</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-[10px] text-[#594250]/70 italic pt-1 text-center">
              Real-time schedule verification prevents false confirmations.
            </p>
          </div>
        )}

        {/* Tab 3: Client Booking View */}
        {activeTab === "booking" && (
          <div className="p-3.5 sm:p-4 space-y-3 bg-white">
            {!isBooked ? (
              <>
                <div className="flex items-center justify-between pb-1 border-b border-[#B87D89]/10">
                  <span className="text-[11px] font-semibold text-[#29262B]">Select Treatment &amp; Therapist:</span>
                  <span className="text-[10px] text-[#B87D89] font-semibold">Step 2 of 3</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Treatment options */}
                  <div>
                    <p className="text-[10.5px] font-semibold text-[#594250] mb-1">Treatment:</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                      {["Classic Facial", "Hydrating Facial", "Swedish Massage", "Deep Tissue Massage", "Scalp Treatment"].map((service) => (
                        <button
                          key={service}
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            const eligible = serviceTherapists[service] || [];
                            if (!eligible.includes(selectedStaff)) {
                              setSelectedStaff(eligible[0] || "Emma");
                            }
                          }}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            selectedService === service
                              ? "border-[#B87D89] bg-[#B87D89] text-white font-semibold"
                              : "border-[#B87D89]/20 bg-[#FBF7F4] text-[#29262B] hover:border-[#B87D89]"
                          }`}
                        >
                          <p className="font-semibold">{service}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Therapist Selector */}
                  <div>
                    <p className="text-[10.5px] font-semibold text-[#594250] mb-1">Choose Therapist:</p>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      {["Emma", "Sarah", "Daniel"].map((name) => {
                        const isEligible = eligibleStaff.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => isEligible && setSelectedStaff(name)}
                            disabled={!isEligible}
                            className={`p-1.5 rounded-lg border text-center font-semibold transition-all ${
                              !isEligible
                                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                : selectedStaff === name
                                  ? "border-[#B87D89] bg-[#FBF7F4] text-[#B87D89] cursor-pointer"
                                  : "border-slate-200 bg-white text-[#594250] hover:border-slate-300 cursor-pointer"
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Available Slots */}
                  <div>
                    <p className="text-[10.5px] font-semibold text-[#594250] mb-1">Available Times:</p>
                    <div className="grid grid-cols-5 gap-1.5 text-[10.5px]">
                      {["10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedSlot(time)}
                          className={`p-1.5 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                            selectedSlot === time
                              ? "border-[#B87D89] bg-[#B87D89] text-white"
                              : "border-[#B87D89]/20 bg-[#FBF7F4] text-[#29262B] hover:border-[#B87D89]"
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
                    className="w-full mt-1 py-2 rounded-full bg-[#B87D89] hover:bg-[#594250] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Confirm Booking</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#EBCFCB]" />
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3 py-2">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center motion-safe:animate-bounce">
                    <Check className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-[#29262B]">Appointment Confirmed!</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3 text-[11px] text-[#594250] space-y-1">
                  <p><strong>Treatment:</strong> {selectedService}</p>
                  <p><strong>Therapist:</strong> {selectedStaff}</p>
                  <p><strong>Time:</strong> Today at {selectedSlot}</p>
                  <p><strong>Status:</strong> <span className="text-emerald-700 font-semibold">Confirmed ✓</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBooked(false)}
                  className="mx-auto text-[10px] text-[#B87D89] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Book Another Treatment</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Console Footer */}
        <div className="border-t border-[#B87D89]/15 bg-[#FBF7F4]/60 px-3.5 py-2 flex items-center justify-between text-[10px] text-[#594250]/80">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Interactive Spa Sandbox</span>
          </span>
          <span className="font-semibold text-[#B87D89]">Bookzello Engine</span>
        </div>
      </div>

      {/* Floating Badge 1: AI-Assisted Booking (Top Right) */}
      <div className="absolute -top-3 -right-2 sm:-top-5 sm:-right-4 bg-white/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 shadow-lg border border-[#B87D89]/20 max-w-[150px] sm:max-w-[180px] motion-safe:animate-float-slow hover:scale-105 transition-transform duration-300 z-20 hidden md:block">
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#B87D89] text-white shadow-xs">
            <Sparkles className="h-3 w-3" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] sm:text-[10.5px] font-bold text-[#29262B] leading-tight">
              AI-Assisted Booking
            </p>
            <p className="text-[8px] sm:text-[9px] text-[#594250]/80 leading-tight">
              Intelligent scheduling
            </p>
          </div>
        </div>
      </div>

      {/* Floating Badge 2: Smart Buffers (Bottom Left) */}
      <div className="absolute -bottom-2 -left-1 sm:-bottom-3 sm:-left-3 bg-white/95 backdrop-blur-md rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-lg border border-[#B87D89]/20 hidden md:flex items-center gap-2 motion-safe:animate-float-delayed hover:scale-105 transition-transform duration-300 z-10">
        <div className="flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded-xl bg-[#FBF7F4] text-[#B87D89] border border-[#B87D89]/20">
          <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#B87D89] leading-tight">
            Smart Buffers
          </p>
          <p className="text-[8px] sm:text-[9px] text-[#594250]/80 leading-tight">
            Between treatments
          </p>
        </div>
      </div>

      {/* Floating Badge 3: Multi-Therapist (Bottom Right) */}
      <div className="absolute -bottom-3 -right-1 sm:-bottom-4 sm:-right-2 bg-white/95 backdrop-blur-md rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-lg border border-[#B87D89]/20 hidden md:flex items-center gap-2 motion-safe:animate-float-slow hover:scale-105 transition-transform duration-300 z-10">
        <div className="flex h-6 sm:h-7 w-6 sm:w-7 items-center justify-center rounded-xl bg-[#594250] text-[#EBCFCB] border border-[#594250]/20">
          <Users className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#594250] leading-tight">
            Multi-Therapist
          </p>
          <p className="text-[8.5px] sm:text-[9.5px] text-[#594250]/80 leading-tight">
            Emma, Sarah &amp; Daniel
          </p>
        </div>
      </div>

    </div>
  );
}
