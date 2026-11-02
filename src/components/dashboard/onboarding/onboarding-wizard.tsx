"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Scissors,
  Users,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Check,
  Zap,
  ArrowRight,
  ArrowLeft,
  Plus,
  RefreshCw,
} from "lucide-react";
import type {
  BusinessWithRole,
  OpeningHourInterval,
  BookingPolicy,
  OnboardingProgress,
} from "@/features/organizations/types";
import type { ServiceWithCategory } from "@/features/services/types";
import type { StaffWithServices } from "@/features/staff/types";
import type { BookingReadinessReport } from "@/features/organizations/readiness";
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
import { createService } from "@/features/services/server";
import {
  createStaffProfile,
  bulkAssignStaffToServices,
  setupSoloOwnerOperator,
} from "@/features/staff/server";
import { getBusinessBookingReadiness } from "@/features/organizations/readiness";
import { OpeningHoursEditor } from "../settings/opening-hours-editor";
import { TimezoneSelector } from "../settings/timezone-selector";
import { BookingPoliciesEditor } from "../settings/booking-policies-editor";
import { Button } from "@/components/ui/button";

interface OnboardingWizardProps {
  business: BusinessWithRole;
  initialHours: OpeningHourInterval[];
  initialPolicy: BookingPolicy;
  initialProgress: OnboardingProgress;
  initialServices?: ServiceWithCategory[];
  initialStaff?: StaffWithServices[];
  initialReadiness?: BookingReadinessReport | null;
}

const WIZARD_STEPS = [
  { id: 1, title: "Profile", subtitle: "Name & Category", icon: Building2 },
  { id: 2, title: "Hours & Time", subtitle: "Schedule & Zone", icon: Clock },
  { id: 3, title: "Services", subtitle: "Treatments & Prices", icon: Scissors },
  { id: 4, title: "Staff", subtitle: "Solo / Team Setup", icon: Users },
  { id: 5, title: "Eligibility", subtitle: "Staff Qualifications", icon: Sparkles },
  { id: 6, title: "Readiness", subtitle: "Booking Audit", icon: CheckCircle2 },
  { id: 7, title: "Launch", subtitle: "Policies & Go Live", icon: ShieldCheck },
];

