import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Navbar, NavbarSkeleton } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthHashListener } from "@/components/layout/auth-hash-listener";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com"),
  title: {
    default: "Bookzello — Smart Salon Booking & AI Receptionist",
    template: "%s | Bookzello",
  },
  description: "Smart Salon Booking & AI Receptionist SaaS for independent salons and barbershops.",
  openGraph: {
    title: "Bookzello — Smart Salon Booking & AI Receptionist",
    description: "Smart Salon Booking & AI Receptionist SaaS for independent salons and barbershops.",
    url: "https://bookzello.com",
    siteName: "Bookzello",
    locale: "en_GB",
    type: "website",
  },
  alternates: {
    canonical: "https://bookzello.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <AuthHashListener />
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
