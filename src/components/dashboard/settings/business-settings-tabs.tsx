"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Clock,
  CalendarOff,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Bell,
  Calendar,
  Bot,
  Code2,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { FullBusinessConfig } from "@/features/organizations/types";
import { BusinessProfileForm } from "./business-profile-form";
import { OpeningHoursEditor } from "./opening-hours-editor";
import { ScheduleExceptionsEditor } from "./schedule-exceptions-editor";
import { BookingPoliciesEditor } from "./booking-policies-editor";
import { NotificationSettingsEditor } from "./notification-settings-editor";
import { GoogleCalendarSettingsEditor } from "./google-calendar-settings-editor";
import { AiReceptionistSettingsEditor } from "./ai-receptionist-settings-editor";
import { WidgetSettingsEditor } from "./widget-settings-editor";
import { WhatsAppSettingsEditor } from "./whatsapp-settings-editor";
import { PublicBookingCard } from "@/components/dashboard/public-booking-card";
import { updateOpeningHours, updateBookingPolicies } from "@/features/organizations/settings-server";

interface BusinessSettingsTabsProps {
  initialConfig: FullBusinessConfig;
}

type TabKey =
  | "profile"
  | "hours"
  | "exceptions"
  | "policies"
  | "notifications"
  | "calendar"
  | "ai"
  | "widget"
  | "whatsapp";

export function BusinessSettingsTabs({ initialConfig }: BusinessSettingsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Allow tab deep-linking via ?tab= or default to 'profile'
  const initialTabParam = searchParams?.get("tab") as TabKey | null;
  const validTabs: TabKey[] = [
    "profile",
    "hours",
    "exceptions",
    "policies",
    "notifications",
    "calendar",
    "ai",
    "widget",
    "whatsapp",
  ];
  const initialActive = validTabs.includes(initialTabParam as TabKey)
    ? (initialTabParam as TabKey)
    : "profile";

  const [activeTab, setActiveTab] = useState<TabKey>(initialActive);
  const [business, setBusiness] = useState(initialConfig.business);
  const [hours, setHours] = useState(initialConfig.openingHours);
  const [policy, setPolicy] = useState(initialConfig.policy);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursMessage, setHoursMessage] = useState<string | null>(null);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);

  const isOwner = business.role === "owner";

  // Sync tab changes to URL search params without full reload
  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

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

  const tabs: {
    key: TabKey;
    label: string;
    icon: typeof Building2;
    badge?: string;
  }[] = [
    { key: "profile", label: "Profile & Identity", icon: Building2 },
    { key: "hours", label: "Weekly Schedule", icon: Clock },
    { key: "exceptions", label: "Holidays & Closures", icon: CalendarOff },
    { key: "policies", label: "Booking Policies", icon: ShieldCheck },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "calendar", label: "Google Calendar", icon: Calendar },
    { key: "ai", label: "AI Receptionist", icon: Bot, badge: "AI" },
    { key: "widget", label: "Booking Widget", icon: Code2 },
    { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, badge: "Pilot" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <Link
            href={`/dashboard/${business.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2 font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Workspace Overview</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Business Settings
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {business.name}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Configure salon profile, opening hours, schedule exceptions, booking policies, AI receptionist, and messaging integrations.
          </p>
        </div>

        <Link
          href={`/dashboard/${business.slug}/onboarding`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Launch Setup Wizard</span>
        </Link>
      </div>

      {/* Settings Navigation Tabs Bar */}
      <div className="border border-slate-200/80 bg-white rounded-xl p-1.5 shadow-2xs">
        <nav
          className="flex space-x-1 overflow-x-auto pb-0.5 scrollbar-thin"
          aria-label="Settings Tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Panel with subtle transition */}
      <div className="animate-in fade-in-50 duration-150">
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
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{hoursMessage}</span>
              </div>
            )}

            {isOwner && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveHours}
                  disabled={isSavingHours}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSavingHours && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSavingHours ? "Saving..." : "Save Operating Schedule"}</span>
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
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{policyMessage}</span>
              </div>
            )}

            {isOwner && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={isSavingPolicy}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSavingPolicy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSavingPolicy ? "Saving..." : "Save Booking Policies"}</span>
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
            initialHistory={initialConfig.notificationHistory}
            isOwnerOrManager={isOwner || business.role === "manager"}
            timeZone={business.timezone}
          />
        )}

        {activeTab === "calendar" && (
          <GoogleCalendarSettingsEditor
            businessSlug={business.slug}
          />
        )}

        {activeTab === "ai" && (
          <AiReceptionistSettingsEditor
            businessId={business.id}
            businessSlug={business.slug}
            salonName={business.name}
            initialSettings={
              initialConfig.aiSettings || {
                business_id: business.id,
                ai_receptionist_enabled: initialConfig.aiMode !== "disabled",
                default_language: "en",
                welcome_message: null,
                faqs: [],
              }
            }
            activeMode={initialConfig.aiMode || "disabled"}
            modelName={initialConfig.aiModel || "gpt-6-luna"}
            isOwnerOrManager={isOwner || business.role === "manager"}
          />
        )}

        {activeTab === "widget" && (
          <WidgetSettingsEditor business={business} />
        )}

        {activeTab === "whatsapp" && (
          <WhatsAppSettingsEditor
            businessSlug={business.slug}
            salonName={business.name}
            isOwnerOrManager={isOwner || business.role === "manager"}
          />
        )}
      </div>
    </div>
  );
}
