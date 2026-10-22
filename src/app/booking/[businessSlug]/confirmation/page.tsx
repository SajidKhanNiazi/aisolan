import { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ExternalLink,
  ArrowLeft,
  CalendarPlus,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { getAppointmentByToken } from "@/features/public-booking/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const instant = false;

export const metadata: Metadata = {
  title: "Appointment Confirmed | BookPilot AI",
  description: "Your salon appointment confirmation details.",
  robots: {
    index: false,
    follow: false,
  },
};

interface ConfirmationPageProps {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ ref?: string; token?: string }>;
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  await connection();
  const { businessSlug } = await params;
  const { ref, token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Secure Confirmation Context Missing
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            For security, appointment details can only be viewed immediately following booking or via your private management link.
          </p>
          <div className="pt-2">
            <Link href={`/booking/${businessSlug}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Salon</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const res = await getAppointmentByToken(token);

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Appointment Link Expired or Not Found
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {res.error || "This appointment confirmation link is invalid or no longer active."}
          </p>
          <div className="pt-2">
            <Link href={`/booking/${businessSlug}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Salon</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const appointment = res.data;
  const bookingReference = ref || appointment.bookingReference;

  // Format local date and time in salon timezone
  const startObj = new Date(appointment.startsAt);
  const localDateStr = startObj.toLocaleDateString("en-GB", {
    timeZone: appointment.business.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const localTimeStr = startObj.toLocaleTimeString("en-GB", {
    timeZone: appointment.business.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Build Google Calendar Add Link
  const gcalTitle = encodeURIComponent(`${appointment.serviceName} at ${appointment.business.name}`);
  const gcalDetails = encodeURIComponent(`Reference: ${bookingReference}\nSpecialist: ${appointment.staffName}`);
  const gcalLocation = encodeURIComponent(
    [appointment.business.addressLine1, appointment.business.city].filter(Boolean).join(", ")
  );
  const gcalDates = `${startObj.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(
    appointment.serviceEndsAt
  )
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, "")}`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${gcalDates}&details=${gcalDetails}&location=${gcalLocation}`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Success Header Card */}
        <Card className="text-center p-8 border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 mb-2">
              Booking Confirmed
            </Badge>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              You&apos;re All Booked!
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Your appointment at <strong>{appointment.business.name}</strong> is confirmed.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">
            <span>Ref: {bookingReference}</span>
          </div>
        </Card>

        {/* Appointment Details */}
        <Card className="p-6 space-y-4 divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="space-y-3 pt-1">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Appointment Summary
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Service</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {appointment.serviceName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 block font-medium">Price</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  £{appointment.priceAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-2">
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Specialist</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {appointment.staffName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 block font-medium">Status</span>
                <span className="inline-block mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                  {appointment.status}
                </span>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="pt-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-medium">When</span>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                {localDateStr}
              </p>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>
                  {localTimeStr} ({appointment.business.timezone})
                </span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Add to Google Calendar</span>
            </a>

            <Link href={`/manage-booking/${token}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Manage / Reschedule</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Self-service notice card */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-500 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Need to change your appointment?</span>
          </div>
          <p className="leading-relaxed">
            Bookmark this page or keep your confirmation link. You can reschedule or cancel online up to {appointment.policy.cancellationNoticeHours} hours before your appointment.
          </p>
        </div>

        {/* Back to Salon Link */}
        <div className="text-center pt-2">
          <Link
            href={`/booking/${businessSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Salon Page</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
