import React from "react";
import Image from "next/image";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Scissors, 
  ShieldCheck, 
  ChevronRight
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
}

export function ProductIllustration({
  variant,
  caption,
  realImageSrc,
  realImageAlt,
  className = "",
}: ProductIllustrationProps) {
  return (
    <figure className={`flex flex-col ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-[#E8E6DF] bg-white soft-card-elevated">
        {/* Window Chrome Header */}
        <div className="flex items-center justify-between border-b border-[#E8E6DF] bg-[#F7F6F2] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E57373]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFB74D]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#81C784]/80" />
            <span className="ml-2 text-[11px] font-medium text-[#627D98]">
              {variant === "hero-dashboard" && "Bookzello — Salon Calendar & Daily Schedule"}
              {variant === "staff-calendar" && "Bookzello — Team Roster & Availability"}
              {variant === "customer-booking" && "Bookzello — Client Online Booking Flow"}
              {variant === "service-selection" && "Bookzello — Services & Durations"}
              {variant === "appointment-review" && "Bookzello — Appointment Summary & Actions"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-[#E6F5F4] px-2 py-0.5 text-[10px] font-semibold text-[#0A8F87] border border-[#0A8F87]/20">
              Illustration
            </span>
          </div>
        </div>

        {/* Content Area: Either real image or CSS Illustration */}
        <div className="p-4 sm:p-5 bg-white">
          {realImageSrc ? (
            <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg">
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
      </div>

      {caption && (
        <figcaption className="mt-3 text-center text-xs text-[#627D98] leading-relaxed">
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
      <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DF]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#142B43]">Today&apos;s Salon Schedule</span>
          <span className="rounded-full bg-[#E6F5F4] px-2 py-0.5 text-[10px] font-medium text-[#0A8F87]">
            3 Stylists on Duty
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-[#627D98]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#0A8F87]" />
          <span>Real-time Collision Safe</span>
        </div>
      </div>

      {/* Stylist Columns Header */}
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-[#142B43]">
        <div className="rounded-md bg-[#F7F6F2] py-1.5 border border-[#E8E6DF]/60">
          Elena Vance (Hair)
        </div>
        <div className="rounded-md bg-[#F7F6F2] py-1.5 border border-[#E8E6DF]/60">
          Marcus Thorne (Barber)
        </div>
        <div className="rounded-md bg-[#F7F6F2] py-1.5 border border-[#E8E6DF]/60">
          Maya Lin (Colorist)
        </div>
      </div>

      {/* Appointment Slots Representation */}
      <div className="grid grid-cols-3 gap-2">
        {/* Column 1 */}
        <div className="space-y-2">
          <div className="rounded-lg border border-[#0A8F87]/30 bg-[#E6F5F4]/70 p-2 text-left">
            <div className="flex items-center justify-between font-semibold text-[#142B43]">
              <span>9:00 AM</span>
              <span className="text-[10px] text-[#0A8F87] font-medium">45 min</span>
            </div>
            <div className="font-medium text-[#142B43] mt-0.5">Cut &amp; Blow-Dry</div>
            <div className="text-[10px] text-[#627D98] mt-0.5">Client: Sarah M.</div>
          </div>

          <div className="rounded-lg border border-dashed border-[#E8E6DF] bg-[#FBFAF8] p-2 text-center text-[10px] text-[#829AB1]">
            10:00 AM — Available Slot
          </div>

          <div className="rounded-lg border border-[#334E68]/20 bg-[#F4F2EC] p-2 text-left">
            <div className="flex items-center justify-between font-semibold text-[#142B43]">
              <span>11:30 AM</span>
              <span className="text-[10px] text-[#334E68] font-medium">60 min</span>
            </div>
            <div className="font-medium text-[#142B43] mt-0.5">Restyle &amp; Treatment</div>
            <div className="text-[10px] text-[#627D98] mt-0.5">Client: Oliver K.</div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-2">
          <div className="rounded-lg border border-[#334E68]/20 bg-[#F4F2EC] p-2 text-left">
            <div className="flex items-center justify-between font-semibold text-[#142B43]">
              <span>9:30 AM</span>
              <span className="text-[10px] text-[#334E68] font-medium">30 min</span>
            </div>
            <div className="font-medium text-[#142B43] mt-0.5">Skin Fade &amp; Beard</div>
            <div className="text-[10px] text-[#627D98] mt-0.5">Client: James T.</div>
          </div>

          <div className="rounded-lg border border-[#0A8F87]/30 bg-[#E6F5F4]/70 p-2 text-left">
            <div className="flex items-center justify-between font-semibold text-[#142B43]">
              <span>10:15 AM</span>
              <span className="text-[10px] text-[#0A8F87] font-medium">45 min</span>
            </div>
            <div className="font-medium text-[#142B43] mt-0.5">Hot Towel Shave</div>
            <div className="text-[10px] text-[#627D98] mt-0.5">Client: David W.</div>
          </div>

          <div className="rounded-lg border border-dashed border-[#E8E6DF] bg-[#FBFAF8] p-2 text-center text-[10px] text-[#829AB1]">
            11:15 AM — Break
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-2">
          <div className="rounded-lg border border-[#0A8F87]/30 bg-[#E6F5F4]/70 p-2 text-left">
            <div className="flex items-center justify-between font-semibold text-[#142B43]">
              <span>9:00 AM</span>
              <span className="text-[10px] text-[#0A8F87] font-medium">90 min</span>
            </div>
            <div className="font-medium text-[#142B43] mt-0.5">Balayage &amp; Gloss</div>
            <div className="text-[10px] text-[#627D98] mt-0.5">Client: Claire R.</div>
          </div>

          <div className="rounded-lg border border-dashed border-[#E8E6DF] bg-[#FBFAF8] p-2 text-center text-[10px] text-[#829AB1]">
            10:45 AM — 15m Buffer
          </div>

          <div className="rounded-lg border border-[#334E68]/20 bg-[#F4F2EC] p-2 text-left">
            <div className="flex items-center justify-between font-semibold text-[#142B43]">
              <span>11:00 AM</span>
              <span className="text-[10px] text-[#334E68] font-medium">60 min</span>
            </div>
            <div className="font-medium text-[#142B43] mt-0.5">Root Touch-Up</div>
            <div className="text-[10px] text-[#627D98] mt-0.5">Client: Emily H.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffCalendarIllustration() {
  return (
    <div className="space-y-3 text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DF]">
        <div className="font-semibold text-[#142B43]">Staff Shifts &amp; Time Availability</div>
        <div className="text-[11px] text-[#627D98]">Weekly Overview (Mon - Sat)</div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-[#E8E6DF] p-2.5 bg-[#FBFAF8]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E6F5F4] text-[#0A8F87] font-bold text-xs">
              EV
            </div>
            <div>
              <div className="font-semibold text-[#142B43]">Elena Vance — Senior Stylist</div>
              <div className="text-[10px] text-[#627D98]">Tue – Sat: 09:00 – 17:30 (Break: 13:00)</div>
            </div>
          </div>
          <span className="rounded bg-[#E6F5F4] px-2 py-0.5 text-[10px] font-semibold text-[#0A8F87]">
            Active
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[#E8E6DF] p-2.5 bg-[#FBFAF8]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F2EC] text-[#142B43] font-bold text-xs">
              MT
            </div>
            <div>
              <div className="font-semibold text-[#142B43]">Marcus Thorne — Master Barber</div>
              <div className="text-[10px] text-[#627D98]">Mon – Fri: 10:00 – 18:30 (Break: 14:00)</div>
            </div>
          </div>
          <span className="rounded bg-[#E6F5F4] px-2 py-0.5 text-[10px] font-semibold text-[#0A8F87]">
            Active
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[#E8E6DF] p-2.5 bg-[#FBFAF8]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E6F5F4] text-[#0A8F87] font-bold text-xs">
              ML
            </div>
            <div>
              <div className="font-semibold text-[#142B43]">Maya Lin — Color Specialist</div>
              <div className="text-[10px] text-[#627D98]">Wed – Sun: 09:30 – 18:00 (Break: 13:30)</div>
            </div>
          </div>
          <span className="rounded bg-[#E6F5F4] px-2 py-0.5 text-[10px] font-semibold text-[#0A8F87]">
            Active
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
      <div className="flex items-center justify-between px-2 pb-2 border-b border-[#E8E6DF]">
        <div className="flex items-center gap-1.5 font-medium text-[#0A8F87]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0A8F87] text-white text-[10px]">✓</span>
          <span>1. Service</span>
        </div>
        <ChevronRight className="h-3 w-3 text-[#CBD2D9]" />
        <div className="flex items-center gap-1.5 font-medium text-[#0A8F87]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0A8F87] text-white text-[10px]">2</span>
          <span>Date &amp; Time</span>
        </div>
        <ChevronRight className="h-3 w-3 text-[#CBD2D9]" />
        <div className="flex items-center gap-1.5 text-[#829AB1]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E8E6DF] text-[#627D98] text-[10px]">3</span>
          <span>Confirm</span>
        </div>
      </div>

      {/* Date & Time Picker Preview */}
      <div className="rounded-lg border border-[#E8E6DF] p-3 bg-[#FBFAF8] space-y-2.5">
        <div className="flex items-center justify-between text-[#142B43]">
          <div className="flex items-center gap-1.5 font-semibold">
            <CalendarIcon className="h-3.5 w-3.5 text-[#0A8F87]" />
            <span>Thursday, 29 October 2026</span>
          </div>
          <span className="text-[11px] text-[#627D98]">Elena Vance</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
          <div className="rounded border border-[#0A8F87] bg-[#E6F5F4] py-1 font-semibold text-[#0A8F87]">
            09:30 AM
          </div>
          <div className="rounded border border-[#E8E6DF] bg-white py-1 text-[#334E68] hover:border-[#0A8F87]">
            11:15 AM
          </div>
          <div className="rounded border border-[#E8E6DF] bg-white py-1 text-[#334E68] hover:border-[#0A8F87]">
            02:00 PM
          </div>
          <div className="rounded border border-[#E8E6DF] bg-white py-1 text-[#334E68] hover:border-[#0A8F87]">
            03:45 PM
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-[#E6F5F4]/60 p-2 text-center text-[11px] text-[#0A8F87] font-medium border border-[#0A8F87]/20">
        Selected: Cut &amp; Finish • 45 minutes • No deposit required for demo
      </div>
    </div>
  );
}

function ServiceSelectionIllustration() {
  return (
    <div className="space-y-2.5 text-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-[#E8E6DF]">
        <span className="font-semibold text-[#142B43]">Configured Salon Services</span>
        <span className="text-[11px] text-[#627D98]">Duration &amp; Buffer Engine</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border border-[#0A8F87]/40 bg-[#E6F5F4]/40 p-2.5">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-[#0A8F87]" />
            <div>
              <div className="font-semibold text-[#142B43]">Signature Haircut &amp; Styling</div>
              <div className="text-[10px] text-[#627D98]">45 min duration + 10 min turnover buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-semibold text-[#142B43]">£45.00</span>
            <div className="text-[10px] text-[#0A8F87]">Elena, Maya</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[#E8E6DF] bg-white p-2.5">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-[#334E68]" />
            <div>
              <div className="font-semibold text-[#142B43]">Beard Trim &amp; Hot Towel Care</div>
              <div className="text-[10px] text-[#627D98]">30 min duration + 5 min cleanup buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-semibold text-[#142B43]">£28.00</span>
            <div className="text-[10px] text-[#334E68]">Marcus</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[#E8E6DF] bg-white p-2.5">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-[#334E68]" />
            <div>
              <div className="font-semibold text-[#142B43]">Full Highlights &amp; Gloss Toner</div>
              <div className="text-[10px] text-[#627D98]">120 min duration + 15 min buffer</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-semibold text-[#142B43]">£120.00</span>
            <div className="text-[10px] text-[#334E68]">Maya</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentReviewIllustration() {
  return (
    <div className="space-y-3 text-xs select-none">
      <div className="flex items-center gap-2 rounded-lg bg-[#E6F5F4] p-2.5 text-[#0A8F87] border border-[#0A8F87]/20">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-xs">Appointment Confirmed in Booking System</span>
      </div>

      <div className="rounded-lg border border-[#E8E6DF] bg-[#FBFAF8] p-3 space-y-2 text-[#142B43]">
        <div className="flex justify-between border-b border-[#E8E6DF] pb-1.5">
          <span className="text-[#627D98]">Service:</span>
          <span className="font-medium">Precision Haircut &amp; Restyle</span>
        </div>
        <div className="flex justify-between border-b border-[#E8E6DF] pb-1.5">
          <span className="text-[#627D98]">Staff Member:</span>
          <span className="font-medium">Elena Vance</span>
        </div>
        <div className="flex justify-between border-b border-[#E8E6DF] pb-1.5">
          <span className="text-[#627D98]">Scheduled Time:</span>
          <span className="font-medium">Thursday, 29 Oct at 09:30 AM</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#627D98]">Rescheduling Window:</span>
          <span className="text-[11px] text-[#0A8F87] font-medium">Up to 24h before appointment</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#627D98] pt-1">
        <span>Reservation ID: #BKZ-7821</span>
        <span>Confirmation sent via email</span>
      </div>
    </div>
  );
}
