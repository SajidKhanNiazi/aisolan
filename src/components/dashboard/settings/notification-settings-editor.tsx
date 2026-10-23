"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  ShieldCheck,
  Clock,
  Send,
} from "lucide-react";
import {
  updateBusinessNotificationSettings,
  getBusinessNotificationHistory,
} from "@/features/notifications/settings-server";
import type {
  BusinessNotificationSettings,
  NotificationHistoryItem,
} from "@/features/notifications/types";

interface NotificationSettingsEditorProps {
  businessId: string;
  businessSlug: string;
  initialSettings?: BusinessNotificationSettings;
  isOwnerOrManager: boolean;
  timeZone?: string;
}

export function NotificationSettingsEditor({
  businessId,
  businessSlug,
  initialSettings,
  isOwnerOrManager,
  timeZone = "Europe/London",
}: NotificationSettingsEditorProps) {
  const [settings, setSettings] = useState<BusinessNotificationSettings>(
    initialSettings || {
      business_id: businessId,
      notify_on_new_booking: true,
      notify_on_reschedule: true,
      notify_on_cancellation: true,
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load recent delivery history on mount
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const res = await getBusinessNotificationHistory(businessId, 15);
        if (isMounted && res.success && res.data) {
          setHistory(res.data);
        }
      } catch (err) {
        console.error("Failed to load delivery logs:", err);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrManager) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await updateBusinessNotificationSettings(
        {
          business_id: businessId,
          notify_on_new_booking: settings.notify_on_new_booking,
          notify_on_reschedule: settings.notify_on_reschedule,
          notify_on_cancellation: settings.notify_on_cancellation,
        },
        businessSlug
      );

      if (res.success && res.data) {
        setSettings(res.data);
        setSaveMessage({ type: "success", text: "Notification preferences saved successfully!" });
      } else {
        setSaveMessage({
          type: "error",
          text: res.error || "Failed to update notification preferences.",
        });
      }
    } catch {
      setSaveMessage({ type: "error", text: "An unexpected error occurred while saving." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getBusinessNotificationHistory(businessId, 15);
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Notification Preferences Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Salon Owner Email Alerts
            </h2>
            <p className="text-xs text-zinc-500">
              Choose which operational transactional emails are sent to authorized salon owners & managers.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="space-y-4">
            {/* Toggle 1: New Booking */}
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-zinc-200/70 bg-zinc-50/50 hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Email me when a new appointment is booked
                </span>
                <p className="text-xs text-zinc-500">
                  Receive an immediate email alert whenever a customer confirms a public booking online.
                </p>
              </div>
              <input
                type="checkbox"
                id="notify_on_new_booking"
                name="notify_on_new_booking"
                checked={settings.notify_on_new_booking}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_new_booking: e.target.checked })
                }
                disabled={!isOwnerOrManager || isSaving}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Toggle 2: Reschedule */}
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-zinc-200/70 bg-zinc-50/50 hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Email me when an appointment is rescheduled
                </span>
                <p className="text-xs text-zinc-500">
                  Get notified when a customer moves their booking to a different time slot.
                </p>
              </div>
              <input
                type="checkbox"
                id="notify_on_reschedule"
                name="notify_on_reschedule"
                checked={settings.notify_on_reschedule}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_reschedule: e.target.checked })
                }
                disabled={!isOwnerOrManager || isSaving}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Toggle 3: Cancellation */}
            <label className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-zinc-200/70 bg-zinc-50/50 hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  Email me when an appointment is cancelled
                </span>
                <p className="text-xs text-zinc-500">
                  Receive an alert when an appointment is cancelled so staff can open capacity.
                </p>
              </div>
              <input
                type="checkbox"
                id="notify_on_cancellation"
                name="notify_on_cancellation"
                checked={settings.notify_on_cancellation}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_cancellation: e.target.checked })
                }
                disabled={!isOwnerOrManager || isSaving}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Feedback Message */}
          {saveMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                saveMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
              }`}
            >
              {saveMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          )}

          {isOwnerOrManager && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Notification Preferences</span>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 2. Customer Transactional Confirmation Notice */}
      <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-900 dark:text-zinc-200">
              Customer Transactional Confirmations
            </p>
            <p>
              Customers always receive transactional confirmations (booking, rescheduling, cancellation)
              when an email address is provided. These are critical booking receipts and are not subject
              to promotional marketing subscription preferences.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Read-Only Notification Delivery History */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notification Delivery History
            </h3>
            <p className="text-xs text-zinc-500">
              Recent transactional emails queued and dispatched for this salon.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshHistory}
            disabled={isLoadingHistory}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Loading recent delivery logs...</span>
              </div>
            ) : (
              <span>No notification records found for this salon yet.</span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500">
                  <th className="py-2.5 px-2 font-medium">Event</th>
                  <th className="py-2.5 px-2 font-medium">Recipient</th>
                  <th className="py-2.5 px-2 font-medium">Status</th>
                  <th className="py-2.5 px-2 font-medium">Created</th>
                  <th className="py-2.5 px-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {history.map((item) => {
                  let statusBadge = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
                  if (item.status === "sent") {
                    statusBadge =
                      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
                  } else if (item.status === "queued" || item.status === "processing") {
                    statusBadge =
                      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300";
                  } else if (item.status === "failed") {
                    statusBadge =
                      "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
                  } else if (item.status === "retry_pending") {
                    statusBadge =
                      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
                  } else if (item.status === "skipped") {
                    statusBadge =
                      "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400";
                  }

                  const formattedDate = new Date(item.created_at).toLocaleString("en-GB", {
                    timeZone,
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-2.5 px-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {item.event_type === "new_booking" && "New Booking"}
                        {item.event_type === "reschedule" && "Reschedule"}
                        {item.event_type === "cancellation" && "Cancellation"}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase text-[10px] tracking-wider block">
                          {item.recipient_type}
                        </span>
                        <span className="text-zinc-500 truncate max-w-[140px] block">
                          {item.recipient_email}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-zinc-500 whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-500 font-mono text-[10px] truncate max-w-[150px]">
                        {item.provider_message_id ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {item.provider_message_id}
                          </span>
                        ) : item.last_error_message ? (
                          <span className="text-rose-500" title={item.last_error_message}>
                            {item.last_error_code || "Error"}
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
