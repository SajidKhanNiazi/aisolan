"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, MessageSquare } from "lucide-react";
import { RequestDemoModal } from "./request-demo-modal";

interface HeroCtaProps {
  primaryLabel?: string;
  secondaryLabel?: string;
  demoUrl?: string;
}

export function HeroCta({
  primaryLabel = "Explore the Booking Demo",
  secondaryLabel = "Request a Demo",
  demoUrl = "/booking/bookpilot-qa-salon",
}: HeroCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
        <Link
          href={demoUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8F87] px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-[#086F69] focus:outline-none focus:ring-2 focus:ring-[#0A8F87] focus:ring-offset-2 transition-all active:scale-[0.99]"
        >
          <span>{primaryLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8E6DF] bg-white px-6 py-3.5 text-base font-semibold text-[#142B43] shadow-2xs hover:bg-[#F7F6F2] hover:border-[#142B43]/30 focus:outline-none focus:ring-2 focus:ring-[#0A8F87] transition-all cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-[#0A8F87]" />
          <span>{secondaryLabel}</span>
        </button>
      </div>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic="Salon Booking Software Walkthrough"
      />
    </>
  );
}

export function ActionBannerCta({
  primaryLabel = "Explore the Booking Demo",
  secondaryLabel = "Request a Demo",
  demoUrl = "/booking/bookpilot-qa-salon",
}: HeroCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href={demoUrl}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8F87] px-7 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-[#086F69] focus:outline-none focus:ring-2 focus:ring-[#0A8F87] transition-all"
        >
          <span>{primaryLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#142B43] bg-transparent px-7 py-3.5 text-base font-semibold text-[#142B43] hover:bg-[#142B43] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0A8F87] transition-all cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-current" />
          <span>{secondaryLabel}</span>
        </button>
      </div>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic="Salon Booking Software Walkthrough"
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
        className="inline-flex items-center gap-2 rounded-xl border border-[#0A8F87] bg-[#E6F5F4] px-5 py-3 text-sm font-semibold text-[#0A8F87] hover:bg-[#d5eeec] focus:outline-none focus:ring-2 focus:ring-[#0A8F87] transition-all cursor-pointer"
      >
        <MessageSquare className="h-4 w-4 text-[#0A8F87]" />
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
