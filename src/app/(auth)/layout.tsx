import Link from "next/link";
import { Calendar } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Calendar className="h-5 w-5" />
            </div>
            <span>BookPilot AI</span>
          </Link>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Intelligent Appointment Management & AI Receptionist
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
