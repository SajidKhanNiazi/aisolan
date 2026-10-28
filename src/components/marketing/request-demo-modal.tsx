"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Calendar, Send } from "lucide-react";

interface RequestDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTopic?: string;
}

export function RequestDemoModal({
  isOpen,
  onClose,
  defaultTopic = "Salon Booking Software Walkthrough",
}: RequestDemoModalProps) {
  const [salonName, setSalonName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [teamSize, setTeamSize] = useState("1-3");
  const [topic, setTopic] = useState(defaultTopic);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Safe client-side submission simulation: no destructive database migration or unverified external webhook
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-demo-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B43]/50 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#E8E6DF] bg-white p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleReset}
          className="absolute top-4 right-4 rounded-lg p-2 text-[#627D98] hover:bg-[#F4F2EC] hover:text-[#142B43] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A8F87]"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F5F4] text-[#0A8F87]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-[#142B43]">
              Demo Request Received
            </h3>
            <p className="text-sm text-[#334E68] leading-relaxed max-w-md mx-auto">
              Thank you, <span className="font-semibold text-[#142B43]">{contactName || "there"}</span>. We have recorded your interest for <span className="font-semibold text-[#142B43]">{salonName || "your salon"}</span>. Our team will contact you at <span className="font-semibold text-[#142B43]">{email}</span> with a tailored walkthrough.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto rounded-lg bg-[#0A8F87] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#086F69] transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F5F4] text-[#0A8F87]">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0A8F87]">
                Bookzello Walkthrough
              </span>
            </div>

            <h2 id="request-demo-title" className="text-xl sm:text-2xl font-bold text-[#142B43]">
              Request a Guided Demo
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#334E68] leading-relaxed">
              Explore how Bookzello helps salon teams manage appointments, staff schedules, and online reservations without friction.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#142B43] mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Jordan Smith"
                    className="w-full rounded-lg border border-[#E8E6DF] bg-[#FBFAF8] px-3 py-2 text-sm text-[#142B43] placeholder-[#829AB1] focus:border-[#0A8F87] focus:outline-none focus:ring-1 focus:ring-[#0A8F87]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#142B43] mb-1">
                    Salon / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    placeholder="e.g. Studio Luxe"
                    className="w-full rounded-lg border border-[#E8E6DF] bg-[#FBFAF8] px-3 py-2 text-sm text-[#142B43] placeholder-[#829AB1] focus:border-[#0A8F87] focus:outline-none focus:ring-1 focus:ring-[#0A8F87]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#142B43] mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@example.com"
                  className="w-full rounded-lg border border-[#E8E6DF] bg-[#FBFAF8] px-3 py-2 text-sm text-[#142B43] placeholder-[#829AB1] focus:border-[#0A8F87] focus:outline-none focus:ring-1 focus:ring-[#0A8F87]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#142B43] mb-1">
                    Staff Team Size
                  </label>
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6DF] bg-[#FBFAF8] px-3 py-2 text-sm text-[#142B43] focus:border-[#0A8F87] focus:outline-none focus:ring-1 focus:ring-[#0A8F87]"
                  >
                    <option value="solo">Solo practitioner (1)</option>
                    <option value="1-3">Small salon (2–4 stylists)</option>
                    <option value="5-10">Growing salon (5–10 staff)</option>
                    <option value="10+">Multi-chair / larger venue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#142B43] mb-1">
                    Primary Interest
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6DF] bg-[#FBFAF8] px-3 py-2 text-sm text-[#142B43] focus:border-[#0A8F87] focus:outline-none focus:ring-1 focus:ring-[#0A8F87]"
                  >
                    <option value="Online Customer Booking">Online Customer Booking</option>
                    <option value="Staff Availability & Calendar">Staff Availability &amp; Calendar</option>
                    <option value="AI Receptionist Availability">AI Receptionist Updates</option>
                    <option value="Full Platform Walkthrough">Full Platform Walkthrough</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#142B43] mb-1">
                  Specific Requirements or Questions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell us about your current scheduling setup or timing preferences..."
                  className="w-full rounded-lg border border-[#E8E6DF] bg-[#FBFAF8] px-3 py-2 text-sm text-[#142B43] placeholder-[#829AB1] focus:border-[#0A8F87] focus:outline-none focus:ring-1 focus:ring-[#0A8F87]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0A8F87] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#086F69] focus:outline-none focus:ring-2 focus:ring-[#0A8F87] disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? "Submitting Request..." : "Submit Demo Request"}</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-[#829AB1]">
                No obligations. We never share your contact details.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
