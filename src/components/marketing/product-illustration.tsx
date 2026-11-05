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
          ? "border border-[#AF6D7B]/20 shadow-md shadow-[#553B4B]/5 hover:shadow-lg hover:border-[#AF6D7B]/35 transition-all duration-300" 
          : "border border-[#AF6D7B]/20 shadow-xs"
      }`}>
        {/* Window Chrome Header with Realistic Browser Controls */}
        <div className={`flex items-center justify-between border-b px-4 py-3 ${
          isBlue ? "border-[#AF6D7B]/15 bg-gradient-to-r from-[#FBF6F3] via-white to-[#FBF6F3]" : "border-[#AF6D7B]/15 bg-[#FBF6F3]"
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-400/90" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-400/90" />
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-400/90" />
            <span className={`ml-1.5 sm:ml-2.5 text-[10px] sm:text-xs font-semibold tracking-tight ${
              isBlue ? "text-[#553B4B]" : "text-[#553B4B]"
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
                ? "bg-[#FBF6F3] text-[#AF6D7B] border-[#AF6D7B]/25 shadow-2xs" 
                : "bg-[#FBF6F3] text-[#AF6D7B] border-[#AF6D7B]/25"
            }`}>
              <Sparkles className="h-2.5 w-2.5 text-[#AF6D7B]" />
              <span>Product Illustration</span>
            </span>
          </div>
        </div>

        {/* Content Area: Either real image or CSS Illustration */}
        <div className="p-3 sm:p-5 bg-white">
          {realImageSrc ? (
            <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-[#AF6D7B]/15">
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
        <div className="border-t border-[#AF6D7B]/10 bg-[#FBF6F3]/50 px-4 py-2 flex items-center justify-between text-[10px] text-[#553B4B]/70">
          <span className="flex items-center gap-1 font-medium">
            <Camera className="h-3 w-3 text-[#AF6D7B]" />
            <span>Interactive UI Preview Frame</span>
          </span>
          <span className="text-[9.5px] text-[#553B4B]/60 italic">
            Bookzello SaaS Engine
          </span>
        </div>
      </div>

      {caption && (
        <figcaption className="mt-3 text-center text-xs leading-relaxed font-medium text-[#553B4B]/80">
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
      <div className="flex items-center justify-between pb-2 border-b border-[#AF6D7B]/15">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#27232B]">Today&apos;s Salon Schedule</span>
          <span className="rounded-full bg-[#FBF6F3] border border-[#AF6D7B]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#AF6D7B]">
            3 Stylists on Duty
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Collision-Safe Verified</span>
        </div>
      </div>

      {/* Stylist Columns Header */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] sm:text-[11px] font-bold text-[#27232B]">
        <div className="rounded-xl bg-[#FBF6F3] py-1.5 border border-[#AF6D7B]/25 text-[#AF6D7B]">
          Elena Vance (Senior)
        </div>
        <div className="rounded-xl bg-[#FBF6F3]/60 py-1.5 border border-[#AF6D7B]/20 text-[#553B4B]">
          Marcus T. (Barber)
        </div>
        <div className="rounded-xl bg-[#FBF6F3] py-1.5 border border-[#AF6D7B]/25 text-[#553B4B]">
          Maya Lin (Colorist)
        </div>
      </div>

      {/* Appointment Slots Representation */}
      <div className="grid grid-cols-3 gap-2">
        {/* Column 1 */}
        <div className="space-y-2">
          <div className="rounded-xl border border-[#AF6D7B]/25 bg-gradient-to-br from-[#FBF6F3] to-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-[#27232B]">
              <span>9:00 AM</span>
              <span className="text-[10px] text-[#AF6D7B] font-bold">45 min</span>
            </div>
            <div className="font-bold text-[#AF6D7B] text-[11px] mt-0.5">Cut &amp; Blow-Dry</div>
            <div className="text-[10px] text-[#553B4B]/80 mt-0.5">Client: Sarah M.</div>
          </div>

          <div className="rounded-xl border border-dashed border-[#AF6D7B]/25 bg-[#FBF6F3]/50 p-2 text-center text-[10px] font-semibold text-[#553B4B]/60">
            10:00 AM — Available
          </div>

          <div className="rounded-xl border border-[#AF6D7B]/20 bg-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-[#27232B]">
              <span>11:30 AM</span>
              <span className="text-[10px] text-[#553B4B]/80 font-semibold">60 min</span>
            </div>
            <div className="font-semibold text-[#553B4B] text-[11px] mt-0.5">Restyle &amp; Treatment</div>
            <div className="text-[10px] text-[#553B4B]/80 mt-0.5">Client: Oliver K.</div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-2">
          <div className="rounded-xl border border-[#AF6D7B]/20 bg-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-[#27232B]">
              <span>9:30 AM</span>
              <span className="text-[10px] text-[#553B4B]/80 font-semibold">30 min</span>
            </div>
            <div className="font-semibold text-[#553B4B] text-[11px] mt-0.5">Skin Fade &amp; Beard</div>
            <div className="text-[10px] text-[#553B4B]/80 mt-0.5">Client: James T.</div>
          </div>

          <div className="rounded-xl border border-[#AF6D7B]/25 bg-gradient-to-br from-[#FBF6F3] to-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-[#27232B]">
              <span>10:15 AM</span>
              <span className="text-[10px] text-[#AF6D7B] font-bold">45 min</span>
            </div>
            <div className="font-bold text-[#AF6D7B] text-[11px] mt-0.5">Hot Towel Shave</div>
            <div className="text-[10px] text-[#553B4B]/80 mt-0.5">Client: David W.</div>
          </div>

          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-2 text-center text-[10px] font-semibold text-amber-700">
            11:15 AM — Break
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-2">
          <div className="rounded-xl border border-[#AF6D7B]/25 bg-gradient-to-br from-[#FBF6F3] to-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-[#27232B]">
              <span>9:00 AM</span>
              <span className="text-[10px] text-[#AF6D7B] font-bold">90 min</span>
            </div>
            <div className="font-bold text-[#AF6D7B] text-[11px] mt-0.5">Balayage &amp; Gloss</div>
            <div className="text-[10px] text-[#553B4B]/80 mt-0.5">Client: Claire R.</div>
          </div>

          <div className="rounded-xl border border-dashed border-[#AF6D7B]/25 bg-[#FBF6F3]/50 p-2 text-center text-[10px] font-semibold text-[#553B4B]/60">
            10:45 AM — 15m Buffer
          </div>

          <div className="rounded-xl border border-[#AF6D7B]/20 bg-white p-2.5 text-left shadow-2xs">
            <div className="flex items-center justify-between font-bold text-[#27232B]">
              <span>11:00 AM</span>
              <span className="text-[10px] text-[#553B4B]/80 font-semibold">60 min</span>
            </div>
            <div className="font-semibold text-[#553B4B] text-[11px] mt-0.5">Root Touch-Up</div>
            <div className="text-[10px] text-[#553B4B]/80 mt-0.5">Client: Emily H.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffCalendarIllustration() {
  return (
    <div className="space-y-3 text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-[#AF6D7B]/15">
        <div className="font-bold text-[#27232B]">Staff Shifts &amp; Time Availability</div>
        <div className="text-[11px] font-medium text-[#553B4B]/80">Weekly Overview (Mon - Sat)</div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-[#AF6D7B]/20 p-2.5 sm:p-3 bg-white shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF6F3] text-[#AF6D7B] font-bold text-xs shadow-2xs border border-[#AF6D7B]/20">
              EV
            </div>
            <div>
              <div className="font-bold text-[#27232B]">Elena Vance — Senior Stylist</div>
              <div className="text-[10px] text-[#553B4B]/80">Tue – Sat: 09:00 – 17:30 (Break: 13:00)</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            Available
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#AF6D7B]/20 p-2.5 sm:p-3 bg-white shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF6F3] text-[#553B4B] font-bold text-xs shadow-2xs border border-[#AF6D7B]/20">
              MT
            </div>
            <div>
              <div className="font-bold text-[#27232B]">Marcus Thorne — Master Barber</div>
              <div className="text-[10px] text-[#553B4B]/80">Mon – Fri: 10:00 – 18:30 (Break: 14:00)</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
            Available
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#AF6D7B]/20 p-2.5 sm:p-3 bg-white shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF6F3] text-[#AF6D7B] font-bold text-xs shadow-2xs border border-[#AF6D7B]/20">
              ML
            </div>
            <div>
              <div className="font-bold text-[#27232B]">Maya Lin — Color Specialist</div>
              <div className="text-[10px] text-[#553B4B]/80">Wed – Sun: 09:30 – 18:00 (Break: 13:30)</div>
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
      <div className="flex items-center justify-between px-2 pb-2 border-b border-[#AF6D7B]/15">
        <div className="flex items-center gap-1.5 font-bold text-[#AF6D7B]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#27232B] text-white text-[10px]">✓</span>
          <span>1. Service</span>
        </div>
        <ChevronRight className="h-3 w-3 text-[#AF6D7B]/40" />
        <div className="flex items-center gap-1.5 font-bold text-[#AF6D7B]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#AF6D7B] text-white text-[10px]">2</span>
          <span>Date &amp; Time</span>
        </div>
        <ChevronRight className="h-3 w-3 text-[#AF6D7B]/40" />
        <div className="flex items-center gap-1.5 text-[#553B4B]/60 font-medium">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FBF6F3] text-[#553B4B]/80 text-[10px] border border-[#AF6D7B]/20">3</span>
          <span>Confirm</span>
        </div>
      </div>

      {/* Date & Time Picker Preview */}
      <div className="rounded-xl border border-[#AF6D7B]/20 p-3 bg-gradient-to-b from-[#FBF6F3] via-white to-white space-y-2.5">
        <div className="flex items-center justify-between text-[#27232B]">
          <div className="flex items-center gap-1.5 font-bold">
            <CalendarIcon className="h-3.5 w-3.5 text-[#AF6D7B]" />
            <span>Thursday, 29 October 2026</span>
          </div>
          <span className="text-[11px] font-semibold text-[#AF6D7B]">Elena Vance</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
          <div className="rounded-lg border-2 border-[#AF6D7B] bg-[#FBF6F3] py-1.5 font-bold text-[#AF6D7B] shadow-2xs">
            09:30 AM
          </div>
          <div className="rounded-lg border border-[#AF6D7B]/20 bg-white py-1.5 font-semibold text-[#553B4B] hover:border-[#AF6D7B]">
            11:15 AM
          </div>
          <div className="rounded-lg border border-[#AF6D7B]/20 bg-white py-1.5 font-semibold text-[#553B4B] hover:border-[#AF6D7B]">
            02:00 PM
          </div>
          <div className="rounded-lg border border-[#AF6D7B]/20 bg-white py-1.5 font-semibold text-[#553B4B] hover:border-[#AF6D7B]">
            03:45 PM
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#FBF6F3] p-2 text-center text-[11px] text-[#AF6D7B] font-semibold border border-[#AF6D7B]/20">
        Selected: Cut &amp; Finish • 45 minutes • Instant Confirmation
      </div>
    </div>
  );
}

function ServiceSelectionIllustration() {
  return (
    <div className="space-y-2.5 text-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-[#AF6D7B]/15">
        <span className="font-bold text-[#27232B]">Configured Salon Services</span>
        <span className="text-[11px] font-medium text-[#553B4B]/80">Duration &amp; Buffer Engine</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-[#AF6D7B]/25 bg-gradient-to-r from-[#FBF6F3] to-white p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#FBF6F3] text-[#AF6D7B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-[#27232B]">Signature Haircut &amp; Styling</div>
              <div className="text-[10px] text-[#553B4B]/80">45 min duration + 10 min turnover buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-extrabold text-[#27232B] text-sm">£45.00</span>
            <div className="text-[10px] font-medium text-[#553B4B]/70">Elena, Maya</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#AF6D7B]/20 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#FBF6F3] text-[#553B4B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-[#27232B]">Beard Trim &amp; Hot Towel Care</div>
              <div className="text-[10px] text-[#553B4B]/80">30 min duration + 5 min cleanup buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-bold text-[#27232B] text-sm">£28.00</span>
            <div className="text-[10px] font-medium text-[#553B4B]/70">Marcus</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#AF6D7B]/20 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-[#AF6D7B]/35 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#FBF6F3] text-[#AF6D7B] flex items-center justify-center shrink-0 border border-[#AF6D7B]/20">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-[#27232B]">Full Highlights &amp; Gloss Toner</div>
              <div className="text-[10px] text-[#553B4B]/80">120 min duration + 15 min buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-bold text-[#27232B] text-sm">£120.00</span>
            <div className="text-[10px] font-medium text-[#553B4B]/70">Maya</div>
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

      <div className="rounded-xl border border-[#AF6D7B]/20 bg-[#FBF6F3]/50 p-3.5 space-y-2 text-[#27232B]">
        <div className="flex justify-between border-b border-[#AF6D7B]/15 pb-1.5">
          <span className="text-[#553B4B]">Service:</span>
          <span className="font-bold">Precision Haircut &amp; Restyle</span>
        </div>
        <div className="flex justify-between border-b border-[#AF6D7B]/15 pb-1.5">
          <span className="text-[#553B4B]">Staff Member:</span>
          <span className="font-bold text-[#AF6D7B]">Elena Vance</span>
        </div>
        <div className="flex justify-between border-b border-[#AF6D7B]/15 pb-1.5">
          <span className="text-[#553B4B]">Scheduled Time:</span>
          <span className="font-bold">Thursday, 29 Oct at 09:30 AM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#553B4B]">Rescheduling Window:</span>
          <span className="text-[11px] text-emerald-600 font-bold">Up to 24h before appointment</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#553B4B]/70 pt-1 font-medium">
        <span>Reservation ID: #BKZ-7821</span>
        <span className="text-emerald-600 font-semibold">✓ Automated Confirmation Sent</span>
      </div>
    </div>
  );
}
