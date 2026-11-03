"use client";

import { useState } from "react";
import Image from "next/image";

interface SalonLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SalonLogo({
  name,
  logoUrl,
  size = "md",
  className = "",
}: SalonLogoProps) {
  const [hasError, setHasError] = useState(false);

  const cleanUrl = typeof logoUrl === "string" ? logoUrl.trim() : null;
  const initial = (name || "S").trim().charAt(0).toUpperCase() || "S";

  const sizeClasses = {
    sm: "w-10 h-10 rounded-lg text-base",
    md: "w-12 h-12 rounded-xl text-lg",
    lg: "w-14 h-14 rounded-2xl text-xl",
  }[size];

  // Fallback to initials if logo_url is null, empty string, or image fails to load
  if (!cleanUrl || hasError) {
    return (
      <div
        className={`${sizeClasses} bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm border border-blue-500/20 select-none ${className}`}
        aria-label={`${name} avatar`}
        role="img"
      >
        <span>{initial}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClasses} overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0 shadow-xs bg-zinc-50 dark:bg-zinc-800 ${className}`}
    >
      <Image
        src={cleanUrl}
        alt={name}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
        unoptimized={cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")}
      />
    </div>
  );
}
