import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { metadata } from "@/app/(marketing)/barbershop-booking-software/page";
import sitemap from "@/app/sitemap";

describe("Bookzello Barbershop Booking Software Page QA & SEO", () => {
  it("verifies SEO metadata exports match the specification exactly", () => {
    // Exact Title
    expect(metadata.title).toEqual({
      absolute: "Barbershop Booking Software With AI Scheduling | Bookzello",
    });

    // Exact Meta Description
    expect(metadata.description).toBe(
      "Let clients book haircuts and beard trims online. Manage barber schedules, prevent double bookings, and organize appointments with Bookzello."
    );

    // Canonical URL (https://bookzello.com/barbershop-booking-software)
    expect(metadata.alternates).toEqual({
      canonical: "https://bookzello.com/barbershop-booking-software",
    });

    // OpenGraph
    expect(metadata.openGraph?.title).toBe(
      "Barbershop Booking Software With AI Scheduling | Bookzello"
    );
    expect(metadata.openGraph?.url).toBe(
      "https://bookzello.com/barbershop-booking-software"
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
      "../../src/app/(marketing)/barbershop-booking-software/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Eyebrow
    expect(content).toContain("Barbershop Booking Software &amp; AI Scheduling");

    // Single H1 Check
    const h1Count = (content.match(/<h1[^>]*>/g) || []).length;
    expect(h1Count).toBe(1);
    expect(content).toContain(
      "Barbershop Booking Software That Keeps Your Schedule Under Control"
    );

    // Exact H2 Headings
    const expectedH2s = [
      "What Is Barbershop Booking Software?",
      "Why Barbershops Need Online Booking Software",
      "Online Booking Software for Barbershops: How It Works",
      "Barbershop Scheduling Software for Multiple Barbers",
      "Manage Today&apos;s Barber Appointments in One Dashboard",
      "Use an AI Receptionist for Barber Appointment Booking",
      "What We Learned While Testing Bookzello",
      "How to Choose the Best Barbershop Booking Software",
      "Barbershop Booking Software Pricing: What Should You Compare?",
      "Barbershop Booking Software vs. a Paper Appointment Book",
      "Is Bookzello Suitable for Your Barbershop?",
      "How to Get Started With Bookzello",
      "Frequently Asked Questions About Barbershop Booking Software",
      "Conclusion: Choose a Booking System That Works During a Busy Day",
    ];

    for (const h2 of expectedH2s) {
      expect(content).toContain(h2);
    }

    // Exact H3 Subsections
    const expectedH3s = [
      "Reduce Interruptions During Haircuts",
      "Let Clients Book After Business Hours",
      "Keep Multiple Barber Schedules Organized",
      "Step 1: Choose a Haircut or Grooming Service",
      "Step 2: Select an Available Appointment",
      "Step 3: Confirm the Appointment",
      "Give Every Barber Their Own Schedule",
      "Can Two Customers Book the Same Time?",
      "What If a Customer Requests a Specific Barber?",
      "Account for Service Duration and Cleanup Time",
      "See Appointment Details at a Glance",
      "Access Your Schedule on Mobile",
      "Answer Common Booking Questions",
      "Connect AI Booking to the Same Calendar",
      "1. Check the Customer Booking Experience",
      "2. Test Staff Availability",
      "3. Evaluate the Daily Dashboard",
      "4. Review Cancellation and Rescheduling Options",
      "5. Understand the Full Monthly Cost",
      "6. Check What Is Included",
      "Independent Barbers",
      "Small Barbershops With Multiple Employees",
      "Men&apos;s Grooming Studios",
    ];

    for (const h3 of expectedH3s) {
      expect(content).toContain(h3);
    }
  });

  it("verifies tables, comparison matrices, and genuine internal links", () => {
    const filePath = path.resolve(
      __dirname,
      "../../src/app/(marketing)/barbershop-booking-software/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Staff schedule table
    expect(content).toContain("Daniel");
    expect(content).toContain("Emma");
    expect(content).toContain("Sarah");
    expect(content).toContain("9 AM–5 PM");
    expect(content).toContain("Haircuts, beard trims");

    // Cleanup buffer table
    expect(content).toContain("10:00 AM");
    expect(content).toContain("10:30 AM");
    expect(content).toContain("10:35 AM");
    expect(content).toContain("10:35 AM or later");

    // Pricing factors checklist table
    expect(content).toContain("Base subscription");
    expect(content).toContain("Barber accounts");
    expect(content).toContain("Payment processing");
    expect(content).toContain("Cancellation terms");

    // Paper diary vs online booking comparison table
    expect(content).toContain("Paper Diary");
    expect(content).toContain("Online Booking System");
    expect(content).toContain("Customer self-booking");

    // Real product links
    expect(content).toContain('href="/booking/bookpilot-qa-salon"');
    expect(content).toContain('href="/pricing"');

    // JSON-LD schema
    expect(content).toContain('"@type": "FAQPage"');
    expect(content).toContain('"@type": "SoftwareApplication"');
    expect(content).toContain('"@type": "BreadcrumbList"');
  });

  it("verifies XML sitemap includes /barbershop-booking-software", () => {
    const sitemapItems = sitemap();
    const entry = sitemapItems.find((item) =>
      item.url.endsWith("/barbershop-booking-software")
    );

    expect(entry).toBeDefined();
    expect(entry?.priority).toBe(0.9);
    expect(entry?.changeFrequency).toBe("weekly");
  });
});
