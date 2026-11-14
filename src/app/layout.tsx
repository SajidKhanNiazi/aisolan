import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, DM_Sans, DM_Serif_Display } from "next/font/google";
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

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com";
const sanitizedBaseUrl = rawBaseUrl.trim().replace(/[\r\n]+/g, "").replace(/\/+$/, "") || "https://bookzello.com";

export const metadata: Metadata = {
  metadataBase: new URL(sanitizedBaseUrl),
  title: {
    default: "Salon Booking Software for Hair & Beauty Businesses | Bookzello",
    template: "%s | Bookzello",
  },
  description: "Bookzello salon booking software helps clients book online while you manage staff availability, services and appointments in one place. Explore a demo.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
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
  verification: {
    other: {
      "p:domain_verify": "a57960450834da2536876ff5d176a749",
    },
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
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${dmSans.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#0F172A]">
        <AuthHashListener />
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
