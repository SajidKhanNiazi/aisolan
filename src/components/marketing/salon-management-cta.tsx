"use client";

import React, { useState } from "react";
import { ArrowRight, Calendar } from "lucide-react";
import { RequestDemoModal } from "./request-demo-modal";

interface SalonCtaProps {
  label?: string;
  className?: string;
  topic?: string;
}

export function SalonHeroCta({
  label = "Request a Demo",
  className = "",
  topic = "Hair Salon Management Software Walkthrough",
}: SalonCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 ${className}`}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1852E8] to-[#00D2FF] px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#1852E8] focus:ring-offset-2 transition-all cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          <span>{label}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic={topic}
      />
    </>
  );
}

export function SalonInlineCta({
  label = "Request a Demo",
  className = "",
  topic = "Salon Workflow Demonstration",
}: SalonCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className={`inline-block ${className}`}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1852E8] to-[#00D2FF] px-7 py-3.5 text-base font-bold text-white shadow-md shadow-blue-500/20 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#1852E8] transition-all cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          <span>{label}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic={topic}
      />
    </>
  );
}

export function SalonBannerCta({
  label = "Request a Demo",
  topic = "Salon Management Software Consultation",
}: SalonCtaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#1852E8] shadow-lg shadow-black/10 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-white transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-[#1852E8]" />
          <span>{label}</span>
          <ArrowRight className="h-4 w-4 text-[#1852E8]" />
        </button>
      </div>

      <RequestDemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultTopic={topic}
      />
    </>
  );
}
