"use client";

import { useEffect, useState, useTransition } from "react";
import {
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Unlink,
  RefreshCw,
  PhoneCall,
  Smartphone,
  Info,
} from "lucide-react";
import {
  getWhatsAppSettingsAction,
  initiateWhatsAppConnectionAction,
  completeWhatsAppConnectionAction,
  disconnectWhatsAppConnectionAction,
  type WhatsAppDashboardInfo,
} from "@/features/integrations/whatsapp/server";

interface WhatsAppSettingsEditorProps {
  businessSlug: string;
  salonName?: string;
  isOwnerOrManager?: boolean;
}

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string; accessToken?: string } }) => void,
        options: {
          config_id?: string;
          response_type?: string;
          override_default_response_type?: boolean;
          extras?: Record<string, unknown>;
          state?: string;
        }
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function WhatsAppSettingsEditor({
  businessSlug,
  salonName = "Your Salon",
  isOwnerOrManager = true,
}: WhatsAppSettingsEditorProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WhatsAppDashboardInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Disconnect Confirmation Modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Manual / Sandbox Connection Dialog (for testing or when FB SDK is unavailable)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPhoneId, setManualPhoneId] = useState("");
  const [manualWabaId, setManualWabaId] = useState("");
  const [manualDisplayNumber, setManualDisplayNumber] = useState("+44 7700 900123");
  const [manualCoexistence, setManualCoexistence] = useState(true);

  const loadSettings = () => {
    setLoading(true);
    setError(null);
    getWhatsAppSettingsAction(businessSlug).then((res) => {
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load WhatsApp settings");
      }
      setLoading(false);
    });
  };

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

  // Load Meta Facebook SDK if appId is available
  useEffect(() => {
    if (!data?.appId || typeof window === "undefined" || window.FB) return;

    window.fbAsyncInit = function () {
      if (window.FB && data.appId) {
        window.FB.init({
          appId: data.appId,
          cookie: true,
          xfbml: true,
          version: data.graphApiVersion || "v26.0",
        });
      }
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [data?.appId, data?.graphApiVersion]);

  // Handle Meta Embedded Signup trigger
  const handleLaunchEmbeddedSignup = async () => {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const initRes = await initiateWhatsAppConnectionAction(businessSlug);
      if (!initRes.success || !initRes.data) {
        setError(initRes.error || "Failed to initiate WhatsApp connection.");
        return;
      }

      const { state, appId, configId } = initRes.data;

      // If FB SDK is loaded and in a live environment, launch official FB.login popup
      if (window.FB && appId && configId && !appId.startsWith("mock_")) {
        window.FB.login(
          (response) => {
            if (response.authResponse?.code) {
              const code = response.authResponse.code;
              // Finish connection on the server
              startTransition(async () => {
                const completeRes = await completeWhatsAppConnectionAction({
                  businessSlug,
                  code,
                  state,
                  wabaId: data?.testWabaId || "waba_embedded",
                  phoneNumberId: data?.testPhoneNumberId || "phone_embedded",
                });
                if (completeRes.success) {
                  setSuccessMessage("WhatsApp Business Account connected successfully!");
                  loadSettings();
                } else {
                  setError(completeRes.error || "Failed to finalize WhatsApp connection.");
                }
              });
            } else {
              setError("Meta Embedded Signup was closed or cancelled by user.");
            }
          },
          {
            config_id: configId,
            response_type: "code",
            override_default_response_type: true,
            state,
            extras: {
              feature: "whatsapp_embedded_signup",
              sessionInfoVersion: "2",
            },
          }
        );
      } else {
        // Fallback to testing / mock dialog if FB SDK popup cannot be launched
        setManualPhoneId(data?.testPhoneNumberId?.startsWith("Configured") ? "105551234567890" : "105551234567890");
        setManualWabaId(data?.testWabaId?.startsWith("Configured") ? "205551234567890" : "205551234567890");
        setShowManualModal(true);
      }
    });
  };

  const handleCompleteManualConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!manualPhoneId.trim() || !manualWabaId.trim()) {
      setError("Please provide a valid Phone Number ID and WABA ID.");
      return;
    }

    startTransition(async () => {
      const initRes = await initiateWhatsAppConnectionAction(businessSlug);
      if (!initRes.success || !initRes.data) {
        setError(initRes.error || "Failed to initialize connection.");
        return;
      }

      const completeRes = await completeWhatsAppConnectionAction({
        businessSlug,
        code: `mock_code_${Date.now()}`,
        state: initRes.data.state,
        wabaId: manualWabaId.trim(),
        phoneNumberId: manualPhoneId.trim(),
        coexistenceEnabled: manualCoexistence,
      });

      if (completeRes.success) {
        setSuccessMessage("WhatsApp Business number connected successfully!");
        setShowManualModal(false);
        loadSettings();
      } else {
        setError(completeRes.error || "Failed to complete connection.");
      }
    });
  };

  const handleDisconnect = async () => {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await disconnectWhatsAppConnectionAction(businessSlug);
      if (res.success) {
        setSuccessMessage("WhatsApp Business disconnected. AI receptionist has stopped answering this number.");
        setShowDisconnectModal(false);
        loadSettings();
      } else {
        setError(res.error || "Failed to disconnect WhatsApp.");
      }
    });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-500 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span>Loading WhatsApp integration settings...</span>
      </div>
    );
  }

  const isConnected = data?.connection?.connectionStatus === "active";
  const conn = data?.connection;

  return (
    <div className="space-y-6">
      {/* Pilot Header Banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Official Meta WhatsApp Cloud API AI Receptionist
                </h3>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                    isConnected
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                  }`}
                >
                  {data?.statusBadge || (isConnected ? "Connected (Active)" : "Ready to Connect")}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Connect your salon&rsquo;s WhatsApp Business number to automatically answer inquiries, share prices, check
                live calendar availability, and capture booking drafts.
              </p>
            </div>
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={loadSettings}
            disabled={isPending}
            className="self-start sm:self-center p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 text-xs flex items-center gap-1.5 shadow-2xs"
            title="Refresh Status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <p className="font-semibold">Action Failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-semibold">Success</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Active Connection Overview Card (When Connected) */}
      {isConnected && conn && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <PhoneCall className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>{conn.verifiedName || salonName}</span>
                  <span className="inline-flex items-center text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                    Active Channel
                  </span>
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-mono">
                  {conn.businessDisplayNumber || "Verified Number"}
                </p>
              </div>
            </div>

            {isOwnerOrManager && (
              <button
                type="button"
                onClick={() => setShowDisconnectModal(true)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-zinc-900 text-red-600 hover:bg-red-50 text-xs font-medium flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
              >
                <Unlink className="h-3.5 w-3.5" />
                <span>Disconnect WhatsApp</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
              <span className="text-zinc-500 font-medium">Phone Number ID</span>
              <p className="font-mono text-zinc-900 dark:text-zinc-100 truncate">{conn.phoneNumberId}</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
              <span className="text-zinc-500 font-medium">WhatsApp Account (WABA ID)</span>
              <p className="font-mono text-zinc-900 dark:text-zinc-100 truncate">{conn.wabaId}</p>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
              <span className="text-zinc-500 font-medium">Coexistence Mode</span>
              <p className="text-zinc-900 dark:text-zinc-100 font-medium flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                <span>{conn.coexistenceEnabled ? "Active (App & Cloud API)" : "Cloud API Only"}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unconnected State: Launch Onboarding Action Card */}
      {!isConnected && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Connect Your WhatsApp Business Number
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Use Meta&rsquo;s official Embedded Signup to grant permissions, link your WhatsApp Business Account, and
                enable AI receptionist responses on your dedicated salon phone number.
              </p>
            </div>

            {isOwnerOrManager && (
              <button
                type="button"
                onClick={handleLaunchEmbeddedSignup}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                <span>Connect WhatsApp Business</span>
              </button>
            )}
          </div>

          {/* Missing Prerequisites Alert (if Meta App details missing) */}
          {data?.missingPrerequisites && data.missingPrerequisites.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Info className="h-4 w-4 text-amber-600" />
                <span>Meta Platform Prerequisites Pending</span>
              </div>
              <p className="text-amber-800 dark:text-amber-400 leading-relaxed">
                To launch the live Meta popup, the platform administrator must configure the following in the environment:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-amber-900 dark:text-amber-300">
                {data.missingPrerequisites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                You can still test salon onboarding in sandbox mode by clicking the connect button above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Business App Coexistence Explanatory Callout */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          <Smartphone className="h-4 w-4 text-blue-600" />
          <span>Already using the WhatsApp Business App? Coexistence is supported</span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          You do <strong>not</strong> need to delete your existing WhatsApp Business App or lose chat history. Meta supports
          <strong> Onboarding Coexistence</strong>: your phone number will continue working on your mobile device for direct 1-to-1
          chats while Bookzello handles automated scheduling inquiries via the Cloud API simultaneously.
        </p>
        <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 list-disc pl-4 pt-1">
          <li>Manual messages sent on your phone stay free of charge.</li>
          <li>Outbound API replies automatically mirror back into your phone&rsquo;s chat history.</li>
          <li>Meta requirement: Open the WhatsApp Business app on your phone at least once every 13 days to keep coexistence active.</li>
        </ul>
      </div>

      {/* Channel Safety & Invariant Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Channel State</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                data?.enabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {data?.enabled ? "Channel Active" : "Disabled"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">WHATSAPP_ENABLED={String(data?.enabled)}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Outbound Messaging</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                data?.hasMetaCredentials && data?.outboundEnabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              }`}
            >
              {data?.outboundStatusLabel || "Mock Transport (Safe)"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">WHATSAPP_OUTBOUND_ENABLED={String(data?.outboundEnabled)}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">Booking Mutations</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              Read-Only Drafts (Safe)
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">WHATSAPP_BOOKING_WRITES_ENABLED=false</p>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-black/50 backdrop-blur-xs flex min-h-full items-center justify-center animate-in fade-in"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-base">
              <AlertCircle className="h-5 w-5" />
              <span>Disconnect WhatsApp Business?</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This will unlink your WhatsApp Business number from Bookzello. The AI receptionist will immediately stop
              responding to customer WhatsApp messages on this number. You can reconnect at any time.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                disabled={isPending}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isPending}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual / Sandbox Connection Modal */}
      {showManualModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-black/50 backdrop-blur-xs flex min-h-full items-center justify-center animate-in fade-in"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Meta WhatsApp Onboarding Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              In test and sandbox environments, specify your Meta-assigned Phone Number ID and WABA ID to complete
              tenant-isolated connection verification without opening external popups.
            </p>

            <form onSubmit={handleCompleteManualConnection} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Meta Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={manualPhoneId}
                  onChange={(e) => setManualPhoneId(e.target.value)}
                  placeholder="e.g. 105551234567890"
                  className="w-full text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Meta WhatsApp Business Account (WABA) ID *
                </label>
                <input
                  type="text"
                  required
                  value={manualWabaId}
                  onChange={(e) => setManualWabaId(e.target.value)}
                  placeholder="e.g. 205551234567890"
                  className="w-full text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Display Phone Number
                </label>
                <input
                  type="text"
                  value={manualDisplayNumber}
                  onChange={(e) => setManualDisplayNumber(e.target.value)}
                  placeholder="e.g. +44 7700 900123"
                  className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="coexistenceCheckbox"
                  checked={manualCoexistence}
                  onChange={(e) => setManualCoexistence(e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="coexistenceCheckbox" className="text-xs text-zinc-700 dark:text-zinc-300 select-none">
                  Enable WhatsApp Business App Coexistence Mode
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  disabled={isPending}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save &amp; Connect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
