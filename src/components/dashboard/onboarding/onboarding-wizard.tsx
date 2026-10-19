"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Check,
} from "lucide-react";
import type {
  BusinessWithRole,
  OpeningHourInterval,
  BookingPolicy,
  OnboardingProgress,
} from "@/features/organizations/types";
import {
  BUSINESS_CATEGORIES,
  weeklyOpeningHoursSchema,
  bookingPolicySchema,
  type BusinessProfileInput,
} from "@/features/organizations/validation";
import {
  updateBusinessProfile,
  updateOpeningHours,
  updateBookingPolicies,
  saveOnboardingStep,
} from "@/features/organizations/settings-server";
import { LogoUploader } from "../settings/logo-uploader";
import { OpeningHoursEditor } from "../settings/opening-hours-editor";
import { TimezoneSelector } from "../settings/timezone-selector";
import { BookingPoliciesEditor } from "../settings/booking-policies-editor";

interface OnboardingWizardProps {
  business: BusinessWithRole;
  initialHours: OpeningHourInterval[];
  initialPolicy: BookingPolicy;
  initialProgress: OnboardingProgress;
}

const WIZARD_STEPS = [
  { id: 1, title: "Profile", subtitle: "Name & Contact", icon: Building2 },
  { id: 2, title: "Hours", subtitle: "Weekly Schedule", icon: Clock },
  { id: 3, title: "Location", subtitle: "Address & Timezone", icon: MapPin },
  { id: 4, title: "Policies", subtitle: "Booking Rules", icon: ShieldCheck },
  { id: 5, title: "Review", subtitle: "Confirm & Launch", icon: CheckCircle2 },
];

