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
    default: "Salon Booking Software for Hair & Beauty Businesses | Bookzello",
    template: "%s | Bookzello",
  },
  description: "Bookzello salon booking software helps clients book online while you manage staff availability, services and appointments in one place. Explore a demo.",
  openGraph: {
    title: "Salon Booking Software | Bookzello",
    description: "Simple online booking, a clear calendar and staff scheduling for hair and beauty businesses.",
    url: "https://bookzello.com/",
    siteName: "Bookzello",
    locale: "en_GB",
    type: "website",
  },
  alternates: {
    canonical: "https://bookzello.com/",
  },
  robots: {
    index: true,
    follow: true,
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
      <body className="min-h-full flex flex-col bg-white text-[#0F172A]">
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
