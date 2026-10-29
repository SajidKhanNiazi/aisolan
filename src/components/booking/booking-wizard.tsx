"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookingProgress } from "./booking-progress";
import { ServiceStep } from "./steps/service-step";
import { StaffStep } from "./steps/staff-step";
import { DateTimeStep } from "./steps/datetime-step";
import { DetailsStep } from "./steps/details-step";
import { ReviewStep } from "./steps/review-step";
import {
  createPublicBooking,
  getPublicAppointmentAvailability,
} from "@/features/public-booking/server";
import { Loader2 } from "lucide-react";
import type {
  PublicSalonProfile,
  PublicService,
  PublicSlot,
} from "@/features/public-booking/types";

export interface BookingHandoffPayload {
  serviceId?: string;
  serviceName?: string;
  staffId?: string | null;
  staffName?: string | null;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  startsAtUtc?: string; // ISO
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNotes?: string;
}

export interface BookingWizardProps {
  salon: PublicSalonProfile;
  handoff?: BookingHandoffPayload | null;
}

export function BookingWizard({ salon, handoff }: BookingWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedService, setSelectedService] = useState<PublicService | null>(
    salon.services[0] || null
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Initialize selectedDate to today in YYYY-MM-DD
  const todayIso = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [validatingHandoff, setValidatingHandoff] = useState(false);
  const appliedHandoffRef = useRef<BookingHandoffPayload | null>(null);

  // Generate a stable idempotency key for this wizard booking attempt
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `pub-${crypto.randomUUID()}`;
    }
    return `pub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  });

  const selectedStaffObj = React.useMemo(() => {
    if (!selectedStaffId) return null;
    return salon.staff.find((st) => st.id === selectedStaffId) || null;
  }, [salon.staff, selectedStaffId]);

  // Apply handoff from AI Receptionist
  const applyHandoff = React.useCallback(
    async (data: BookingHandoffPayload) => {
      if (!data) return;
      setValidatingHandoff(true);
      setConflictMessage(null);
      setSubmissionError(null);

      // 1. Resolve Service
      let matchedService: PublicService | null = null;
      if (data.serviceId) {
        matchedService = salon.services.find((s) => s.id === data.serviceId) || null;
      }
      if (!matchedService && data.serviceName) {
        const cleanName = data.serviceName.trim().toLowerCase();
        matchedService =
          salon.services.find((s) => s.name.toLowerCase() === cleanName) ||
          salon.services.find((s) => cleanName.includes(s.name.toLowerCase())) ||
          null;
      }
      if (!matchedService && salon.services.length > 0) {
        matchedService = salon.services[0];
      }
      if (matchedService) {
        setSelectedService(matchedService);
      }

      // 2. Resolve Specialist / Staff
      let matchedStaffId: string | null = null;
      if (data.staffId) {
        const st = salon.staff.find((s) => s.id === data.staffId);
        if (st) matchedStaffId = st.id;
      } else if (
        data.staffName &&
        data.staffName.toLowerCase() !== "any specialist" &&
        data.staffName.toLowerCase() !== "any"
      ) {
        const cleanStaffName = data.staffName.trim().toLowerCase();
        const st =
          salon.staff.find((s) => s.displayName.toLowerCase() === cleanStaffName) ||
          salon.staff.find((s) => cleanStaffName.includes(s.displayName.toLowerCase()));
        if (st) matchedStaffId = st.id;
      }
      setSelectedStaffId(matchedStaffId);

      // 3. Resolve Date
      const targetDate = data.date || todayIso;
      setSelectedDate(targetDate);

      // 4. Resolve Customer Details
      if (data.customerName) setCustomerName(data.customerName.trim());
      if (data.customerPhone) setCustomerPhone(data.customerPhone.trim());
      if (data.customerEmail) setCustomerEmail(data.customerEmail.trim());
      if (data.customerNotes) setCustomerNotes(data.customerNotes.trim());

      // 5. Revalidate Slot Availability
      if (matchedService && targetDate && data.time) {
        try {
          const availRes = await getPublicAppointmentAvailability({
            businessSlug: salon.slug,
            serviceId: matchedService.id,
            staffId: matchedStaffId,
            staffPreference: matchedStaffId ? "specific" : "any",
            date: targetDate,
          });

          if (availRes.success && availRes.data?.slots && availRes.data.slots.length > 0) {
            const cleanTargetTime = data.time.trim().substring(0, 5); // e.g. "09:30"
            const matchingSlot = availRes.data.slots.find(
              (s) =>
                s.localTime.substring(0, 5) === cleanTargetTime ||
                (data.startsAtUtc && s.startsAt === data.startsAtUtc)
            );

            if (matchingSlot) {
              setSelectedSlot(matchingSlot);

              // Check if customer contact info is complete
              const hasName = Boolean(data.customerName && data.customerName.trim().length >= 2);
              const hasPhone = Boolean(data.customerPhone && data.customerPhone.trim().length >= 7);

              if (hasName && hasPhone) {
                setStep(5); // Jump straight to ReviewStep
              } else {
                setStep(4); // DetailsStep to fill missing info
              }
              setValidatingHandoff(false);
              return;
            }
          }

          // Slot unavailable / taken -> Navigate to Step 3 with conflict message
          setSelectedSlot(null);
          setConflictMessage(
            `The ${data.time} slot on ${targetDate} is no longer available. Please choose another available time below.`
          );
          setStep(3);
        } catch (err) {
          console.error("[BookingWizard] Slot validation error:", err);
          setSelectedSlot(null);
          setConflictMessage("Could not verify slot availability. Please select a time slot.");
          setStep(3);
        }
      } else if (matchedService && targetDate) {
        setSelectedSlot(null);
        setStep(3);
      } else if (matchedService) {
        setStep(2);
      } else {
        setStep(1);
      }

      setValidatingHandoff(false);
    },
    [salon, todayIso]
  );

  // Listen to handoff prop changes
  useEffect(() => {
    if (handoff && handoff !== appliedHandoffRef.current) {
      appliedHandoffRef.current = handoff;
      const timer = setTimeout(() => {
        applyHandoff(handoff);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [handoff, applyHandoff]);

  // Listen to custom window event as a resilient secondary bridge
  useEffect(() => {
    const handleWindowEvent = (e: Event) => {
      const customEvent = e as CustomEvent<BookingHandoffPayload>;
      if (customEvent.detail) {
        applyHandoff(customEvent.detail);
      }
    };
    window.addEventListener("bookzello:wizard-handoff", handleWindowEvent);
    return () => {
      window.removeEventListener("bookzello:wizard-handoff", handleWindowEvent);
    };
  }, [applyHandoff]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedSlot) return;

    setSubmitting(true);
    setSubmissionError(null);
    setConflictMessage(null);

    try {
      const res = await createPublicBooking({
        businessSlug: salon.slug,
        serviceId: selectedService.id,
        staffId: selectedStaffId,
        startsAt: selectedSlot.startsAt,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
        idempotencyKey,
      });

      if (!res.success || !res.data) {
        // If slot was taken, navigate back to datetime step with friendly visible message
        if (res.code === "SLOT_TAKEN") {
          setConflictMessage(
            "That time was just booked. Please choose another available slot."
          );
          setSelectedSlot(null);
          setStep(3);
          setSubmitting(false);
          return;
        }

        setSubmissionError(
          res.error || "Unable to confirm your appointment. Please choose another slot."
        );
        setSubmitting(false);
        return;
      }

      // Store booking result in session storage for instant hydration on confirmation page
      try {
        sessionStorage.setItem(
          `booking_confirmed_${res.data.bookingReference}`,
          JSON.stringify(res.data)
        );
      } catch {
        // Ignored
      }

      // Navigate to confirmation page
      const searchParams = new URLSearchParams({
        ref: res.data.bookingReference,
      });
      if (res.data.managementToken) {
        searchParams.set("token", res.data.managementToken);
      }

      router.push(`/booking/${salon.slug}/confirmation?${searchParams.toString()}`);
    } catch (err) {
      console.error("[BookingWizard] Confirm error:", err);
      setSubmissionError("Network error. Please try confirming again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {validatingHandoff && (
        <div
          id="wizard-validating-banner"
          className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-100 text-xs shadow-xs"
        >
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Transferring your AI receptionist choices and checking slot availability...</span>
        </div>
      )}

      <BookingProgress
        currentStep={step}
        onStepClick={(targetStep) => {
          if (targetStep < step) {
            setStep(targetStep as 1 | 2 | 3 | 4 | 5);
          }
        }}
      />

      <div className="mt-4">
        {step === 1 && (
          <ServiceStep
            services={salon.services}
            currency={salon.currency}
            selectedService={selectedService}
            onSelectService={(srv) => {
              setSelectedService(srv);
              // Reset slot if service changes as duration may differ
              setSelectedSlot(null);
            }}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StaffStep
            staffList={salon.staff}
            selectedService={selectedService}
            selectedStaffId={selectedStaffId}
            onSelectStaff={(staffId) => {
              setSelectedStaffId(staffId);
              setSelectedSlot(null);
            }}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && selectedService && (
          <DateTimeStep
            businessSlug={salon.slug}
            selectedService={selectedService}
            selectedStaffId={selectedStaffId}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            conflictMessage={conflictMessage}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSelectedSlot(null);
              setConflictMessage(null);
            }}
            onSelectSlot={(slot) => {
              setSelectedSlot(slot);
              setConflictMessage(null);
            }}
            onBack={() => setStep(2)}
            onContinue={() => setStep(4)}
            timezone={salon.timezone}
          />
        )}

        {step === 4 && (
          <DetailsStep
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            customerNotes={customerNotes}
            onChangeName={setCustomerName}
            onChangeEmail={setCustomerEmail}
            onChangePhone={setCustomerPhone}
            onChangeNotes={setCustomerNotes}
            onBack={() => setStep(3)}
            onContinue={() => setStep(5)}
          />
        )}

        {step === 5 && selectedService && selectedSlot && (
          <ReviewStep
            salon={salon}
            selectedService={selectedService}
            selectedStaff={selectedStaffObj}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            customerNotes={customerNotes}
            onBack={() => setStep(4)}
            onConfirm={handleConfirm}
            submitting={submitting}
            submissionError={submissionError}
          />
        )}
      </div>
    </div>
  );
}