export function OnboardingWizard({
  business,
  initialHours,
  initialPolicy,
  initialProgress,
}: OnboardingWizardProps) {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(
    initialProgress.current_step || 1
  );
  const [completedSteps, setCompletedSteps] = useState<number[]>(
    initialProgress.completed_steps || []
  );

  // State for Step 1 & 3: Profile and Location
  const [profileData, setProfileData] = useState<BusinessProfileInput>({
    name: business.name,
    business_type: business.business_type,
    description: business.description || "",
    logo_url: business.logo_url || "",
    phone: business.phone || "",
    email: business.email || "",
    website: business.website || "",
    address_line1: business.address_line1 || "",
    address_line2: business.address_line2 || "",
    city: business.city || "",
    state_region: business.state_region || "",
    postal_code: business.postal_code || "",
    country: business.country || "GB",
    timezone: business.timezone || "Europe/London",
  });

  // State for Step 2: Hours
  const [hoursData, setHoursData] = useState<OpeningHourInterval[]>(initialHours);

  // State for Step 4: Policy
  const [policyData, setPolicyData] = useState<BookingPolicy>(initialPolicy);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Save Profile
  const handleSaveStep1 = async () => {
    setErrorMessage(null);
    if (!profileData.name || profileData.name.trim().length < 2) {
      setErrorMessage("Business name must be at least 2 characters.");
      return false;
    }

    setIsSaving(true);
    try {
      const res = await updateBusinessProfile(business.id, profileData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to save profile.");
        setIsSaving(false);
        return false;
      }

      await saveOnboardingStep(business.id, 2, 1);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));
      setIsSaving(false);
      return true;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving profile.");
      setIsSaving(false);
      return false;
    }
  };

  // Step 2: Save Hours
  const handleSaveStep2 = async () => {
    setErrorMessage(null);
    const parsed = weeklyOpeningHoursSchema.safeParse(hoursData);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message || "Invalid opening hours schedule.");
      return false;
    }

    setIsSaving(true);
    try {
      const res = await updateOpeningHours(business.id, hoursData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to save opening hours.");
        setIsSaving(false);
        return false;
      }

      await saveOnboardingStep(business.id, 3, 2);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 2])));
      setIsSaving(false);
      return true;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving opening hours.");
      setIsSaving(false);
      return false;
    }
  };

  // Step 3: Save Location & Timezone
  const handleSaveStep3 = async () => {
    setErrorMessage(null);
    setIsSaving(true);
    try {
      const res = await updateBusinessProfile(business.id, profileData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to save location details.");
        setIsSaving(false);
        return false;
      }

      await saveOnboardingStep(business.id, 4, 3);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 3])));
      setIsSaving(false);
      return true;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving location.");
      setIsSaving(false);
      return false;
    }
  };

  // Step 4: Save Policies
  const handleSaveStep4 = async () => {
    setErrorMessage(null);
    const parsed = bookingPolicySchema.safeParse(policyData);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message || "Invalid booking policies.");
      return false;
    }

    setIsSaving(true);
    try {
      const res = await updateBookingPolicies(business.id, policyData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to save booking policies.");
        setIsSaving(false);
        return false;
      }

      await saveOnboardingStep(business.id, 5, 4);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 4])));
      setIsSaving(false);
      return true;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving policies.");
      setIsSaving(false);
      return false;
    }
  };

  // Finish Setup
  const handleFinishSetup = async () => {
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await saveOnboardingStep(business.id, 5, 5, true);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 5])));
      setIsSaving(false);
      router.push(`/dashboard/${business.slug}?onboarded=true`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to finalize onboarding.");
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    setErrorMessage(null);

    let ok = false;
    if (currentStep === 1) ok = await handleSaveStep1();
    else if (currentStep === 2) ok = await handleSaveStep2();
    else if (currentStep === 3) ok = await handleSaveStep3();
    else if (currentStep === 4) ok = await handleSaveStep4();
    else if (currentStep === 5) {
      await handleFinishSetup();
      return;
    }

    if (ok) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="space-y-8">
      {/* Wizard Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                <Sparkles className="h-3 w-3" />
                <span>Phase 1C Setup Wizard</span>
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-medium text-zinc-500">
                Workspace: <strong className="text-zinc-800 dark:text-zinc-200">{business.name}</strong>
              </span>
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Complete Your Salon Setup
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Configure your business details, operating hours, timezone, and cancellation rules in 5 quick steps.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Step {currentStep} of 5
            </span>
            <div className="mt-1.5 h-2 w-36 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(completedSteps.length / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {WIZARD_STEPS.map((step) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setCurrentStep(step.id);
                  setErrorMessage(null);
                }}
                className={`flex items-center gap-2.5 rounded-xl p-2.5 text-left transition-all ${
                  isCurrent
                    ? "border border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm dark:border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-200"
                    : isCompleted
                    ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    : "border border-transparent bg-zinc-50/60 text-zinc-400 dark:bg-zinc-800/40"
                }`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{step.title}</p>
                  <p className="hidden sm:block truncate text-[10px] text-zinc-500">{step.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* STEP 1: Profile */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Step 1: Salon Profile & Contact Details
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Provide public details about your business so clients can identify and reach you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  value={profileData.business_type}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      business_type: e.target.value as BusinessProfileInput["business_type"],
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 capitalize"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe your services and vibe..."
                value={profileData.description || ""}
                onChange={(e) => setProfileData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Phone (with country code)
                </label>
                <input
                  type="tel"
                  placeholder="+44 7911 123456"
                  value={profileData.phone || ""}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="contact@yoursalon.com"
                  value={profileData.email || ""}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://yoursalon.com"
                  value={profileData.website || ""}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            <LogoUploader
              businessId={business.id}
              initialLogoUrl={profileData.logo_url}
              onLogoUploaded={(url) => setProfileData((prev) => ({ ...prev, logo_url: url }))}
              disabled={isSaving}
            />
          </div>
        )}

        {/* STEP 2: Opening Hours */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Step 2: Weekly Operating Schedule
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Define the days and hours your salon is open for clients. You can set multiple shifts per day or mark full days closed.
              </p>
            </div>

            <OpeningHoursEditor
              initialHours={hoursData}
              onChange={(updated) => setHoursData(updated)}
              disabled={isSaving}
            />
          </div>
        )}

        {/* STEP 3: Location & Timezone */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Step 3: Location Address & Operating Timezone
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Specify your salon&apos;s physical address and confirmed IANA timezone for accurate booking slot calculation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Street Address (Line 1)
                  </label>
                  <input
                    type="text"
                    placeholder="123 High Street"
                    value={profileData.address_line1 || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, address_line1: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Street Address (Line 2)
                  </label>
                  <input
                    type="text"
                    placeholder="Floor 2, Suite B"
                    value={profileData.address_line2 || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, address_line2: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="London"
                    value={profileData.city || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    placeholder="Greater London"
                    value={profileData.state_region || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, state_region: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    placeholder="EC1A 1BB"
                    value={profileData.postal_code || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, postal_code: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Country
                  </label>
                  <select
                    value={profileData.country}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="US">United States (US)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="AU">Australia (AU)</option>
                    <option value="PK">Pakistan (PK)</option>
                    <option value="IE">Ireland (IE)</option>
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <TimezoneSelector
                  value={profileData.timezone}
                  onChange={(tz) => setProfileData((prev) => ({ ...prev, timezone: tz }))}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Booking Policies */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Step 4: Booking Notice & Cancellation Policies
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Establish rules for minimum notice, advance horizons, buffers, and cancellation policies.
              </p>
            </div>

            <BookingPoliciesEditor
              initialPolicy={policyData}
              onChange={(updated) => setPolicyData(updated)}
              disabled={isSaving}
            />
          </div>
        )}

        {/* STEP 5: Review & Finish */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Step 5: Review Configuration & Finish
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Review your configured salon details. You can always edit these later under Business Settings.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile Summary */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Business Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{profileData.name}</p>
                <p className="text-xs text-zinc-500 capitalize">Category: {profileData.business_type}</p>
                {profileData.phone && <p className="text-xs text-zinc-600 dark:text-zinc-400">Phone: {profileData.phone}</p>}
                {profileData.email && <p className="text-xs text-zinc-600 dark:text-zinc-400">Email: {profileData.email}</p>}
              </div>

              {/* Location & Timezone Summary */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Location & Timezone
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {profileData.address_line1 || "No street address configured"}
                </p>
                <p className="text-xs text-zinc-500">
                  {[profileData.city, profileData.postal_code, profileData.country].filter(Boolean).join(", ")}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                  Timezone: {profileData.timezone}
                </p>
              </div>

              {/* Hours Summary */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Operating Schedule
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  {hoursData.filter((h) => !h.is_closed).length} day(s) configured open per week.
                </div>
              </div>

              {/* Policy Summary */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Booking Policies
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Min notice: {policyData.min_notice_hours}h • Max horizon: {policyData.max_advance_days}d
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Cancellation lead time: {policyData.cancellation_notice_hours}h • Buffer: {policyData.default_buffer_minutes}m
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Message */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSaving ? (
                <span>Saving Progress...</span>
              ) : currentStep === 5 ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Finish Setup & Launch</span>
                </>
              ) : (
                <>
                  <span>Save & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
