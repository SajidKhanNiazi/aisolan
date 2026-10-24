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
    <Card className="p-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Public Customer Booking Link
              </h3>
              <Badge
                variant={onlineBookingEnabled ? "default" : "warning"}
                className="text-[10px] font-semibold uppercase tracking-wider"
              >
                {onlineBookingEnabled ? "Live & Active" : "Online Requests Paused"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Customers can book appointments directly with {businessName} via your unique salon link.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQR((prev) => !prev)}
            className="gap-1.5 text-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{showQR ? "Hide QR" : "Show QR"}</span>
          </Button>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 gap-1.5 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <span>Preview</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* URL Display and Copy */}
      <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800">
        <input
          type="text"
          readOnly
          value={publicUrl}
          className="flex-1 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 font-mono px-2 outline-none select-all"
        />
        <Button
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 text-xs h-7 px-3 shrink-0"
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
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/30 flex flex-col sm:flex-row items-center gap-6 justify-center text-center sm:text-left">
          <QRCodeSvg value={publicUrl} size={140} />
          <div className="space-y-2 max-w-xs">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Scan to Book
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Print this QR code for your reception counter, mirrors, or window stickers so walk-ins can scan and book.
            </p>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                publicUrl
              )}&margin=2`}
              download={`${businessSlug}-booking-qr.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline pt-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download High-Res QR (500x500)</span>
            </a>
          </div>
        </div>
      )}

      {!onlineBookingEnabled && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Online bookings are currently paused. Visitors will see your contact details instead of the booking wizard.
          </span>
        </div>
      )}
    </Card>
  );
}
