import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { metadata } from "@/app/(marketing)/spa-booking-software/page";
import sitemap from "@/app/sitemap";

describe("Bookzello Spa Booking Software Page QA & SEO", () => {
  it("verifies SEO metadata exports match the specification exactly", () => {
    // Exact Title
    expect(metadata.title).toEqual({
      absolute: "Online Spa Booking Software for Easy Scheduling | Bookzello",
    });

    // Exact Meta Description
    expect(metadata.description).toBe(
      "Let clients book spa treatments online. Manage therapist schedules, appointment availability, and daily bookings with Bookzello spa booking software."
    );

    // Canonical URL (https://bookzello.com/spa-booking-software)
    expect(metadata.alternates).toEqual({
      canonical: "https://bookzello.com/spa-booking-software",
    });

    // OpenGraph
    expect(metadata.openGraph?.title).toBe(
      "Online Spa Booking Software for Easy Scheduling | Bookzello"
    );
    expect(metadata.openGraph?.description).toBe(
      "Let clients book spa treatments online. Manage therapist schedules, appointment availability, and daily bookings with Bookzello spa booking software."
    );
    expect(metadata.openGraph?.url).toBe(
      "https://bookzello.com/spa-booking-software"
    );

    // Robots
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
    });
  });

  it("verifies heading hierarchy and exact copy elements from the source file", () => {
    const filePath = path.resolve(
      __dirname,
      "../../src/app/(marketing)/spa-booking-software/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Eyebrow
    expect(content).toContain("SPA BOOKING &amp; APPOINTMENT SCHEDULING");

    // Single H1 Check
    const h1Count = (content.match(/<h1[^>]*>/g) || []).length;
    expect(h1Count).toBe(1);
    expect(content).toContain(
      "Spa Booking Software That Keeps Every Appointment Organized"
    );

    // Exact H2 Headings
    const expectedH2s = [
      "What Is Spa Booking Software?",
      "Online Spa Booking Software: Let Clients Book Treatments Anytime",
      "Spa Appointment Scheduling Software for Therapists and Staff",
      "Manage Every Spa Appointment From One Daily Dashboard",
      "How an AI Receptionist Can Help With Spa Appointments",
      "Spa Booking Software vs. Spa Management Software",
      "How to Reduce Booking Confusion, Cancellations, and No-Shows",
      "How to Choose the Best Spa Booking Software",
      "A 10-Minute Test Before Choosing Spa Booking Software",
      "How Much Does Spa Booking Software Cost?",
      "Is Bookzello Right for Your Spa?",
      "How to Set Up Spa Online Booking With Bookzello",
      "Frequently Asked Questions About Spa Booking Software",
      "Conclusion: Choose Spa Booking Software That Works for Your Business",
    ];

    for (const h2 of expectedH2s) {
      expect(content).toContain(h2);
    }

    // Exact H3 Subsections
    const expectedH3s = [
      "Let Clients Choose the Right Spa Treatment",
      "Show Appointment Times Based on Real Availability",
      "Make Appointment Confirmation Simple",
      "Give Each Therapist an Individual Schedule",
      "Prevent Overlapping Appointments",
      "Include Treatment Preparation and Cleanup Time",
      "See Today&apos;s Appointments at a Glance",
      "Keep Customer and Treatment Details Together",
      "Review Appointments From Your Phone",
      "Answer Common Treatment and Booking Questions",
      "Connect AI Booking to the Same Appointment Calendar",
      "Therapist Availability Is Not the Same as Room Availability",
      "Give Customers Clear Appointment Information",
      "Set Realistic Cancellation Policies",
      "Compare Reminder and Deposit Features Separately",
      "Check the Customer Booking Experience",
      "Verify Staff and Service Availability",
      "Understand What Is and Isn&apos;t Included",
      "Independent Estheticians",
      "Small Day Spas",
      "Boutique Wellness Studios",
      "Step 1: Add Your Spa Treatments",
      "Step 2: Configure Therapist Schedules",
      "Step 3: Set Booking Rules",
      "Step 4: Share Your Booking Page",
      "Step 5: Test the Booking Experience",
    ];

    for (const h3 of expectedH3s) {
      expect(content).toContain(h3);
    }
  });

  it("verifies tables, comparison matrices, and genuine internal links", () => {
    const filePath = path.resolve(
      __dirname,
      "../../src/app/(marketing)/spa-booking-software/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Treatment table
    expect(content).toContain("Classic Facial");
    expect(content).toContain("Hydrating Facial");
    expect(content).toContain("Swedish Massage");
    expect(content).toContain("Deep Tissue Massage");
    expect(content).toContain("Scalp Treatment");

    // Staff schedule table
    expect(content).toContain("Emma");
    expect(content).toContain("Sarah");
    expect(content).toContain("Daniel");
    expect(content).toContain("Facials, skincare");
    expect(content).toContain("Facials, body treatments");
    expect(content).toContain("Swedish and deep tissue massage");

    // Buffer table
    expect(content).toContain("Massage begins");
    expect(content).toContain("Massage ends");
    expect(content).toContain("Cleanup and preparation");
    expect(content).toContain("Next eligible appointment");
    expect(content).toContain("11:15 AM");

    // Comparison table
    expect(content).toContain("Spa Booking Software vs. Spa Management Software");
    expect(content).toContain("Digital intake forms");
    expect(content).toContain("Resource scheduling");

    // 10-Minute test table
    expect(content).toContain("Book a facial with Therapist A at 10 AM");
    expect(content).toContain("Conflict is blocked");

    // Pricing factors checklist table
    expect(content).toContain("Monthly subscription");
    expect(content).toContain("Therapist accounts");
    expect(content).toContain("Cancellation terms");

    // Real product links
    expect(content).toContain('href="/booking/bookpilot-qa-salon"');
    expect(content).toContain('href="/pricing"');
    expect(content).toContain('href="/salon-management-software"');

    // JSON-LD schema
    expect(content).toContain('"@type": "FAQPage"');
    expect(content).toContain('"@type": "SoftwareApplication"');
    expect(content).toContain('"@type": "BreadcrumbList"');
  });

  it("verifies XML sitemap includes /spa-booking-software", () => {
    const sitemapItems = sitemap();
    const entry = sitemapItems.find((item) =>
      item.url.endsWith("/spa-booking-software")
    );

    expect(entry).toBeDefined();
    expect(entry?.priority).toBe(0.9);
    expect(entry?.changeFrequency).toBe("weekly");
  });
});
