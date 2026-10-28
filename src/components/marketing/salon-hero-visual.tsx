import React from "react";
import Image from "next/image";
import { 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Sparkles
} from "lucide-react";

export function SalonHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[440px] lg:max-w-none pt-4 sm:pt-6 px-1 sm:px-4">
      {/* Ambient Multi-Layer Blue Radial Mesh Backdrop with Pulse Animation */}
      <div 
        className="absolute -inset-2 sm:-inset-10 rounded-full bg-gradient-to-tr from-[#1D64EC]/25 via-[#0091FF]/20 to-transparent blur-3xl -z-10 pointer-events-none animate-pulse-glow"
        aria-hidden="true"
      />
      <div 
        className="absolute -top-10 -right-8 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-cyan-400/15 blur-2xl -z-10 pointer-events-none animate-pulse-glow"
        aria-hidden="true"
      />

      {/* Main Stylist Image Container */}
      <div className="relative mx-auto aspect-3/4 w-full max-w-[310px] sm:max-w-[410px] overflow-hidden rounded-[2.25rem] sm:rounded-[2.75rem] border border-blue-100/90 bg-gradient-to-b from-blue-50/50 via-white to-blue-50/30 shadow-2xl shadow-blue-500/20">
        <Image
          src="/images/salon-stylist-hero.jpg"
          alt="Professional hair salon owner using Bookzello hair salon management software"
          fill
          priority
          sizes="(max-width: 640px) 310px, (max-width: 1024px) 410px, 480px"
          className="object-cover object-top"
        />

        {/* Soft bottom inner gradient for clean visual blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent pointer-events-none" />

        {/* Live Status Tag inside image bottom center */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1 text-[10px] font-semibold text-white border border-white/10 shadow-lg">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Salon Hub Active</span>
        </div>
      </div>

      {/* Floating Card 1: Zero Overlaps / Collision Protection (Top Left) */}
      <div className="absolute -top-2 left-0 sm:-top-5 sm:-left-6 glass-floating rounded-2xl p-2 sm:p-3.5 shadow-xl border border-white/95 max-w-[170px] sm:max-w-[230px] animate-float-slow hover:scale-105 transition-transform duration-300 z-10">
        <div className="flex items-start gap-2 sm:gap-2.5">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1D64EC] to-[#0091FF] text-white shadow-sm shadow-blue-500/30">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 leading-tight">
                No Double Bookings
              </p>
            </div>
            <p className="text-[8.5px] sm:text-[10px] text-slate-500 leading-tight">
              Buffers &amp; shifts verified
            </p>
          </div>
        </div>
      </div>

      {/* Floating Card 2: Today's Salon Schedule (Mid Right - clears face completely) */}
      <div className="absolute top-[32%] -right-1 sm:top-[26%] sm:-right-8 glass-floating rounded-2xl p-2 sm:p-3 shadow-xl border border-white/95 min-w-[170px] sm:min-w-[220px] animate-float-delayed hover:scale-105 transition-transform duration-300 z-10">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#1D64EC]" />
            <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-900">Today&apos;s Schedule</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-emerald-600">
            Live
          </span>
        </div>
        <div className="space-y-1 pt-1.5 text-[9px] sm:text-[10px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900">09:00</span>
              <span className="text-slate-700">Cut &amp; Blow-Dry</span>
            </div>
            <span className="text-[#1D64EC] font-semibold text-[8px] sm:text-[8.5px]">Elena V.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900">10:15</span>
              <span className="text-slate-700">Balayage &amp; Style</span>
            </div>
            <span className="text-[#1D64EC] font-semibold text-[8px] sm:text-[8.5px]">Maya L.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900">11:30</span>
              <span className="text-slate-700">Beard &amp; Haircut</span>
            </div>
            <span className="text-[#1D64EC] font-semibold text-[8px] sm:text-[8.5px]">Marcus T.</span>
          </div>
        </div>
      </div>

      {/* Floating Card 3: Online Booking Confirmed Alert (Bottom Left) */}
      <div className="absolute -bottom-3 left-0 sm:-bottom-5 sm:-left-6 glass-floating rounded-2xl p-2 sm:p-3 shadow-xl border border-white/95 flex items-center gap-2 sm:gap-2.5 animate-float-slow hover:scale-105 transition-transform duration-300 z-10 max-w-[200px] sm:max-w-none">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-sm shadow-emerald-500/30">
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-900 leading-tight">Booking Confirmed</p>
            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
          </div>
          <p className="text-[8.5px] sm:text-[9.5px] text-slate-600 leading-tight mt-0.5">
            Sarah M. • Classic Cut • 2:00 PM
          </p>
          <p className="text-[7.5px] sm:text-[8.5px] text-slate-400 leading-tight">
            Elena Vance (35m + 5m buffer)
          </p>
        </div>
      </div>

      {/* Floating Card 4: Staff Availability Counter (Bottom Right) */}
      <div className="absolute -bottom-2 right-0 sm:bottom-3 sm:-right-6 glass-floating rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl border border-white/95 flex items-center gap-1.5 sm:gap-2 animate-float-delayed hover:scale-105 transition-transform duration-300 z-10">
        <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1D64EC]">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div>
          <p className="text-[9.5px] sm:text-[11px] font-bold text-[#1D64EC] leading-tight">
            3 Stylists
          </p>
          <p className="text-[8px] sm:text-[9px] font-medium text-slate-500 leading-tight">
            Active Availability
          </p>
        </div>
      </div>
    </div>
  );
}
