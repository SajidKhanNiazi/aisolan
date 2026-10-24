"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  RotateCw,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  getGoogleCalendarConnection,
  listAvailableGoogleCalendars,
  updateGoogleCalendarSettings,
  disconnectGoogleCalendar,
  triggerImmediateCalendarSync,
  initialSyncFutureAppointments,
} from "@/features/integrations/google-calendar/server";
import type {
  GoogleCalendarConnection,
  GoogleCalendarListItem,
} from "@/features/integrations/google-calendar/types";

interface GoogleCalendarSettingsEditorProps {
  businessSlug: string;
}

export function GoogleCalendarSettingsEditor({ businessSlug }: GoogleCalendarSettingsEditorProps) {
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
  const [syncEnabled, setSyncEnabled] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load connection state
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await getGoogleCalendarConnection(businessSlug);
        if (res.success && res.data) {
          setConnection(res.data);
          setSelectedCalendarId(res.data.google_calendar_id || "primary");
          setSyncEnabled(res.data.sync_enabled);

          // If active, load accessible calendars list
          if (res.data.status === "active") {
            const calRes = await listAvailableGoogleCalendars(businessSlug);
            if (calRes.success && calRes.data) {
              setCalendars(calRes.data);
            }
          }
        } else {
          setConnection(null);
        }
      } catch (err) {
        console.error("Failed to load Google Calendar connection:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [businessSlug]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const selectedCal = calendars.find((c) => c.id === selectedCalendarId);
      const res = await updateGoogleCalendarSettings(businessSlug, {
        calendarId: selectedCalendarId,
        calendarName: selectedCal?.summary || "Selected Calendar",
        syncEnabled,
      });

      if (res.success) {
        setStatusMessage({ type: "success", text: "Google Calendar settings saved successfully!" });
        // Refresh connection
        const updated = await getGoogleCalendarConnection(businessSlug);
        if (updated.success && updated.data) setConnection(updated.data);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to save settings." });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSaving(true);
    try {
      const res = await disconnectGoogleCalendar(businessSlug);
      if (res.success) {
        setConnection(null);
        setCalendars([]);
        setShowDisconnectModal(false);
        setStatusMessage({ type: "success", text: "Google Calendar has been disconnected." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to disconnect." });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const res = await triggerImmediateCalendarSync(businessSlug);
      if (res.success && res.data) {
        setStatusMessage({
          type: "success",
          text: `Sync complete: ${res.data.succeeded} items synced successfully.`,
        });
        const updated = await getGoogleCalendarConnection(businessSlug);
        if (updated.success && updated.data) setConnection(updated.data);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Sync encountered an error." });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInitialSync = async () => {
    setIsInitialSyncing(true);
    setStatusMessage(null);
    try {
      const res = await initialSyncFutureAppointments(businessSlug, 30);
      if (res.success && res.data) {
        setStatusMessage({
          type: "success",
          text: `Enqueued ${res.data.enqueuedCount} upcoming appointments for Google Calendar synchronization.`,
        });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to enqueue appointments." });
      }
    } finally {
      setIsInitialSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-sm text-zinc-500 animate-pulse">
        Loading Google Calendar connection status...
      </div>
    );
  }

  const isConnected = connection && (connection.status === "active" || connection.status === "needs_reconnect");
  const needsReconnect = connection?.status === "needs_reconnect";

  return (
    <div className="space-y-6">
      {/* Banner / Status Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Reconnection Alert */}
      {needsReconnect && (
        <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Google Authorization Expired</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Your Google access token has been revoked or expired. Please reconnect to resume automatic appointment syncing.
              </p>
            </div>
          </div>
          <a
            href={`/api/integrations/google-calendar/auth?businessSlug=${businessSlug}`}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0"
          >
            Reconnect Now
          </a>
        </div>
      )}

      {/* Main Connection Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Google Calendar Integration
                {isConnected && !needsReconnect && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                )}
                {needsReconnect && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" /> Needs Reconnection
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Automatically synchronize Bookzello appointments to your personal or salon Google Calendar.
              </p>
            </div>
          </div>

          {!isConnected ? (
            <a
              href={`/api/integrations/google-calendar/auth?businessSlug=${businessSlug}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Connect Google Calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing || needsReconnect}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDisconnectModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition-colors"
              >
                <Power className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>

        {/* Connected Details & Configuration */}
        {isConnected && connection && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Connected Google Account
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  {connection.google_account_email}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Last Successful Synchronization
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {connection.last_successful_sync_at
                    ? new Date(connection.last_successful_sync_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "No successful sync yet"}
                </span>
              </div>
            </div>

            {/* Destination Calendar Selection */}
            <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label htmlFor="calendar-select" className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Destination Google Calendar
                  </label>
                  <p className="text-xs text-zinc-500">
                    Choose which calendar Bookzello should synchronize appointment events to.
                  </p>
                </div>
              </div>

              {calendars.length > 0 ? (
                <select
                  id="calendar-select"
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  disabled={isSaving || needsReconnect}
                  aria-label="Destination Google Calendar"
                  className="w-full sm:w-80 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary ? "(Primary)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    id="calendar-select"
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    disabled
                    aria-label="Destination Google Calendar"
                    className="w-full sm:w-80 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-500"
                  >
                    <option value="primary">Primary Calendar</option>
                  </select>
                  <span className="text-xs text-zinc-400">(Default)</span>
                </div>
              )}
            </div>

            {/* Automatic Synchronization Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Automatic Appointment Synchronization
                </span>
                <span className="text-xs text-zinc-500">
                  When enabled, bookings, reschedules, and cancellations automatically update your Google Calendar.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => setSyncEnabled(e.target.checked)}
                  disabled={isSaving || needsReconnect}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Save Settings and Initial Sync Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleInitialSync}
                disabled={isInitialSyncing || needsReconnect || !syncEnabled}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isInitialSyncing ? "animate-spin" : ""}`} />
                <span>Sync Next 30 Days of Appointments</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving || needsReconnect}
                className="inline-flex items-center justify-center px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Calendar Settings"}
              </button>
            </div>
          </div>
        )}

        {/* Security & Multi-Tenant Isolation Guarantee Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>OAuth 2.0 refresh tokens are encrypted at rest with AES-256-GCM and never exposed to the browser.</span>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Disconnect Google Calendar?
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Disconnecting will permanently remove stored OAuth authorization for this salon. Future Bookzello appointments will no longer synchronize to Google Calendar.
            </p>
            <p className="text-xs text-zinc-500">
              Note: Existing events already present in your Google Calendar will remain untouched, and Bookzello bookings and availability will not be affected.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isSaving}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? "Disconnecting..." : "Confirm Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
