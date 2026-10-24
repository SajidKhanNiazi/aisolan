import { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock, Calendar, AlertCircle } from "lucide-react";
import { getPublicSalonProfile } from "@/features/public-booking/server";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const instant = false;

interface BookingPageProps {
  params: Promise<{ businessSlug: string }>;
}

export async function generateMetadata({
  params,
}: BookingPageProps): Promise<Metadata> {
  const { businessSlug } = await params;
  const res = await getPublicSalonProfile(businessSlug);

  if (!res.success || !res.data) {
    return {
      title: "Salon Booking | Bookzello",
      description: "Book appointments online.",
    };
  }

  const salon = res.data;
  const locationStr = [salon.city, salon.country].filter(Boolean).join(", ");
  const description =
    salon.description ||
    `Book hair, beauty, and grooming appointments online with ${salon.name}${
      locationStr ? ` in ${locationStr}` : ""
    }.`;

  return {
    title: `${salon.name} — Book Online | Bookzello`,
    description,
    openGraph: {
      title: `${salon.name} — Book Online`,
      description,
      type: "website",
    },
    robots: {
      index: salon.onlineBookingEnabled,
      follow: salon.onlineBookingEnabled,
    },
  };
}

export default async function PublicBookingPage({ params }: BookingPageProps) {
  await connection();
  const { businessSlug } = await params;
  const res = await getPublicSalonProfile(businessSlug);

  if (!res.success || !res.data) {
    return notFound();
  }

  const salon = res.data;

  // Day names helper
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-16">
      {/* Top Banner / Salon Profile Card */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {salon.logoUrl ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0">
                  <Image
                    src={salon.logoUrl}
                    alt={salon.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
                  {salon.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold truncate text-zinc-900 dark:text-zinc-50">
                    {salon.name}
                  </h1>
                  <Badge variant="secondary" className="capitalize text-[10px] hidden sm:inline-flex">
                    {salon.businessType}
                  </Badge>
                </div>
                {(salon.city || salon.addressLine1) && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>
                      {[salon.addressLine1, salon.city, salon.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-zinc-400 font-medium block">
                Timezone
              </span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {salon.timezone}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        {/* Salon Disabled State */}
        {!salon.onlineBookingEnabled ? (
          <div className="space-y-6 pt-4">
            <Card className="p-8 text-center border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Online Booking Currently Unavailable
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto mt-2 leading-relaxed">
                Online booking is currently unavailable. Please contact the salon directly to schedule your appointment.
              </p>

              {(salon.phone || salon.email) && (
                <div className="mt-6 pt-6 border-t border-amber-200/60 dark:border-amber-900/40 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {salon.phone && (
                    <a
                      href={`tel:${salon.phone}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-blue-400 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>{salon.phone}</span>
                    </a>
                  )}
                  {salon.email && (
                    <a
                      href={`mailto:${salon.email}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-blue-400 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>{salon.email}</span>
                    </a>
                  )}
                </div>
              )}
            </Card>

            {/* Opening Hours Info */}
            {salon.openingHours.length > 0 && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span>Opening Hours</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {salon.openingHours.map((h) => (
                    <div
                      key={h.dayOfWeek}
                      className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-100 dark:border-zinc-800"
                    >
                      <span className="font-semibold block text-zinc-800 dark:text-zinc-200">
                        {dayNames[h.dayOfWeek]}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {h.isClosed ? "Closed" : `${h.openTime?.substring(0, 5)} - ${h.closeTime?.substring(0, 5)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          /* Active Online Booking Wizard */
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 shadow-sm border-zinc-200 dark:border-zinc-800">
              <BookingWizard salon={salon} />
            </Card>

            {/* Salon Info & Working Hours Accordion/Card */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs text-zinc-500 dark:text-zinc-400">
              {salon.openingHours.length > 0 && (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Regular Hours</span>
                  </div>
                  <div className="space-y-1">
                    {salon.openingHours.map((h) => (
                      <div key={h.dayOfWeek} className="flex justify-between">
                        <span>{dayNames[h.dayOfWeek]}</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {h.isClosed ? "Closed" : `${h.openTime?.substring(0, 5)} – ${h.closeTime?.substring(0, 5)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Booking Notice</span>
                </div>
                <p>
                  Minimum notice required: <strong className="text-zinc-700 dark:text-zinc-300">{salon.minNoticeHours} hours</strong>.
                </p>
                <p>
                  Advance booking window: up to <strong className="text-zinc-700 dark:text-zinc-300">{salon.maxAdvanceDays} days</strong> ahead.
                </p>
                {salon.cancellationPolicyText && (
                  <p className="pt-1 text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
                    {salon.cancellationPolicyText}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 mt-12 text-center text-xs text-zinc-400">
        <p>
          Powered by <strong className="text-zinc-600 dark:text-zinc-300">Bookzello</strong> appointment platform
        </p>
      </footer>
    </div>
  );
}
