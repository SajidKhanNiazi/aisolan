"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, MessageSquare } from "lucide-react";
import { RequestDemoModal } from "./request-demo-modal";

interface HeroCtaProps {
  primaryLabel?: string;
  secondaryLabel?: string;
  demoUrl?: string;
  className?: string;
}

export function HeroCta({
  primaryLabel = "Start Free",
  secondaryLabel = "Book a Demo",
  demoUrl = "/booking/bookpilot-qa-salon",
  className = "",
}: HeroCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 ${className}`}>
        <Link
          href={demoUrl}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1852E8] to-[#00D2FF] px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#1852E8] focus:ring-offset-2 transition-all active:scale-[0.99]"
        >
          <span>{primaryLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1852E8] transition-all cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-[#1852E8]" />
          <span>{secondaryLabel}</span>
        </button>
      </div>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic="Bookzello AI Salon Booking Walkthrough"
      />
    </>
  );
}

export function ActionBannerCta({
  primaryLabel = "Start Free",
  secondaryLabel = "Book a Demo",
  demoUrl = "/booking/bookpilot-qa-salon",
}: HeroCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href={demoUrl}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-[#1852E8] shadow-lg shadow-black/10 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white transition-all hover:scale-[1.02]"
        >
          <span>{primaryLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 backdrop-blur-md px-7 py-3.5 text-base font-semibold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white transition-all cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-white" />
          <span>{secondaryLabel}</span>
        </button>
      </div>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic="Bookzello AI Demo Request"
      />
    </>
  );
}

export function AiReceptionistCta({
  label = "Ask About AI Receptionist Availability",
}: {
  label?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#1852E8] hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-[#1852E8] transition-all cursor-pointer"
      >
        <MessageSquare className="h-4 w-4 text-[#1852E8]" />
        <span>{label}</span>
      </button>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic="AI Receptionist Availability"
      />
    </>
  );
}
