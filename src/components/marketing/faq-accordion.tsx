"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  // First item open by default for immediate engagement
  const [openIds, setOpenIds] = useState<string[]>([items[0]?.id || ""]);

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-3.5">
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div
            key={item.id}
            className="rounded-xl border border-[#E8E6DF] bg-white soft-card overflow-hidden transition-all duration-200"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              className="flex w-full items-center justify-between p-5 sm:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F87]"
            >
              <h3 className="text-base sm:text-lg font-semibold text-[#142B43] pr-4">
                {item.question}
              </h3>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FBFAF8] border border-[#E8E6DF] text-[#142B43] transition-transform duration-200 ${
                  isOpen ? "rotate-180 bg-[#E6F5F4] text-[#0A8F87] border-[#0A8F87]/30" : ""
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${item.id}`}
                className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-sm sm:text-base text-[#334E68] leading-relaxed border-t border-[#E8E6DF]/50 animate-in fade-in-50 duration-150"
              >
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
