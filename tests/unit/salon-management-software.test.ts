import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { metadata } from "@/app/(marketing)/salon-management-software/page";

describe("Bookzello Salon Management Software Page QA & SEO", () => {
  it("verifies SEO metadata exports match the specification", () => {
    // Title
    expect(metadata.title).toEqual({
      absolute: "Hair Salon Management Software for Small Teams | Bookzello",
    });

    // Exact Meta Description restored
    expect(metadata.description).toBe(
      "Manage salon bookings, staff availability, services and customer appointments with Bookzello hair salon management software. Request a guided demo."
    );

    // Canonical (no trailing slash, matching Next.js default)
    expect(metadata.alternates).toEqual({
      canonical: "https://bookzello.com/salon-management-software",
    });

    // OpenGraph
    expect(metadata.openGraph?.title).toBe("Hair Salon Management Software | Bookzello");
    expect(metadata.openGraph?.url).toBe("https://bookzello.com/salon-management-software");

    // Robots
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
    });
  });

  it("verifies heading hierarchy and exact copy elements from the source file", () => {
    const filePath = path.resolve(
      __dirname,
      "../../src/app/(marketing)/salon-management-software/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Eyebrow
    expect(content).toContain("HAIR SALON MANAGEMENT SOFTWARE FOR SMALL TEAMS");

    // Single H1 Check
    const h1Count = (content.match(/<h1[^>]*>/g) || []).length;
    expect(h1Count).toBe(1);
    expect(content).toContain(
      "Hair Salon Management Software That Makes Your Day Easier"
    );

    // Exact H2 Headings
    const expectedH2s = [
      "What Is Hair Salon Management Software?",
      "Manage Hair Salon Appointments in One Place",
      "Salon Appointment Scheduling Software for Your Team",
      "Organize Salon Services, Prices, and Appointment Durations",
      "Make Online Booking Simpler for Your Salon Clients",
      "Salon Management Software for Small Businesses",
      "See How Bookzello Works in a Salon Workflow",
      "How to Choose Salon Management Software",
      "What About AI-Powered Salon Booking?",
      "Frequently Asked Questions About Hair Salon Management Software",
      "Make Managing Your Salon Appointments Simpler",
    ];

    for (const h2 of expectedH2s) {
      expect(content).toContain(h2);
    }

    // Exact H3 Headings
    const expectedH3s = [
      "Salon Management Software vs. Salon Booking Software",
      "See Upcoming Appointments",
      "Keep Track of Cancellations and Schedule Changes",
      "Set Staff Availability and Working Hours",
      "Help Prevent Overlapping Bookings",
      "Give Each Service the Right Amount of Time",
      "Show Customers Their Booking Details",
      "How Online Salon Booking Works",
      "Let Clients Choose Their Preferred Stylist",
      "Keep Customer Appointment Details Organized",
      "For Independent Salon Owners",
      "For Small Hair Salon Teams",
      "For Growing Salons",
      "1. Appointment Dashboard",
      "2. Staff Schedule",
      "3. Services and Pricing",
      "4. Customer Booking Page",
      "What Features Does a Small Salon Actually Need?",
      "Questions to Ask Before Choosing Software",
    ];

    for (const h3 of expectedH3s) {
      expect(content).toContain(h3);
    }

    // Internal link to homepage using anchor "salon booking software"
    expect(content).toContain('href="/"');
    expect(content).toContain("salon booking software");

    // Duration table elements
    expect(content).toContain("Beard trim");
    expect(content).toContain("20 minutes");
    expect(content).toContain("Classic haircut");
    expect(content).toContain("35 minutes");
    expect(content).toContain("Hair styling");
    expect(content).toContain("45 minutes");
    expect(content).toContain("Hair color consultation");
    expect(content).toContain("30 minutes");

    // Practical example
    expect(content).toContain("A classic haircut takes 35 minutes and includes a five-minute buffer afterward");
    expect(content).toContain("occupied window runs until 2:40 PM");

    // Screenshot captions
    expect(content).toContain("A clearer view of your salon appointments, services, and staff schedules.");
    expect(content).toContain("See your salon's upcoming appointments with service, customer, and staff details.");
    expect(content).toContain("Check available appointment times against staff schedules and service durations.");
    expect(content).toContain("Organize services with clear durations and prices before customers book.");
    expect(content).toContain("A simple booking flow for customers, connected to the salon's appointment schedule.");
    expect(content).toContain("Keep your daily appointments visible in one organized place.");
    expect(content).toContain("Match appointment times to the stylist who will perform the service.");
    expect(content).toContain("Make service names, durations, and pricing easier to manage.");
    expect(content).toContain("Give customers a clear way to book from their phones.");

    // Critical CTA Check: Must NOT link to QA salon route
    expect(content).not.toContain("/booking/bookpilot-qa-salon");
    expect(content).toContain("SalonHeroCta");
    expect(content).toContain("SalonInlineCta");
    expect(content).toContain("SalonBannerCta");

    // No empty links
    expect(content).not.toContain('href="#"');
    expect(content).not.toContain("href=\"\"");

    // Safe, honest claims: No unverified claims about WhatsApp booking or fully launched AI
    expect(content).toContain("conversational booking workflow has been tested in a controlled environment");
    expect(content).toContain("Wider availability is still being prepared");

    // Strict content fidelity: No invented bullets or subtitles
    expect(content).not.toContain("No credit card required");
    expect(content).not.toContain("Clear answers to help you choose");
  });

  it("verifies all 8 FAQ items are present with exact questions and answers", () => {
    const filePath = path.resolve(
      __dirname,
      "../../src/app/(marketing)/salon-management-software/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    const expectedFaqs = [
      "What is hair salon management software?",
      "What is the difference between salon booking software and salon management software?",
      "Can small hair salons use management software?",
      "Can customers book hair appointments online with Bookzello?",
      "How does salon scheduling software handle staff availability?",
      "Can I manage salon appointments from my phone?",
      "Does Bookzello support AI-assisted booking?",
      "How much does salon management software cost?",
    ];

    for (const faq of expectedFaqs) {
      expect(content).toContain(faq);
    }
  });
});
