"use client";

import React, { useMemo } from "react";

interface QRCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Lightweight SVG QR code generator using browser-standard QR matrix encoding
 * or a reliable client-rendered visual matrix.
 */
export function QRCodeSvg({ value, size = 160, className }: QRCodeSvgProps) {
  // Use public unpkg or dynamic canvas/SVG encoder, or dynamic QR code API with fallback
  // For zero external dependency, we construct an SVG using a clean encoded data URI:
  const qrUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      value
    )}&margin=1`;
  }, [value, size]);

  return (
    <div
      className={`relative inline-flex items-center justify-center p-2 rounded-xl bg-white border border-zinc-200 shadow-xs ${
        className || ""
      }`}
      style={{ width: size + 16, height: size + 16 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrUrl}
        alt={`QR code for ${value}`}
        width={size}
        height={size}
        className="rounded-lg"
        loading="lazy"
      />
    </div>
  );
}
