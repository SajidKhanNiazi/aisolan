import { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { getAppointmentByToken } from "@/features/public-booking/server";
import { ManageAppointmentClient } from "@/components/booking/manage-appointment-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const instant = false;

export const metadata: Metadata = {
  title: "Manage Your Appointment | Bookzello",
  description: "Secure self-service appointment rescheduling and cancellation.",
  robots: {
    index: false,
    follow: false,
  },
};

interface ManageBookingPageProps {
  params: Promise<{ token: string }>;
}

export default async function ManageBookingPage({
  params,
}: ManageBookingPageProps) {
  await connection();
  const { token } = await params;
  const res = await getAppointmentByToken(token);

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Booking Link Not Found or Expired
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {res.error ||
              "This appointment management link is invalid, has expired, or has already been used."}
          </p>
          <div className="pt-2">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Home</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <ManageAppointmentClient
          initialAppointment={res.data}
          token={token}
        />
      </div>
    </div>
  );
}
