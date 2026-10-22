"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Service" },
  { id: 2, label: "Specialist" },
  { id: 3, label: "Date & Time" },
  { id: 4, label: "Your Details" },
  { id: 5, label: "Review" },
];

interface BookingProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function BookingProgress({
  currentStep,
  onStepClick,
}: BookingProgressProps) {
  return (
    <nav aria-label="Booking Progress" className="w-full py-4">
      <div className="flex items-center justify-between max-w-xl mx-auto px-2">
        {STEPS.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <React.Fragment key={step.id}>
              {/* Step item */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick(step.id)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                    isCurrent &&
                      "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950 shadow-sm",
                    isCompleted &&
                      "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer",
                    !isCurrent &&
                      !isCompleted &&
                      "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </button>
                <span
                  className={cn(
                    "text-[11px] font-medium mt-1.5 hidden sm:block text-center transition-colors",
                    isCurrent && "text-blue-600 dark:text-blue-400 font-semibold",
                    isCompleted && "text-zinc-700 dark:text-zinc-300",
                    !isCurrent && !isCompleted && "text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-200",
                    step.id < currentStep
                      ? "bg-emerald-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Mobile step label below */}
      <div className="sm:hidden text-center mt-2">
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.label}
        </span>
      </div>
    </nav>
  );
}
