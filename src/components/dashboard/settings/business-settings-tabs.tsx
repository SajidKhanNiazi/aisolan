"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  CalendarOff,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Bell,
  Calendar,
} from "lucide-react";
import type { FullBusinessConfig } from "@/features/organizations/types";
import { BusinessProfileForm } from "./business-profile-form";
import { OpeningHoursEditor } from "./opening-hours-editor";
import { ScheduleExceptionsEditor } from "./schedule-exceptions-editor";
import { BookingPoliciesEditor } from "./booking-policies-editor";
import { NotificationSettingsEditor } from "./notification-settings-editor";
import { GoogleCalendarSettingsEditor } from "./google-calendar-settings-editor";
import { PublicBookingCard } from "@/components/dashboard/public-booking-card";
import { updateOpeningHours, updateBookingPolicies } from "@/features/organizations/settings-server";

interface BusinessSettingsTabsProps {
  initialConfig: FullBusinessConfig;
}

type TabKey = "profile" | "hours" | "exceptions" | "policies" | "notifications" | "calendar";

export function BusinessSettingsTabs({ initialConfig }: BusinessSettingsTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [business, setBusiness] = useState(initialConfig.business);
  const [hours, setHours] = useState(initialConfig.openingHours);
  const [policy, setPolicy] = useState(initialConfig.policy);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursMessage, setHoursMessage] = useState<string | null>(null);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);

  const isOwner = business.role === "owner";

  const handleSaveHours = async () => {
    setIsSavingHours(true);
    setHoursMessage(null);
    try {
      const res = await updateOpeningHours(business.id, hours);
      if (res.success) {
        setHoursMessage("Opening hours saved successfully!");
        router.refresh();
      } else {
        setHoursMessage(res.error || "Failed to save hours.");
      }
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    setPolicyMessage(null);
    try {
      const res = await updateBookingPolicies(business.id, policy);
      if (res.success) {
        setPolicyMessage("Booking policies updated successfully!");
        router.refresh();
      } else {
        setPolicyMessage(res.error || "Failed to update policy.");
      }
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
    { key: "profile", label: "Profile & Identity", icon: Building2 },
    { key: "hours", label: "Weekly Schedule", icon: Clock },
    { key: "exceptions", label: "Holidays & Closures", icon: CalendarOff },
    { key: "policies", label: "Booking Policies", icon: ShieldCheck },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "calendar", label: "Google Calendar", icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/${business.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-2 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Workspace Overview</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Business Settings
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Manage your salon identity, operating window, holiday exceptions, and booking lead-time policies.
          </p>
        </div>

        <Link
          href={`/dashboard/${business.slug}/onboarding`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Launch Setup Wizard</span>
        </Link>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-2 overflow-x-auto pb-1" aria-label="Settings Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "profile" && (
          <BusinessProfileForm
            business={business}
            onSaved={(updated) => setBusiness(updated)}
            disabled={!isOwner}
          />
        )}

        {activeTab === "hours" && (
          <div className="space-y-6">
            <OpeningHoursEditor
              initialHours={hours}
              onChange={(updated) => {
                setHours(updated);
                if (hoursMessage) setHoursMessage(null);
              }}
              disabled={!isOwner || isSavingHours}
            />

            {hoursMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                {hoursMessage}
              </div>
            )}

            {isOwner && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveHours}
                  disabled={isSavingHours}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingHours ? "Saving..." : "Save Operating Schedule"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "exceptions" && (
          <ScheduleExceptionsEditor
            businessId={business.id}
            initialExceptions={initialConfig.exceptions}
            disabled={!isOwner}
          />
        )}

        {activeTab === "policies" && (
          <div className="space-y-6">
            <PublicBookingCard
              businessSlug={business.slug}
              businessName={business.name}
              onlineBookingEnabled={policy.online_booking_enabled}
            />

            <BookingPoliciesEditor
              initialPolicy={policy}
              onChange={(updated) => {
                setPolicy(updated);
                if (policyMessage) setPolicyMessage(null);
              }}
              disabled={!isOwner || isSavingPolicy}
            />

            {policyMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                {policyMessage}
              </div>
            )}

            {isOwner && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={isSavingPolicy}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPolicy ? "Saving..." : "Save Booking Policies"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "notifications" && (
          <NotificationSettingsEditor
            businessId={business.id}
            businessSlug={business.slug}
            initialSettings={initialConfig.notificationSettings}
            isOwnerOrManager={isOwner || business.role === "manager"}
            timeZone={business.timezone}
          />
        )}

        {activeTab === "calendar" && (
          <GoogleCalendarSettingsEditor
            businessSlug={business.slug}
          />
        )}
      </div>
    </div>
  );
}
