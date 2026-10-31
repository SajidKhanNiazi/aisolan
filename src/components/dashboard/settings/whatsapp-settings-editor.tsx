"use client";

import { useEffect, useState } from "react";
import { MessageSquare, AlertCircle, Shield } from "lucide-react";
import { getWhatsAppSettingsAction, type WhatsAppDashboardInfo } from "@/features/integrations/whatsapp/server";

interface WhatsAppSettingsEditorProps {
  businessSlug: string;
  salonName?: string;
  isOwnerOrManager?: boolean;
}

export function WhatsAppSettingsEditor({
  businessSlug,
}: WhatsAppSettingsEditorProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WhatsAppDashboardInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getWhatsAppSettingsAction(businessSlug).then((res) => {
      if (!mounted) return;
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load WhatsApp settings");
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [businessSlug]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-500">
        Loading WhatsApp integration settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pilot Header Banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Official Meta WhatsApp Cloud API AI Receptionist
                </h3>
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  {data?.statusBadge || "Phase 1H-D1 Pilot"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
                Start with a Meta-provided test phone number and authorized test recipients.
                All conversations use the authoritative Bookzello booking engine and salon catalog.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Safety & Gate Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Channel Status</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                data?.enabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {data?.enabled ? "Enabled" : "Disabled (Default)"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">WHATSAPP_ENABLED gate</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Outbound Sending</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                data?.outboundEnabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              }`}
            >
              {data?.outboundEnabled ? "Live Network Active" : "Mock Transport (Safe)"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">WHATSAPP_OUTBOUND_ENABLED gate</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Booking Writes</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              Read-Only Drafts (D1 Pilot)
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">WHATSAPP_BOOKING_WRITES_ENABLED=false</p>
        </div>
      </div>

      {/* Connection & Configuration Overview */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Official Meta Cloud API Pilot Connection
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            Scoped to tenant: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{businessSlug}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 space-y-1">
            <span className="text-zinc-500 font-medium">Graph API Version</span>
            <p className="font-mono text-zinc-900 dark:text-zinc-100">{data?.graphApiVersion}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 space-y-1">
            <span className="text-zinc-500 font-medium">Webhook Endpoint URL</span>
            <p className="font-mono text-zinc-900 dark:text-zinc-100 select-all">
              https://bookzello.com/api/integrations/whatsapp/webhook
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 space-y-1">
            <span className="text-zinc-500 font-medium">Test Phone Number ID</span>
            <p className="font-mono text-zinc-900 dark:text-zinc-100">{data?.testPhoneNumberId}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 space-y-1">
            <span className="text-zinc-500 font-medium">Test WABA ID</span>
            <p className="font-mono text-zinc-900 dark:text-zinc-100">{data?.testWabaId}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            <Shield className="h-4 w-4 text-blue-600" />
            <span>Pilot Security Controls</span>
          </div>
          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
            <li>Webhook signature verified using HMAC-SHA256 (`X-Hub-Signature-256`) with timing-safe comparison.</li>
            <li>Inbound events persisted durably with deduplication keys to eliminate duplicate message processing.</li>
            <li>Strict phone-number-to-tenant isolation prevents cross-organization message leakage.</li>
            <li>STOP / UNSUBSCRIBE keywords instantly pause automated messages.</li>
            <li>Human handoff keywords pause AI and alert the salon team.</li>
            <li>D1 Pilot Gate: Zero live booking writes permitted without explicit owner authorization.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
