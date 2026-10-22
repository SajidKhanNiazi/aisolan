"use client";

import React, { useState } from "react";
import { User, Mail, Phone, FileText, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetailsStepProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  onChangeName: (val: string) => void;
  onChangeEmail: (val: string) => void;
  onChangePhone: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function DetailsStep({
  customerName,
  customerEmail,
  customerPhone,
  customerNotes,
  onChangeName,
  onChangeEmail,
  onChangePhone,
  onChangeNotes,
  onBack,
  onContinue,
}: DetailsStepProps) {
  const [error, setError] = useState<string | null>(null);

  const handleValidateAndContinue = () => {
    setError(null);

    const name = customerName.trim();
    const email = customerEmail.trim();
    const phone = customerPhone.trim();

    if (!name || name.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!email && !phone) {
      setError("Please provide either an email or mobile phone number so we can confirm your appointment.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    onContinue();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Your Contact Details
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          No account required. We only use your details to confirm and manage this booking.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => onChangeEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Mobile Phone */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Mobile Phone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => onChangePhone(e.target.value)}
              placeholder="+44 7700 900077"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            Provide at least an email or mobile number for confirmation.
          </p>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Appointment Notes <span className="text-zinc-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3.5 pointer-events-none text-zinc-400">
              <FileText className="w-4 h-4" />
            </div>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => onChangeNotes(e.target.value)}
              maxLength={500}
              placeholder="Any special requests or details your specialist should know..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          onClick={handleValidateAndContinue}
          size="lg"
          className="min-w-[140px]"
        >
          Review Booking
        </Button>
      </div>
    </div>
  );
}
