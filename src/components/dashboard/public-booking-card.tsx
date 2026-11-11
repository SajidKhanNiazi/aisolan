"use client";

import React, { useState } from "react";
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Download,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSvg } from "./qr-code";

interface PublicBookingCardProps {
  businessSlug: string;
  businessName: string;
  onlineBookingEnabled: boolean;
}

export function PublicBookingCard({
  businessSlug,
  businessName,
  onlineBookingEnabled,
}: PublicBookingCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Compute public booking link
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://bookzello.com";
  const publicUrl = `${origin}/booking/${businessSlug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md">
      {/* Top subtle brand accent line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

      <div className="p-5 sm:p-6 space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Public Customer Booking Link
                </h3>
                <Badge
                  variant={onlineBookingEnabled ? "default" : "warning"}
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1.5 ${
                    onlineBookingEnabled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      onlineBookingEnabled
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  {onlineBookingEnabled ? "Live & Accepting Clients" : "Online Requests Paused"}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Share this link on Instagram, Google Business, or WhatsApp so clients can book directly with <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{businessName}</strong>.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR((prev) => !prev)}
              className={`gap-1.5 text-xs h-8.5 rounded-lg border-zinc-200 dark:border-zinc-700 transition-colors ${
                showQR ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold" : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQR ? "Hide QR" : "Show QR Code"}</span>
            </Button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8.5 px-3 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-xs gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>Visit Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* URL Display and Quick Copy */}
        <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-all">
          <div className="flex items-center pl-2 text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <input
            type="text"
            readOnly
            value={publicUrl}
            className="flex-1 bg-transparent text-xs text-zinc-800 dark:text-zinc-200 font-mono px-2 outline-none select-all truncate"
            title={publicUrl}
          />
          <Button
            size="sm"
            onClick={handleCopy}
            className={`gap-1.5 text-xs h-8 px-3.5 rounded-lg shrink-0 transition-all font-semibold ${
              copied
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </Button>
        </div>

        {/* QR Code expansion */}
        {showQR && (
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-b from-zinc-50/80 to-white dark:from-zinc-850/60 dark:to-zinc-900/60 flex flex-col sm:flex-row items-center gap-6 justify-center text-center sm:text-left transition-all animate-in fade-in-50 duration-200">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-zinc-200/80 dark:border-zinc-700 shrink-0">
              <QRCodeSvg value={publicUrl} size={140} />
            </div>
            <div className="space-y-2 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                <QrCode className="w-3 h-3" />
                Scan to Book
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Salon Counter & Mirror QR Code
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Print this QR code for your reception desk, mirrors, business cards, or window stickers so walk-in clients can scan and schedule immediately.
              </p>
              <div className="pt-1">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                    publicUrl
                  )}&margin=2`}
                  download={`${businessSlug}-booking-qr.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download High-Res QR (500x500 PNG)</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {!onlineBookingEnabled && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="leading-relaxed">
              Online bookings are currently paused in your salon settings. Clients visiting your public link will see your direct contact details instead of the automated booking flow.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
