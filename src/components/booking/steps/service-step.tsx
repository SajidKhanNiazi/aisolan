"use client";

import React from "react";
import { Clock, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublicService } from "@/features/public-booking/types";
import { formatCurrency } from "@/features/services/types";

interface ServiceStepProps {
  services: PublicService[];
  currency: string;
  selectedService: PublicService | null;
  onSelectService: (service: PublicService) => void;
  onContinue: () => void;
}

export function ServiceStep({
  services,
  currency,
  selectedService,
  onSelectService,
  onContinue,
}: ServiceStepProps) {

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Select a Service
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Choose the treatment or service you would like to book today.
        </p>
      </div>

      {services.length === 0 ? (
        <Card className="p-8 text-center text-zinc-500">
          <p className="text-sm">No services are currently available for online booking.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => {
            const isBookable = service.isBookable !== false;
            const isSelected = selectedService?.id === service.id;

            return (
              <div
                key={service.id}
                role="radio"
                aria-checked={isSelected}
                aria-disabled={!isBookable}
                tabIndex={isBookable ? 0 : -1}
                onClick={() => {
                  if (isBookable) {
                    onSelectService(service);
                  }
                }}
                onKeyDown={(e) => {
                  if (isBookable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelectService(service);
                  }
                }}
                className={cn(
                  "relative flex flex-col justify-between p-4 rounded-xl border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500",
                  !isBookable
                    ? "border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 opacity-75 cursor-not-allowed select-none"
                    : isSelected
                    ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-500 shadow-sm cursor-pointer"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                          {service.name}
                        </h3>
                        {!isBookable && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 py-0"
                          >
                            Currently Unavailable
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isBookable ? (
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        Offline
                      </span>
                    )}
                  </div>

                  {service.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  {!isBookable && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 font-medium">
                      No specialists currently available for this service. Please check back later or contact the salon directly.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{service.durationMinutes} mins</span>
                    {service.bufferMinutes > 0 && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        +{service.bufferMinutes}m clean
                      </Badge>
                    )}
                  </div>

                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(service.priceAmount, service.currency || currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={onContinue}
          disabled={!selectedService || selectedService.isBookable === false}
          size="lg"
          className="w-full sm:w-auto min-w-[140px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
