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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-8 py-4 text-base font-semibold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#AF6D7B] transition-all active:scale-[0.99] cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-[#EBC9C5]" />
          <span>{label}</span>
          <ArrowRight className="h-4 w-4 text-[#EBC9C5]" />
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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#27232B] hover:bg-[#553B4B] px-7 py-3.5 text-base font-semibold text-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#AF6D7B] transition-all active:scale-[0.99] cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-[#EBC9C5]" />
          <span>{label}</span>
          <ArrowRight className="h-4 w-4 text-[#EBC9C5]" />
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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#FBF6F3] px-8 py-4 text-base font-semibold text-[#27232B] shadow-lg shadow-black/10 focus:outline-none focus:ring-2 focus:ring-[#AF6D7B] transition-all active:scale-[0.99] cursor-pointer"
        >
          <Calendar className="h-4 w-4 text-[#AF6D7B]" />
          <span>{label}</span>
          <ArrowRight className="h-4 w-4 text-[#AF6D7B]" />
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
