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
      {/* Soft Beauty Ambient Glow with Rose/Champagne tones */}
      <div 
        className="absolute -inset-4 sm:-inset-10 rounded-full bg-gradient-to-tr from-rose-200/40 via-amber-100/30 to-rose-100/20 blur-3xl -z-10 pointer-events-none animate-pulse-glow"
        aria-hidden="true"
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-rose-300/15 blur-2xl -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Stylist Image Container - Salon-luxe frame */}
      <div className="relative mx-auto aspect-3/4 w-full max-w-[340px] sm:max-w-[400px] overflow-hidden rounded-[2.5rem] border border-rose-200/60 bg-gradient-to-b from-stone-50 via-white to-rose-50/30 shadow-2xl shadow-stone-900/10">
        <Image
          src="/images/salon-stylist-hero.jpg"
          alt="Professional salon owner and stylist using Bookzello AI salon booking software"
          fill
          priority
          sizes="(max-width: 640px) 340px, (max-width: 1024px) 400px, 460px"
          className="object-cover object-top"
        />

        {/* Delicate vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Floating Card 1: AI Chat Assistant Bubble (Top Left - Leaves face clear) */}
      <div className="absolute -top-1 -left-2 sm:-top-3 sm:-left-6 rounded-2xl p-3 sm:p-3.5 shadow-xl shadow-stone-900/8 bg-white/95 backdrop-blur-md border border-stone-200/70 max-w-[190px] sm:max-w-[230px] animate-float-slow hover:scale-105 transition-transform duration-300">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-xs">
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-[10.5px] sm:text-[11.5px] font-bold text-stone-900 leading-tight">Hi! I&apos;m Bookzello AI</p>
            <p className="text-[9.5px] sm:text-[10.5px] text-stone-500 leading-tight">How can I help you today?</p>
            <div className="flex flex-col gap-1 pt-1">
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-200/80 bg-rose-50/80 px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-medium text-rose-800">
                <span>💬 Book appointment</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-medium text-stone-700">
                <span>📅 Check availability</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Card 2: Today's Appointments Schedule (Mid Right) */}
      <div className="absolute top-[46%] -right-2 sm:top-[28%] sm:-right-8 rounded-2xl p-3 sm:p-3.5 shadow-xl shadow-stone-900/8 bg-white/95 backdrop-blur-md border border-stone-200/70 min-w-[185px] sm:min-w-[220px] animate-float-delayed hover:scale-105 transition-transform duration-300">
        <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-stone-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-rose-700" />
            <span className="text-[10.5px] sm:text-[11.5px] font-bold text-stone-900">Appointments</span>
          </div>
          <span className="rounded-full bg-rose-50 border border-rose-200/60 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-semibold text-rose-800">
            Today
          </span>
        </div>
        <div className="space-y-1.5 pt-2 text-[9.5px] sm:text-[10px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-900">9:00</span>
              <span className="text-stone-700">Hair Cut</span>
            </div>
            <span className="text-stone-400 text-[8.5px] sm:text-[9px]">Emma R.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-900">10:30</span>
              <span className="text-stone-700">Color &amp; Style</span>
            </div>
            <span className="text-stone-400 text-[8.5px] sm:text-[9px]">Sophia L.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-900">12:00</span>
              <span className="text-stone-700">Facial Care</span>
            </div>
            <span className="text-stone-400 text-[8.5px] sm:text-[9px]">Olivia M.</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-900">2:00</span>
              <span className="text-stone-700">Manicure</span>
            </div>
            <span className="text-stone-400 text-[8.5px] sm:text-[9px]">Ava K.</span>
          </div>
        </div>
      </div>

      {/* Floating Card 3: Appointment Confirmation Alert (Bottom Left) */}
      <div className="absolute -bottom-3 -left-2 sm:-bottom-5 sm:-left-6 rounded-2xl p-2.5 sm:p-3 shadow-xl shadow-stone-900/8 bg-white/95 backdrop-blur-md border border-stone-200/70 flex items-center gap-2.5 animate-float-slow hover:scale-105 transition-transform duration-300">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white" />
        </div>
        <div>
          <p className="text-[9.5px] sm:text-[10px] font-bold text-stone-900 leading-tight">Bookzello AI</p>
          <p className="text-[9.5px] sm:text-[10.5px] font-medium text-stone-700 leading-tight">Your appointment is confirmed! ✅</p>
          <p className="text-[8.5px] sm:text-[9px] text-stone-400 leading-tight">Sat, 12 Apr at 10:00 AM</p>
        </div>
      </div>

      {/* Floating Card 4: Growth Badge (Bottom Right) */}
      <div className="absolute -bottom-1 right-2 sm:bottom-4 sm:-right-6 rounded-2xl px-3 py-2 shadow-xl shadow-stone-900/8 bg-white/95 backdrop-blur-md border border-stone-200/70 flex items-center gap-2 animate-float-delayed hover:scale-105 transition-transform duration-300">
        <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div>
          <p className="text-[9.5px] sm:text-[10.5px] font-bold text-stone-900 leading-tight">More Clients</p>
          <p className="text-[8.5px] sm:text-[9px] font-medium text-stone-500 leading-tight">More Growth</p>
        </div>
      </div>
    </div>
  );
}
