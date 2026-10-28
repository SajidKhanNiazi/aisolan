"use client";

import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  LayoutDashboard, 
  Bot, 
  Smartphone, 
  Sparkles
} from "lucide-react";

type ShowcaseTab = "booking" | "dashboard" | "calendar" | "aichat";

export function UiShowcase() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("booking");

  return (
    <div className="w-full">
      {/* Tab Selector Buttons */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("booking")}
          className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "booking"
              ? "bg-[#1D64EC] text-white shadow-md shadow-blue-500/25"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Online Booking Page</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-[#1D64EC] text-white shadow-md shadow-blue-500/25"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Salon Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "calendar"
              ? "bg-[#1D64EC] text-white shadow-md shadow-blue-500/25"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Staff &amp; Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("aichat")}
          className={`inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "aichat"
              ? "bg-[#1D64EC] text-white shadow-md shadow-blue-500/25"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>AI Chat Assistant</span>
        </button>
      </div>

      {/* Screen Frame Container (Ready for genuine screenshots or polished UI mockups) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-200/50">
        {/* Browser Top Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
            <span className="ml-2 text-xs font-medium text-slate-400">
              bookzello.com/booking/luxe-salon
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1D64EC]">
            <Sparkles className="h-3 w-3" />
            <span>Interactive Software Preview</span>
          </span>
        </div>

        {/* Tab Content Display */}
        <div className="p-4 sm:p-8 bg-white min-h-[380px] flex items-center justify-center">
          {activeTab === "booking" && (
            <div className="w-full max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Luxe Hair &amp; Beauty Studio</h4>
                  <p className="text-xs text-slate-500">Select treatment, preferred stylist, and available time</p>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-600 text-xs px-2.5 py-1 font-semibold">
                  Open for Booking
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border-2 border-[#1D64EC] bg-blue-50/40 p-4 relative">
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-[#1D64EC] bg-white rounded-full px-2 py-0.5 shadow-xs">
                    Popular
                  </span>
                  <p className="text-sm font-bold text-slate-900">Signature Cut &amp; Finish</p>
                  <p className="text-xs text-slate-500 mt-1">45 mins • Elena Vance</p>
                  <p className="text-base font-extrabold text-[#1D64EC] mt-3">£48.00</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300">
                  <p className="text-sm font-bold text-slate-900">Balayage &amp; Toner</p>
                  <p className="text-xs text-slate-500 mt-1">120 mins • Maya Lin</p>
                  <p className="text-base font-extrabold text-slate-900 mt-3">£120.00</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300">
                  <p className="text-sm font-bold text-slate-900">Beard Trim &amp; Groom</p>
                  <p className="text-xs text-slate-500 mt-1">30 mins • Marcus T.</p>
                  <p className="text-base font-extrabold text-slate-900 mt-3">£28.00</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span>Available times for Elena Vance (Tomorrow)</span>
                  <span className="text-[#1D64EC]">Real-time Availability</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  <span className="rounded-xl border border-[#1D64EC] bg-white py-2 text-center text-xs font-bold text-[#1D64EC] shadow-xs">
                    09:30 AM
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs text-slate-700 hover:border-blue-300">
                    10:30 AM
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs text-slate-700 hover:border-blue-300">
                    11:15 AM
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs text-slate-700 hover:border-blue-300">
                    02:00 PM
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs text-slate-700 hover:border-blue-300">
                    03:30 PM
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs text-slate-700 hover:border-blue-300">
                    04:15 PM
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="w-full max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-[#1D64EC]" />
                  <h4 className="text-base font-bold text-slate-900">Salon Operations Dashboard</h4>
                </div>
                <span className="rounded-full bg-blue-50 text-[#1D64EC] text-xs px-2.5 py-1 font-semibold">
                  Today: 18 Appointments
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Confirmed Today</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">18</p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">100% on schedule</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Staff on Shift</p>
                  <p className="text-2xl font-black text-[#1D64EC] mt-1">4</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Elena, Marcus, Maya, Sam</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Collision Rate</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">0%</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Zero double bookings</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-800">Upcoming in the next 2 hours:</p>
                <div className="flex items-center justify-between rounded-xl bg-blue-50/50 p-2.5 text-xs">
                  <span className="font-bold text-[#1D64EC]">09:30 AM</span>
                  <span className="font-semibold text-slate-800">Sarah Jenkins (Cut &amp; Blow-Dry)</span>
                  <span className="text-slate-500">Stylist: Elena</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 font-bold">Confirmed</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs">
                  <span className="font-bold text-slate-700">10:00 AM</span>
                  <span className="font-semibold text-slate-800">David Ross (Beard &amp; Line-Up)</span>
                  <span className="text-slate-500">Barber: Marcus</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 font-bold">Confirmed</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="w-full max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-[#1D64EC]" />
                  <h4 className="text-base font-bold text-slate-900">Multi-Stylist Weekly Calendar</h4>
                </div>
                <span className="text-xs text-slate-500">27 Oct – 02 Nov 2026</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-3.5">
                  <p className="text-xs font-bold text-slate-900">Elena Vance</p>
                  <p className="text-[10px] text-slate-500">Tue – Sat: 09:00 – 17:30</p>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="rounded-lg bg-blue-600 text-white p-2 text-[10px] font-medium">
                      09:00 – Wash &amp; Style
                    </div>
                    <div className="rounded-lg bg-blue-600 text-white p-2 text-[10px] font-medium">
                      11:30 – Balayage
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <p className="text-xs font-bold text-slate-900">Marcus Thorne</p>
                  <p className="text-[10px] text-slate-500">Mon – Fri: 10:00 – 18:30</p>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="rounded-lg bg-slate-800 text-white p-2 text-[10px] font-medium">
                      10:00 – Skin Fade
                    </div>
                    <div className="rounded-lg bg-slate-800 text-white p-2 text-[10px] font-medium">
                      11:15 – Hot Shave
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <p className="text-xs font-bold text-slate-900">Maya Lin</p>
                  <p className="text-[10px] text-slate-500">Wed – Sun: 09:30 – 18:00</p>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="rounded-lg bg-sky-600 text-white p-2 text-[10px] font-medium">
                      09:30 – Color Gloss
                    </div>
                    <div className="rounded-lg bg-sky-600 text-white p-2 text-[10px] font-medium">
                      12:00 – Highlights
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "aichat" && (
            <div className="w-full max-w-lg mx-auto rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1D64EC] to-[#0091FF] text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Bookzello AI Receptionist</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Online &amp; Answering 24/7
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-3.5 py-2.5 text-slate-800 shadow-xs max-w-[85%]">
                    Hi! Welcome to Luxe Salon. I can check our openings, answer pricing questions, or book an appointment for you!
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-[#1D64EC] px-3.5 py-2.5 text-white shadow-xs max-w-[85%]">
                    Can I get a haircut tomorrow around 10am with Elena?
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-3.5 py-2.5 text-slate-800 shadow-xs max-w-[85%]">
                    Yes! Elena Vance has an opening tomorrow (Thursday) at <strong className="text-[#1D64EC]">10:30 AM</strong> for a Haircut &amp; Finish (£48). Would you like me to reserve that slot for you?
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
