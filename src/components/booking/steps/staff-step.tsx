"use client";

import React from "react";
import { Sparkles, User, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PublicStaff, PublicService } from "@/features/public-booking/types";

interface StaffStepProps {
  staffList: PublicStaff[];
  selectedService: PublicService | null;
  selectedStaffId: string | null; // null = Any Available
  onSelectStaff: (staffId: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function StaffStep({
  staffList,
  selectedService,
  selectedStaffId,
  onSelectStaff,
  onBack,
  onContinue,
}: StaffStepProps) {
  // Filter eligible staff for this service if assignedStaffIds is provided
  const eligibleStaff = React.useMemo(() => {
    if (!selectedService || !selectedService.assignedStaffIds || selectedService.assignedStaffIds.length === 0) {
      return staffList;
    }
    return staffList.filter((st) => selectedService.assignedStaffIds.includes(st.id));
  }, [staffList, selectedService]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Choose a Specialist
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Select a preferred team member or pick &quot;Any Available&quot; for the widest time slots.
        </p>
      </div>

      <div className="space-y-3">
        {/* Option 1: Any Available Specialist */}
        <div
          role="radio"
          aria-checked={selectedStaffId === null}
          tabIndex={0}
          onClick={() => onSelectStaff(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectStaff(null);
            }
          }}
          className={cn(
            "relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
            selectedStaffId === null
              ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-500 shadow-sm"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  Any Available Specialist
                </span>
                <span className="text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  Fastest
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                We will match you with the first available qualified team member.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ml-2",
              selectedStaffId === null
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 dark:border-zinc-600 bg-transparent"
            )}
          >
            {selectedStaffId === null && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>

        {/* Specific Staff Options */}
        {eligibleStaff.length === 0 ? (
          <Card className="p-4 text-center text-xs text-zinc-500">
            No specific team members are directly assigned to this service. Please select &quot;Any Available Specialist&quot;.
          </Card>
        ) : (
          eligibleStaff.map((staff) => {
            const isSelected = selectedStaffId === staff.id;

            return (
              <div
                key={staff.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => onSelectStaff(staff.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectStaff(staff.id);
                  }
                }}
                className={cn(
                  "relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-500 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 font-medium text-sm">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {staff.displayName}
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Salon Specialist
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ml-2",
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between pt-4 gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          size="lg"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          onClick={onContinue}
          size="lg"
          className="min-w-[140px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
