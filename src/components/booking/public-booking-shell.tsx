"use client";

import React, { useState } from "react";
import { BookingWizard, type BookingHandoffPayload } from "./booking-wizard";
import { CustomerChat } from "@/components/ai-receptionist/customer-chat";
import { Card } from "@/components/ui/card";
import type { PublicSalonProfile } from "@/features/public-booking/types";
import type { PublicAiConfig } from "@/features/ai-receptionist/types";

interface PublicBookingShellProps {
  salon: PublicSalonProfile;
  aiConfig?: PublicAiConfig | null;
}

/**
 * Client coordinator shell for public booking.
 * Connects the AI Receptionist chat and the standard BookingWizard,
 * enabling seamless state handoff from conversational draft into wizard review.
 */
export function PublicBookingShell({ salon, aiConfig }: PublicBookingShellProps) {
  const [handoff, setHandoff] = useState<BookingHandoffPayload | null>(null);

  return (
    <>
      <Card
        id="booking-wizard-card"
        className="p-4 sm:p-6 shadow-sm border-zinc-200 dark:border-zinc-800"
      >
        <BookingWizard salon={salon} handoff={handoff} />
      </Card>

      {aiConfig && (
        <CustomerChat
          businessSlug={salon.slug}
          salonName={salon.name}
          aiConfig={aiConfig}
          onCompleteInWizard={(payload) => {
            setHandoff(payload);
          }}
        />
      )}
    </>
  );
}
