import React from "react";
import Image from "next/image";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Scissors, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Camera
} from "lucide-react";

export type IllustrationVariant = 
  | "hero-dashboard" 
  | "staff-calendar" 
  | "customer-booking" 
  | "service-selection" 
  | "appointment-review";

interface ProductIllustrationProps {
  variant: IllustrationVariant;
  caption?: string;
  realImageSrc?: string;
  realImageAlt?: string;
  className?: string;
  theme?: "blue" | "default";
}

export function ProductIllustration({
  variant,
  caption,
  realImageSrc,
  realImageAlt,
  className = "",
  theme = "blue",
}: ProductIllustrationProps) {
  const isBlue = theme === "blue";

  return (
    <figure className={`flex flex-col ${className}`}>
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white ${
        isBlue 
          ? "border border-blue-100 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:border-blue-200 transition-all duration-300" 
          : "border border-slate-200 soft-card-elevated"
      }`}>
        {/* Window Chrome Header with Realistic Browser Controls */}
        <div className={`flex items-center justify-between border-b px-4 py-3 ${
          isBlue ? "border-blue-100/90 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50" : "border-slate-200 bg-slate-50"
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-400/90" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-400/90" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-400/90" />
            <span className={`ml-1.5 sm:ml-2.5 text-[10px] sm:text-xs font-semibold tracking-tight ${
              isBlue ? "text-slate-600" : "text-slate-500"
            }`}>
              {variant === "hero-dashboard" && "bookzello.com/dashboard/salon-schedule"}
              {variant === "staff-calendar" && "bookzello.com/dashboard/staff-availability"}
              {variant === "customer-booking" && "bookzello.com/booking/luxe-hair-studio"}
              {variant === "service-selection" && "bookzello.com/dashboard/service-catalog"}
              {variant === "appointment-review" && "bookzello.com/dashboard/appointments/BKZ-7821"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold border ${
              isBlue 
                ? "bg-blue-50 text-[#1D64EC] border-blue-200/90 shadow-2xs" 
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              <Sparkles className="h-2.5 w-2.5 text-[#1D64EC]" />
              <span>Product Illustration</span>
            </span>
          </div>
        </div>

        {/* Content Area: Either real image or CSS Illustration */}
        <div className="p-3 sm:p-5 bg-white">
          {realImageSrc ? (
            <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-slate-100">
              <Image 
                src={realImageSrc} 
                alt={realImageAlt || caption || "Bookzello product screenshot"} 
                fill 
                className="object-cover" 
              />
            </div>
          ) : (
            <div className="w-full">
              {variant === "hero-dashboard" && <HeroDashboardIllustration />}
              {variant === "staff-calendar" && <StaffCalendarIllustration />}
              {variant === "customer-booking" && <CustomerBookingIllustration />}
              {variant === "service-selection" && <ServiceSelectionIllustration />}
              {variant === "appointment-review" && <AppointmentReviewIllustration />}
            </div>
          )}
        </div>

        {/* Subtle Screenshot Replace Hint / Verified Frame Footer */}
        <div className="border-t border-slate-100/90 bg-slate-50/60 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <Camera className="h-3 w-3 text-slate-400" />
            <span>Interactive UI Preview Frame</span>
          </span>
          <span className="text-[9.5px] text-slate-400 italic">
            Bookzello SaaS Engine
          </span>
        </div>
      </div>

      {caption && (
        <figcaption className={`mt-3 text-center text-xs leading-relaxed font-medium ${
          isBlue ? "text-slate-500" : "text-slate-600"
        }`}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function HeroDashboardIllustration() {
  return (
    <div className="space-y-3.5 text-xs select-none">
      {/* Top summary row */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900">Today&apos;s Salon Schedule</span>
          <span className="rounded-full bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 text-[10px] font-bold text-[#1D64EC]">
            3 Stylists on Duty
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Collision-Safe Verified</span>
        </div>
      </div>

      {/* Stylist Columns Header */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] sm:text-[11px] font-bold text-slate-900">
        <div className="rounded-xl bg-blue-50/80 py-1.5 border border-blue-100 text-[#1D64EC]">
          Elena Vance (Senior)
        </div>
        <div className="rounded-xl bg-slate-100/80 py-1.5 border border-slate-200/80 text-slate-800">
          Marcus T. (Barber)
        </div>
        <div className="rounded-xl bg-sky-50/80 py-1.5 border border-sky-100 text-sky-800">
          Maya Lin (Colorist)
        </div>
      </div>

      {/* Appointment Slots Representation */}
      <div className="grid grid-cols-3 gap-2">
        {/* Column 1 */}
        <div className="space-y-2">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>9:00 AM</span>
              <span className="text-[10px] text-[#1D64EC] font-bold">45 min</span>
            </div>
            <div className="font-bold text-[#1D64EC] text-[11px] mt-0.5">Cut &amp; Blow-Dry</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Client: Sarah M.</div>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-2 text-center text-[10px] font-semibold text-slate-400">
            10:00 AM — Available
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>11:30 AM</span>
              <span className="text-[10px] text-slate-500 font-semibold">60 min</span>
            </div>
            <div className="font-semibold text-slate-800 text-[11px] mt-0.5">Restyle &amp; Treatment</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Client: Oliver K.</div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-2">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>9:30 AM</span>
              <span className="text-[10px] text-slate-500 font-semibold">30 min</span>
            </div>
            <div className="font-semibold text-slate-800 text-[11px] mt-0.5">Skin Fade &amp; Beard</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Client: James T.</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>10:15 AM</span>
              <span className="text-[10px] text-[#1D64EC] font-bold">45 min</span>
            </div>
            <div className="font-bold text-[#1D64EC] text-[11px] mt-0.5">Hot Towel Shave</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Client: David W.</div>
          </div>

          <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-2 text-center text-[10px] font-semibold text-amber-700">
            11:15 AM — Break
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-2">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>9:00 AM</span>
              <span className="text-[10px] text-[#1D64EC] font-bold">90 min</span>
            </div>
            <div className="font-bold text-[#1D64EC] text-[11px] mt-0.5">Balayage &amp; Gloss</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Client: Claire R.</div>
          </div>

          <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/60 p-2 text-center text-[10px] font-semibold text-cyan-800">
            10:45 AM — 15m Buffer
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>11:00 AM</span>
              <span className="text-[10px] text-slate-500 font-semibold">60 min</span>
            </div>
            <div className="font-semibold text-slate-800 text-[11px] mt-0.5">Root Touch-Up</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Client: Emily H.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffCalendarIllustration() {
  return (
    <div className="space-y-3 text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="font-bold text-slate-900">Staff Shifts &amp; Time Availability</div>
        <div className="text-[11px] font-medium text-slate-500">Weekly Overview (Mon - Sat)</div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 p-2.5 sm:p-3 bg-white shadow-2xs hover:border-blue-200 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-[#1D64EC] font-bold text-xs shadow-2xs">
              EV
            </div>
            <div>
              <div className="font-bold text-slate-900">Elena Vance — Senior Stylist</div>
              <div className="text-[10px] text-slate-500">Tue – Sat: 09:00 – 17:30 (Break: 13:00)</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            Available
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 p-2.5 sm:p-3 bg-white shadow-2xs hover:border-blue-200 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-800 font-bold text-xs shadow-2xs">
              MT
            </div>
            <div>
              <div className="font-bold text-slate-900">Marcus Thorne — Master Barber</div>
              <div className="text-[10px] text-slate-500">Mon – Fri: 10:00 – 18:30 (Break: 14:00)</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            Available
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 p-2.5 sm:p-3 bg-white shadow-2xs hover:border-blue-200 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-[#0091FF] font-bold text-xs shadow-2xs">
              ML
            </div>
            <div>
              <div className="font-bold text-slate-900">Maya Lin — Color Specialist</div>
              <div className="text-[10px] text-slate-500">Wed – Sun: 09:30 – 18:00 (Break: 13:30)</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            Available
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomerBookingIllustration() {
  return (
    <div className="space-y-3 text-xs select-none">
      {/* Step Indicators */}
      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 font-bold text-[#1D64EC]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1D64EC] text-white text-[10px]">✓</span>
          <span>1. Service</span>
        </div>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <div className="flex items-center gap-1.5 font-bold text-[#1D64EC]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1D64EC] text-white text-[10px]">2</span>
          <span>Date &amp; Time</span>
        </div>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-[10px]">3</span>
          <span>Confirm</span>
        </div>
      </div>

      {/* Date & Time Picker Preview */}
      <div className="rounded-xl border border-blue-100 p-3 bg-gradient-to-b from-blue-50/40 via-white to-white space-y-2.5">
        <div className="flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-1.5 font-bold">
            <CalendarIcon className="h-3.5 w-3.5 text-[#1D64EC]" />
            <span>Thursday, 29 October 2026</span>
          </div>
          <span className="text-[11px] font-semibold text-[#1D64EC]">Elena Vance</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
          <div className="rounded-lg border-2 border-[#1D64EC] bg-blue-50 py-1.5 font-bold text-[#1D64EC] shadow-2xs">
            09:30 AM
          </div>
          <div className="rounded-lg border border-slate-200 bg-white py-1.5 font-semibold text-slate-700 hover:border-blue-300">
            11:15 AM
          </div>
          <div className="rounded-lg border border-slate-200 bg-white py-1.5 font-semibold text-slate-700 hover:border-blue-300">
            02:00 PM
          </div>
          <div className="rounded-lg border border-slate-200 bg-white py-1.5 font-semibold text-slate-700 hover:border-blue-300">
            03:45 PM
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50/80 p-2 text-center text-[11px] text-[#1D64EC] font-semibold border border-blue-200/80">
        Selected: Cut &amp; Finish • 45 minutes • Instant Confirmation
      </div>
    </div>
  );
}

function ServiceSelectionIllustration() {
  return (
    <div className="space-y-2.5 text-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <span className="font-bold text-slate-900">Configured Salon Services</span>
        <span className="text-[11px] font-medium text-slate-500">Duration &amp; Buffer Engine</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-white p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-[#1D64EC] flex items-center justify-center shrink-0">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Signature Haircut &amp; Styling</div>
              <div className="text-[10px] text-slate-500">45 min duration + 10 min turnover buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-extrabold text-[#1D64EC] text-sm">£45.00</span>
            <div className="text-[10px] font-medium text-slate-500">Elena, Maya</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Beard Trim &amp; Hot Towel Care</div>
              <div className="text-[10px] text-slate-500">30 min duration + 5 min cleanup buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-900 text-sm">£28.00</span>
            <div className="text-[10px] font-medium text-slate-500">Marcus</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Full Highlights &amp; Gloss Toner</div>
              <div className="text-[10px] text-slate-500">120 min duration + 15 min buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-900 text-sm">£120.00</span>
            <div className="text-[10px] font-medium text-slate-500">Maya</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentReviewIllustration() {
  return (
    <div className="space-y-3 text-xs select-none">
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="font-bold text-xs">Appointment Confirmed in Booking System</span>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 space-y-2 text-slate-900">
        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
          <span className="text-slate-500">Service:</span>
          <span className="font-bold">Precision Haircut &amp; Restyle</span>
        </div>
        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
          <span className="text-slate-500">Staff Member:</span>
          <span className="font-bold text-[#1D64EC]">Elena Vance</span>
        </div>
        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
          <span className="text-slate-500">Scheduled Time:</span>
          <span className="font-bold">Thursday, 29 Oct at 09:30 AM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Rescheduling Window:</span>
          <span className="text-[11px] text-emerald-600 font-bold">Up to 24h before appointment</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
        <span>Reservation ID: #BKZ-7821</span>
        <span className="text-emerald-600 font-semibold">✓ Automated Confirmation Sent</span>
      </div>
    </div>
  );
}
