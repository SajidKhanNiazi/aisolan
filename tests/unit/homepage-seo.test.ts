import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { metadata } from "@/app/(marketing)/page";

describe("Bookzello Homepage Design & SEO Verification", () => {
  it("matches SEO metadata exports", () => {
    // Title
    expect(metadata.title).toEqual({
      absolute: "Salon Booking Software That Keeps Every Appointment Organized | Bookzello",
    });

    // Meta description
    expect(metadata.description).toBe(
      "Bookzello brings online salon booking, staff availability, and appointment management into one system. Manage your team's daily calendar without juggling separate lists."
    );

    // Canonical
    expect(metadata.alternates).toEqual({
      canonical: "https://bookzello.com/",
    });

    // Robots
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
    });
  });

  it("matches SEO content, headings, and premium layout hierarchy from source", () => {
    const filePath = path.resolve(
      __dirname,
      "../../src/app/(marketing)/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Single H1 exactly matching brief
    const h1Matches = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    expect(h1Matches.length).toBe(1);
    expect(h1Matches[0]).toContain("Salon Booking Software That Keeps Every Appointment Organized");

    // Eyebrow
    expect(content).toContain("ONLINE BOOKING FOR SALONS &amp; BARBERSHOPS");

    // Approved Section H2 headings
    expect(content).toContain("Everything You Need to Run a Smoother, Busier Salon");
    expect(content).toContain("How Online Salon Booking Works With Bookzello");
    expect(content).toContain("Manage Staff Schedules Without Double Booking");
    expect(content).toContain("A Unified Workspace for Modern Salon Teams");
    expect(content).toContain("See Your Salon&apos;s Daily Appointments at a Glance");
    expect(content).toContain("Tailored for Hair Salons, Barbershops &amp; Beauty Studios");
    expect(content).toContain("Built Around Real Salon Booking Challenges");
    expect(content).toContain("What to Look for in Salon Booking Software");
    expect(content).toContain("Frequently Asked Questions");
    expect(content).toContain("Make Your Next Salon Booking Simpler");

    // Quick Benefits present
    expect(content).toContain("24/7 AI Receptionist");
    expect(content).toContain("Online Booking");
    expect(content).toContain("Real-time Availability");
    expect(content).toContain("Staff &amp; Calendar");

    // How Online Salon Booking Works Steps
    expect(content).toContain("1. Choose a Service");
    expect(content).toContain("2. Find an Available Time");
    expect(content).toContain("3. Confirm the Appointment");
    expect(content).toContain("4. Manage the Day From Your Dashboard");

    // Staff Scheduling points
    expect(content).toContain("Set Working Hours for Each Team Member");
    expect(content).toContain("Account for Different Service Durations");
    expect(content).toContain("Keep Confirmed Appointments in One Place");

    // Daily Appointments points
    expect(content).toContain("Know Who Is Coming In");
    expect(content).toContain("Manage a Growing Team");
    expect(content).toContain("Check Appointments From Your Phone");

    // Buyer's Guide Checkpoints
    expect(content).toContain("Is Online Booking Easy for Your Clients?");
    expect(content).toContain("Does It Handle Staff Availability Correctly?");
    expect(content).toContain("Can You Manage a Busy Day Quickly?");
    expect(content).toContain("Can Customers Change Their Appointments?");
    expect(content).toContain("Is the Pricing Clear?");
    expect(content).toContain("Can You Test the Real Booking Experience?");

    // Unverified claims and legacy placeholders removed
    expect(content).not.toContain("Sarah Mitchell");
    expect(content).not.toContain("Glow Beauty Studio");
    expect(content).not.toContain("500+ Salons");
    expect(content).not.toContain("30% More Bookings");
    expect(content).not.toContain("Phase 1A: Architectural &amp; Technical Foundation");
    expect(content).not.toContain("no live appointments are active");
  });
});
