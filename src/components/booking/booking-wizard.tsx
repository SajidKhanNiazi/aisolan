"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingProgress } from "./booking-progress";
import { ServiceStep } from "./steps/service-step";
import { StaffStep } from "./steps/staff-step";
import { DateTimeStep } from "./steps/datetime-step";
import { DetailsStep } from "./steps/details-step";
import { ReviewStep } from "./steps/review-step";
import { createPublicBooking } from "@/features/public-booking/server";
import type {
  PublicSalonProfile,
  PublicService,
  PublicSlot,
} from "@/features/public-booking/types";

interface BookingWizardProps {
  salon: PublicSalonProfile;
}

export function BookingWizard({ salon }: BookingWizardProps) {
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
