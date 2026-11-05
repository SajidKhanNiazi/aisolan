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
            className="rounded-2xl border border-stone-200/70 bg-white hover:border-rose-200/80 transition-all duration-200 shadow-2xs overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              className="flex w-full items-center justify-between p-5 sm:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 cursor-pointer"
            >
              <h3 className="text-base sm:text-lg font-semibold text-stone-900 pr-4">
                {item.question}
              </h3>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FCFAF8] border border-stone-200/70 text-stone-600 transition-all duration-200 ${
                  isOpen ? "rotate-180 bg-rose-50 text-rose-800 border-rose-200/80" : ""
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>

            <div
              id={`faq-answer-${item.id}`}
              className={`px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-sm sm:text-base text-stone-600 leading-relaxed border-t border-stone-100 ${
                isOpen ? "block animate-in fade-in-50 duration-150" : "hidden"
              }`}
            >
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
