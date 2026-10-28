import React from "react";
import Image from "next/image";
import { 
  Bot, 
  Calendar, 
  TrendingUp, 
  MessageSquare
} from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[440px] lg:max-w-none pt-4 sm:pt-6">
      {/* Ambient Blue Radial Glow Backdrop with Pulse Animation */}
      <div 
        className="absolute -inset-4 sm:-inset-12 rounded-full bg-gradient-to-tr from-[#1D64EC]/25 via-[#0091FF]/20 to-transparent blur-3xl -z-10 pointer-events-none animate-pulse-glow"
        aria-hidden="true"
      />

      {/* Main Stylist Image Container */}
      <div className="relative mx-auto aspect-3/4 w-full max-w-[340px] sm:max-w-[400px] overflow-hidden rounded-[2.5rem] border border-blue-100/90 bg-gradient-to-b from-blue-50/50 via-white to-blue-50/30 shadow-2xl shadow-blue-500/20">
        <Image
          src="/images/salon-stylist-hero.jpg"
          alt="Professional salon owner and stylist using Bookzello AI salon booking software"
          fill
          priority
          sizes="(max-width: 640px) 340px, (max-width: 1024px) 400px, 460px"
          className="object-cover object-top"
        />

        {/* Soft bottom inner gradient for clean visual blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Floating Card 1: AI Chat Assistant Bubble (Top Left - Shoulder/Bokeh area, leaves face clear) */}
      <div className="absolute -top-1 -left-2 sm:-top-4 sm:-left-8 glass-floating rounded-2xl p-2.5 sm:p-3.5 shadow-xl border border-white/95 max-w-[185px] sm:max-w-[230px] animate-float-slow hover:scale-105 transition-transform duration-300">
        <div className="flex items-start gap-2 sm:gap-2.5">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1D64EC] to-[#0091FF] text-white shadow-sm shadow-blue-500/30">
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 leading-tight">Hi! I&apos;m Bookzello AI</p>
            <p className="text-[9px] sm:text-[10px] text-slate-500 leading-tight">How can I help you today?</p>
            <div className="flex flex-col gap-1 pt-1">
              <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/90 px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-medium text-blue-700">
                <span>💬 Book appointment</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/90 px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-medium text-slate-600">
                <span>📅 Check availability</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Card 2: Today's Appointments Schedule (Placed at Mid/Tablet level - completely clears face and eyes!) */}
      <div className="absolute top-[46%] -right-2 sm:top-[28%] sm:-right-8 glass-floating rounded-2xl p-2.5 sm:p-3.5 shadow-xl border border-white/95 min-w-[180px] sm:min-w-[215px] animate-float-delayed hover:scale-105 transition-transform duration-300">
        <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#1D64EC]" />
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-900">Appointments</span>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-semibold text-[#1D64EC]">
            Today
          </span>
        </div>
        <div className="space-y-1.5 pt-1.5 sm:pt-2 text-[9.5px] sm:text-[10px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">9:00</span>
              <span className="text-slate-700">Hair Cut</span>
            </div>
            <span className="text-slate-400 text-[8.5px] sm:text-[9px]">Emma R.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">10:30</span>
              <span className="text-slate-700">Color &amp; Style</span>
            </div>
            <span className="text-slate-400 text-[8.5px] sm:text-[9px]">Sophia L.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">12:00</span>
              <span className="text-slate-700">Facial Care</span>
            </div>
            <span className="text-slate-400 text-[8.5px] sm:text-[9px]">Olivia M.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">2:00</span>
              <span className="text-slate-700">Manicure</span>
            </div>
            <span className="text-slate-400 text-[8.5px] sm:text-[9px]">Ava K.</span>
          </div>
        </div>
      </div>

      {/* Floating Card 3: WhatsApp Confirmation Alert (Bottom Left) */}
      <div className="absolute -bottom-3 -left-2 sm:-bottom-5 sm:-left-6 glass-floating rounded-2xl p-2 sm:p-3 shadow-xl border border-white/95 flex items-center gap-2 sm:gap-2.5 animate-float-slow hover:scale-105 transition-transform duration-300">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm shadow-emerald-500/30">
          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white" />
        </div>
        <div>
          <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-900 leading-tight">Bookzello AI</p>
          <p className="text-[9.5px] sm:text-[10px] font-medium text-slate-700 leading-tight">Your appointment is confirmed! ✅</p>
          <p className="text-[8.5px] sm:text-[9px] text-slate-400 leading-tight">Sat, 12 Apr at 10:00 AM</p>
        </div>
      </div>

      {/* Floating Card 4: More Growth Badge (Bottom Right) */}
      <div className="absolute -bottom-1 right-2 sm:bottom-4 sm:-right-6 glass-floating rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl border border-white/95 flex items-center gap-1.5 sm:gap-2 animate-float-delayed hover:scale-105 transition-transform duration-300">
        <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1D64EC]">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div>
          <p className="text-[9.5px] sm:text-[10px] font-black text-[#1D64EC] leading-tight">More Clients</p>
          <p className="text-[8.5px] sm:text-[9px] font-medium text-slate-500 leading-tight">More Growth</p>
        </div>
      </div>
    </div>
  );
}