export function OnboardingWizard({
  business,
  initialHours,
  initialPolicy,
  initialProgress,
  initialServices = [],
  initialStaff = [],
  initialReadiness = null,
}: OnboardingWizardProps) {
  const router = useRouter();

  const [completedSteps, setCompletedSteps] = useState<number[]>(
    initialProgress.completed_steps || []
  );

  // Resume at the true active step across all 7 steps even if current_step was DB-clamped.
  // Supports deep-linking and backward-navigation reload via URL query param (?step=X).
  const initialResumeStep = (() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlStep = Number.parseInt(sp.get("step") || "", 10);
      if (!Number.isNaN(urlStep) && urlStep >= 1 && urlStep <= 7) {
        return urlStep;
      }
    }
    if (initialProgress.is_completed) return 7;
    const completed = initialProgress.completed_steps || [];
    if (completed.length > 0) {
      const maxCompleted = Math.max(...completed);
      return Math.min(7, Math.max(1, maxCompleted + 1));
    }
    return Math.min(7, Math.max(1, initialProgress.current_step || 1));
  })();

  const [currentStep, setCurrentStep] = useState<number>(initialResumeStep);

  // Synchronize URL query parameter when stepping forward or backward
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("step") !== String(currentStep)) {
        url.searchParams.set("step", String(currentStep));
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [currentStep]);

  // Step 1: Profile
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

  // Step 2: Hours
  const [hoursData, setHoursData] = useState<OpeningHourInterval[]>(initialHours);

  // Step 3: Services
  const [servicesList, setServicesList] = useState<ServiceWithCategory[]>(initialServices);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("25.00");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [newServiceBuffer, setNewServiceBuffer] = useState("5");
  const [isAddingService, setIsAddingService] = useState(false);

  // Step 4: Staff
  const [staffList, setStaffList] = useState<StaffWithServices[]>(initialStaff);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffTitle, setNewStaffTitle] = useState("Stylist / Barber");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isSettingUpSolo, setIsSettingUpSolo] = useState(false);

  // Step 5: Eligibility
  const [qualificationMap, setQualificationMap] = useState<Map<string, Set<string>>>(() => {
    const map = new Map<string, Set<string>>();
    for (const st of initialStaff) {
      map.set(st.id, new Set(st.service_ids || []));
    }
    return map;
  });
  const [isSavingEligibility, setIsSavingEligibility] = useState(false);

  // Step 6: Readiness
  const [readinessReport, setReadinessReport] = useState<BookingReadinessReport | null>(
    initialReadiness
  );
  const [isValidatingReadiness, setIsValidatingReadiness] = useState(false);

  // Step 7: Policies
  const [policyData, setPolicyData] = useState<BookingPolicy>(initialPolicy);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // --- Step 1 Save ---
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

  // --- Step 2 Save (Hours & Timezone) ---
  const handleSaveStep2 = async () => {
    setErrorMessage(null);
    const parsed = weeklyOpeningHoursSchema.safeParse(hoursData);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message || "Invalid opening hours schedule.");
      return false;
    }

    setIsSaving(true);
    try {
      const hoursRes = await updateOpeningHours(business.id, hoursData);
      if (!hoursRes.success) {
        setErrorMessage(hoursRes.error || "Failed to save opening hours.");
        setIsSaving(false);
        return false;
      }

      const profileRes = await updateBusinessProfile(business.id, profileData);
      if (!profileRes.success) {
        setErrorMessage(profileRes.error || "Failed to save timezone.");
        setIsSaving(false);
        return false;
      }

      await saveOnboardingStep(business.id, 3, 2);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 2])));
      setIsSaving(false);
      return true;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving schedule.");
      setIsSaving(false);
      return false;
    }
  };

  // --- Step 3: Quick Add Service ---
  const handleAddQuickService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    setIsAddingService(true);
    setErrorMessage(null);
    try {
      const res = await createService(
        business.id,
        {
          name: newServiceName.trim(),
          price_amount: Number.parseFloat(newServicePrice) || 0,
          currency: business.currency || "GBP",
          duration_minutes: Number.parseInt(newServiceDuration, 10) || 30,
          buffer_minutes: Number.parseInt(newServiceBuffer, 10) || 0,
          is_active: true,
        },
        business.slug
      );

      if (res.success && res.service) {
        setServicesList((prev) => [...prev, res.service!]);
        setNewServiceName("");
        setSuccessNotice(`Service "${res.service.name}" added successfully.`);
      } else {
        setErrorMessage(res.error || "Failed to add service.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create service.");
    } finally {
      setIsAddingService(false);
    }
  };

  const handleSaveStep3 = async () => {
    setErrorMessage(null);
    const active = servicesList.filter((s) => s.is_active);
    if (active.length === 0) {
      setErrorMessage("Please create at least one active service before continuing.");
      return false;
    }

    setIsSaving(true);
    await saveOnboardingStep(business.id, 4, 3);
    setCompletedSteps((prev) => Array.from(new Set([...prev, 3])));
    setIsSaving(false);
    return true;
  };

  // --- Step 4: Quick Add Staff / 1-Click Solo Setup ---
  const handleSoloSetup = async () => {
    setIsSettingUpSolo(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    try {
      const res = await setupSoloOwnerOperator(business.id, business.slug);
      if (res.success) {
        setSuccessNotice(`Solo operator setup complete! Linked ${res.servicesLinked || 0} service(s).`);
        // Refresh local staff list
        setStaffList([
          {
            id: res.staffId || "solo-owner",
            business_id: business.id,
            user_id: null,
            avatar_url: null,
            display_name: "Owner / Master Stylist",
            professional_title: "Owner / Master Stylist",
            bio: null,
            contact_email: null,
            contact_phone: null,
            is_active: true,
            is_archived: false,
            display_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            service_ids: servicesList.map((s) => s.id),
            assigned_services_count: servicesList.length,
          },
        ]);

        // Auto-populate Step 5 qualification map
        const newMap = new Map<string, Set<string>>();
        newMap.set(res.staffId || "solo-owner", new Set(servicesList.map((s) => s.id)));
        setQualificationMap(newMap);

        await saveOnboardingStep(business.id, 5, 4);
        setCompletedSteps((prev) => Array.from(new Set([...prev, 4])));
      } else {
        setErrorMessage(res.error || "Failed to set up solo operator.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Solo setup failed.");
    } finally {
      setIsSettingUpSolo(false);
    }
  };

  const handleAddStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    setIsAddingStaff(true);
    setErrorMessage(null);
    try {
      const res = await createStaffProfile(
        business.id,
        {
          display_name: newStaffName.trim(),
          professional_title: newStaffTitle.trim() || undefined,
          is_active: true,
        },
        business.slug
      );

      if (res.success && res.staff) {
        const fullStaff: StaffWithServices = {
          ...res.staff,
          service_ids: [],
          assigned_services_count: 0,
        };
        setStaffList((prev) => [...prev, fullStaff]);
        setNewStaffName("");
        setSuccessNotice(`Professional "${res.staff.display_name}" added.`);
      } else {
        setErrorMessage(res.error || "Failed to add professional.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to add staff.");
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleSaveStep4 = async () => {
    setErrorMessage(null);
    const activeStaff = staffList.filter((s) => s.is_active);
    if (activeStaff.length === 0) {
      setErrorMessage("Please add at least one professional or use 1-Click Solo Setup.");
      return false;
    }

    setIsSaving(true);
    await saveOnboardingStep(business.id, 5, 4);
    setCompletedSteps((prev) => Array.from(new Set([...prev, 4])));
    setIsSaving(false);
    return true;
  };

  // --- Step 5: Service Eligibility ---
  const toggleStaffService = (staffId: string, serviceId: string) => {
    setQualificationMap((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(staffId) || []);
      if (set.has(serviceId)) {
        set.delete(serviceId);
      } else {
        set.add(serviceId);
      }
      next.set(staffId, set);
      return next;
    });
  };

  const handleAssignAllToAll = () => {
    const allServiceIds = servicesList.filter((s) => s.is_active).map((s) => s.id);
    setQualificationMap((prev) => {
      const next = new Map(prev);
      for (const st of staffList.filter((s) => s.is_active)) {
        next.set(st.id, new Set(allServiceIds));
      }
      return next;
    });
    setSuccessNotice("Selected all services for all active professionals. Click Save & Continue to commit.");
  };

  const handleSaveStep5 = async () => {
    setErrorMessage(null);
    setIsSavingEligibility(true);
    try {
      for (const st of staffList.filter((s) => s.is_active)) {
        const assigned = Array.from(qualificationMap.get(st.id) || []);
        await bulkAssignStaffToServices(
          business.id,
          {
            staffIds: [st.id],
            serviceIds: assigned,
            mode: "replace",
          },
          business.slug
        );
      }

      await saveOnboardingStep(business.id, 6, 5);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 5])));

      // Run live audit for Step 6
      const report = await getBusinessBookingReadiness(business.slug);
      setReadinessReport(report);

      setIsSavingEligibility(false);
      return true;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save eligibility.");
      setIsSavingEligibility(false);
      return false;
    }
  };

  // --- Step 6: Readiness Review ---
  const handleRefreshReadiness = async () => {
    setIsValidatingReadiness(true);
    try {
      const report = await getBusinessBookingReadiness(business.slug);
      setReadinessReport(report);
    } finally {
      setIsValidatingReadiness(false);
    }
  };

  const handleSaveStep6 = async () => {
    setErrorMessage(null);
    setIsSaving(true);
    await saveOnboardingStep(business.id, 7, 6);
    setCompletedSteps((prev) => Array.from(new Set([...prev, 6])));
    setIsSaving(false);
    return true;
  };

  // --- Step 7: Final Launch ---
  const handleFinishLaunch = async () => {
    setErrorMessage(null);
    const parsed = bookingPolicySchema.safeParse(policyData);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message || "Invalid booking policies.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedPolicy = { ...policyData, online_booking_enabled: true };
      const polRes = await updateBookingPolicies(business.id, updatedPolicy);
      if (!polRes.success) {
        setErrorMessage(polRes.error || "Failed to update booking policies.");
        setIsSaving(false);
        return;
      }

      const res = await saveOnboardingStep(business.id, 5, 7, true);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to finalize onboarding setup in database.");
        setIsSaving(false);
        return;
      }

      setCompletedSteps((prev) => Array.from(new Set([...prev, 7])));
      setIsSaving(false);
      router.push(`/dashboard/${business.slug}?onboarded=true`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to launch salon.");
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    let ok = false;
    if (currentStep === 1) ok = await handleSaveStep1();
    else if (currentStep === 2) ok = await handleSaveStep2();
    else if (currentStep === 3) ok = await handleSaveStep3();
    else if (currentStep === 4) ok = await handleSaveStep4();
    else if (currentStep === 5) ok = await handleSaveStep5();
    else if (currentStep === 6) ok = await handleSaveStep6();
    else if (currentStep === 7) {
      await handleFinishLaunch();
      return;
    }

    if (ok) {
      setCurrentStep((prev) => Math.min(7, prev + 1));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setSuccessNotice(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                <Sparkles className="h-3 w-3" />
                <span>Universal Salon Onboarding (D24)</span>
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
              Configure your profile, schedule, services, qualified professionals, and verify live booking readiness.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Step {currentStep} of {WIZARD_STEPS.length}
            </span>
            <div className="mt-1.5 h-2 w-36 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(completedSteps.length / WIZARD_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {WIZARD_STEPS.map((step) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id <= currentStep || completedSteps.includes(step.id - 1)) {
                    setCurrentStep(step.id);
                    setErrorMessage(null);
                    setSuccessNotice(null);
                  }
                }}
                className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? "border-blue-600 bg-blue-50/70 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200 font-semibold shadow-xs"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50/40 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                    : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 opacity-70 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {isCompleted && !isCurrent && <Check className="h-3 w-3 text-emerald-600" />}
                </div>
                <span className="text-[11px] font-bold mt-1 line-clamp-1">{step.title}</span>
                <span className="text-[9px] text-zinc-500 hidden sm:inline">{step.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error and Success Notices */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 text-xs shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successNotice && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200 text-xs shadow-xs">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Step Content Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* STEP 1: Business Profile */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Step 1: Business Profile &amp; Contact
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Establish the public identity and contact details for your salon workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="salon-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Business Name *
                </label>
                <input
                  id="salon-name"
                  type="text"
                  value={profileData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  placeholder="e.g. Blade & Crown Grooming"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="salon-category" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Business Category
                </label>
                <select
                  id="salon-category"
                  value={profileData.business_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setProfileData({
                      ...profileData,
                      business_type: e.target.value as BusinessProfileInput["business_type"],
                    })
                  }
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 capitalize"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="salon-phone" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Public Phone
                </label>
                <input
                  id="salon-phone"
                  type="text"
                  value={profileData.phone || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  placeholder="+44 20 7946 0991"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="salon-desc" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Short Description
                </label>
                <input
                  id="salon-desc"
                  type="text"
                  value={profileData.description || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData({ ...profileData, description: e.target.value })
                  }
                  placeholder="Modern barbershop specializing in precision fades and beard sculpting."
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Opening Hours & Timezone */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Step 2: Operating Hours &amp; Salon Timezone
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Configure your weekly operating window and the local timezone for accurate slot generation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                  Salon Timezone
                </h3>
                <TimezoneSelector
                  value={profileData.timezone}
                  onChange={(tz) => setProfileData({ ...profileData, timezone: tz })}
                />
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                  Weekly Operating Schedule
                </h3>
                <OpeningHoursEditor initialHours={hoursData} onChange={setHoursData} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Services */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Step 3: Services &amp; Treatments
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Add bookable services. Every service must have a valid duration and turnaround buffer.
              </p>
            </div>

            {/* Quick Add Form */}
            <form
              onSubmit={handleAddQuickService}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Add New Service
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="new-srv-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Service Name *
                  </label>
                  <input
                    id="new-srv-name"
                    type="text"
                    value={newServiceName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServiceName(e.target.value)}
                    placeholder="e.g. Classic Haircut"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label htmlFor="new-srv-price" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Price ({business.currency || "GBP"})
                  </label>
                  <input
                    id="new-srv-price"
                    type="number"
                    step="0.5"
                    value={newServicePrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServicePrice(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label htmlFor="new-srv-dur" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Duration (mins)
                  </label>
                  <input
                    id="new-srv-dur"
                    type="number"
                    value={newServiceDuration}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServiceDuration(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label htmlFor="new-srv-buffer" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Buffer (mins)
                  </label>
                  <input
                    id="new-srv-buffer"
                    type="number"
                    value={newServiceBuffer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServiceBuffer(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAddingService || !newServiceName.trim()}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAddingService ? "Adding..." : "Add Service"}</span>
                </Button>
              </div>
            </form>

            {/* Services List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Configured Services ({servicesList.filter((s) => s.is_active).length})
              </h3>
              {servicesList.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-3 rounded-lg border border-dashed text-center">
                  No services added yet. Add your first service above to proceed.
                </p>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {servicesList.map((srv) => (
                    <div
                      key={srv.id}
                      className="flex items-center justify-between p-3 text-xs bg-white dark:bg-zinc-900"
                    >
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{srv.name}</span>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {srv.duration_minutes} mins • Buffer: {srv.buffer_minutes || 0} mins
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                        {business.currency || "£"}
                        {Number(srv.price_amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Staff / Solo Setup */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Step 4: Staff &amp; Professionals Setup
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Configure your team or quickly establish a single owner-operator setup.
              </p>
            </div>

            {/* 1-Click Solo Operator Box */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold text-xs">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span>Solo Owner / Operator Setup</span>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300/90 mt-1">
                    Operating on your own? Click below to instantly establish your staff profile, copy salon open hours as your working shifts, and link all active services.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSoloSetup}
                  disabled={isSettingUpSolo}
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 shrink-0"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>{isSettingUpSolo ? "Setting up..." : "1-Click Solo Setup"}</span>
                </Button>
              </div>
            </div>

            {/* Manual Staff Add Form */}
            <form
              onSubmit={handleAddStaffMember}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Add Team Member
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="staff-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Full Name *
                  </label>
                  <input
                    id="staff-name"
                    type="text"
                    value={newStaffName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
                <div>
                  <label htmlFor="staff-title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Professional Title
                  </label>
                  <input
                    id="staff-title"
                    type="text"
                    value={newStaffTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStaffTitle(e.target.value)}
                    placeholder="e.g. Master Barber"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAddingStaff || !newStaffName.trim()}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAddingStaff ? "Adding..." : "Add Professional"}</span>
                </Button>
              </div>
            </form>

            {/* Staff List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Active Professionals ({staffList.filter((s) => s.is_active).length})
              </h3>
              {staffList.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-3 rounded-lg border border-dashed text-center">
                  No professionals configured. Use Solo Setup or add a team member above.
                </p>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  {staffList.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-3 text-xs bg-white dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300">
                          {st.display_name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{st.display_name}</span>
                          <div className="text-[11px] text-zinc-500">
                            {st.professional_title || "Specialist"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Service Eligibility */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Step 5: Professional Qualifications &amp; Eligibility
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Specify which professionals are qualified to perform each service.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAssignAllToAll}
                className="text-xs gap-1.5 self-start sm:self-center"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Select All Services for All Staff</span>
              </Button>
            </div>

            {servicesList.length === 0 || staffList.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-4 rounded-xl border border-dashed text-center">
                Please configure services and staff members in previous steps before assigning qualifications.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <tr>
                      <th className="p-3">Professional</th>
                      {servicesList.filter((s) => s.is_active).map((srv) => (
                        <th key={srv.id} className="p-3 text-center whitespace-nowrap">
                          {srv.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {staffList.filter((s) => s.is_active).map((st) => {
                      const qualified = qualificationMap.get(st.id) || new Set();
                      return (
                        <tr key={st.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                          <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {st.display_name}
                          </td>
                          {servicesList.filter((s) => s.is_active).map((srv) => {
                            const isChecked = qualified.has(srv.id);
                            return (
                              <td key={srv.id} className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleStaffService(st.id, srv.id)}
                                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Booking Readiness Audit */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Step 6: Live Booking Readiness Audit
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Automated verification guaranteeing genuine appointment availability across all customer channels.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRefreshReadiness}
                disabled={isValidatingReadiness}
                className="text-xs gap-1.5 self-start sm:self-center"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isValidatingReadiness ? "animate-spin" : ""}`} />
                <span>Re-Audit Workspace</span>
              </Button>
            </div>

            {readinessReport ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border ${
                    readinessReport.status === "ready"
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
                      : readinessReport.status === "partially_ready"
                      ? "border-amber-200 bg-amber-50/50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
                      : "border-rose-200 bg-rose-50/50 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Status: {readinessReport.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="text-xs font-bold">
                      Readiness Score: {readinessReport.scorePercent}%
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium">{readinessReport.summary}</p>
                </div>

                {/* Audit Checklist */}
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Engine Verification Checklist
                  </h3>

                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="p-3 flex items-center justify-between">
                      <span>Timezone Configured ({readinessReport.stats.timezone})</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span>Operating Hours ({readinessReport.stats.openDaysCount} open days/wk)</span>
                      {readinessReport.stats.openDaysCount > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span>Active Services Published ({readinessReport.stats.activeServices})</span>
                      {readinessReport.stats.activeServices > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span>Active Professionals Configured ({readinessReport.stats.activeStaff})</span>
                      {readinessReport.stats.activeStaff > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span>
                        Service Qualifications ({readinessReport.stats.bookableServices} /{" "}
                        {readinessReport.stats.activeServices} bookable)
                      </span>
                      {readinessReport.stats.unbookableServices === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic text-center p-4">
                Click &quot;Re-Audit Workspace&quot; to run the automated readiness engine.
              </p>
            )}
          </div>
        )}

        {/* STEP 7: Launch & Policies */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Step 7: Booking Policies &amp; Launch
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Confirm your cancellation notice window and launch live online bookings for your salon.
              </p>
            </div>

            <BookingPoliciesEditor initialPolicy={policyData} onChange={setPolicyData} />

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <p className="font-bold">Ready to Launch!</p>
              <p className="text-[11px] leading-relaxed">
                Clicking &quot;Confirm &amp; Launch Online Booking&quot; will enable self-service bookings on your public page (<code>/booking/{business.slug}</code>) and your AI receptionist.
              </p>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="mt-8 flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSaving || isSavingEligibility}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isSaving || isSavingEligibility}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-500"
          >
            <span>
              {currentStep === 7
                ? isSaving
                  ? "Launching..."
                  : "Confirm & Launch Online Booking"
                : isSaving || isSavingEligibility
                ? "Saving..."
                : "Save & Continue"}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
