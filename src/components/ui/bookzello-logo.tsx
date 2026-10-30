import React from "react";

interface BookzelloLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  iconOnly?: boolean;
}

export function BookzelloIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-xs ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Main outer bubble gradient: Royal Blue (#1852E8) to Electric Cyan (#00D2FF) */}
        <linearGradient id="bz-icon-bubble" x1="16" y1="112" x2="112" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#154DE6" />
          <stop offset="55%" stopColor="#0E6FF4" />
          <stop offset="100%" stopColor="#00D2FF" />
        </linearGradient>

        {/* Checkmark gradient: bright radiant cyan/aqua */}
        <linearGradient id="bz-icon-check" x1="42" y1="72" x2="78" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F5FF" />
          <stop offset="100%" stopColor="#00D2FF" />
        </linearGradient>

        {/* Calendar binder rings with 3D sheen */}
        <linearGradient id="bz-icon-ring-l" x1="28" y1="3" x2="39" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1240BE" />
        </linearGradient>
        <linearGradient id="bz-icon-ring-r" x1="81" y1="3" x2="92" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00C2FF" />
          <stop offset="100%" stopColor="#0E75F5" />
        </linearGradient>

        {/* Soft shadow for inner screen depth */}
        <filter id="bz-inner-shadow" x="20" y="26" width="80" height="66" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Top Left Binder Ring */}
      <rect x="29" y="3" width="11" height="24" rx="5.5" fill="url(#bz-icon-ring-l)" />

      {/* Top Right Binder Ring */}
      <rect x="80" y="3" width="11" height="24" rx="5.5" fill="url(#bz-icon-ring-r)" />

      {/* Calendar Chat Bubble Body */}
      <path
        d="M 32 18 
           H 88 
           C 101.5 18 112 28.5 112 42 
           V 74 
           C 112 87.5 101.5 98 88 98 
           H 38 
           C 34 98 28 102 22 108 
           C 19 111 16 112 15 110 
           C 14.2 108.5 15 101 15 94 
           V 42 
           C 15 28.5 22.5 18 32 18 
           Z"
        fill="url(#bz-icon-bubble)"
      />

      {/* Dark Inner Screen (Deep midnight navy with subtle recess) */}
      <rect x="27" y="31" width="66" height="52" rx="14" fill="#040F28" filter="url(#bz-inner-shadow)" />

      {/* Glowing Checkmark in Center */}
      <path
        d="M44 57 L55.5 68.5 L76 46"
        stroke="url(#bz-icon-check)"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookzelloLogo({
  className = "",
  iconClassName = "h-8 w-8 sm:h-9 sm:w-9",
  textClassName = "text-xl sm:text-2xl",
  iconOnly = false,
}: BookzelloLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 select-none ${className}`}>
      <BookzelloIcon className={iconClassName} />
      {!iconOnly && (
        <span
          className={`font-brand font-extrabold tracking-tight leading-none flex items-center ${textClassName}`}
          style={{ letterSpacing: "-0.03em" }}
        >
          <span className="text-[#1852E8]">Book</span>
          <span className="text-[#00D2FF]">zello</span>
        </span>
      )}
    </div>
  );
}
