import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { metadata } from "@/app/(marketing)/page";

describe("Bookzello Homepage Design & SEO Verification", () => {
  it("matches SEO metadata exports", () => {
    // Title
    expect(metadata.title).toEqual({
      absolute: "Salon Booking Software for Hair & Beauty Businesses | Bookzello",
    });

    // Meta description
    expect(metadata.description).toBe(
      "Bookzello salon booking software helps clients book online while you manage staff availability, services and appointments in one place. Explore a demo."
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
    expect(h1Matches[0]).toContain("Salon Booking Software");
    expect(h1Matches[0]).toContain("Powered by AI");

    // Eyebrow
    expect(content).toContain("AI-POWERED FOR SALON BUSINESSES");

    // Verified Section H2 headings matching reference image layout
    expect(content).toContain("Everything You Need to Run a Smoother, Busier Salon");
    expect(content).toContain("Three Easy Ways to Book Appointments");
    expect(content).toContain("A Unified Workspace for Modern Salon Teams");
    expect(content).toContain("Tailored for Hair Salons, Barbershops &amp; Beauty Studios");
    expect(content).toContain("Loved by Salons Like Yours");
    expect(content).toContain("Frequently Asked Questions");
    expect(content).toContain("Ready to Grow Your Salon with AI?");

    // Quick Benefits present
    expect(content).toContain("24/7 AI Receptionist");
    expect(content).toContain("Online Booking");
    expect(content).toContain("WhatsApp Booking");
    expect(content).toContain("Staff &amp; Calendar");

    // Key Features present
    expect(content).toContain("Real-time Availability");
    expect(content).toContain("Automated Confirmations");
    expect(content).toContain("Staff Scheduling");
    expect(content).toContain("Manage Bookings Easily");

    // Three Easy Ways
    expect(content).toContain("1. Website Chatbot");
    expect(content).toContain("2. WhatsApp Booking");
    expect(content).toContain("3. Hosted Booking Page");

    // Testimonial present
    expect(content).toContain("Sarah Mitchell");
    expect(content).toContain("Salon Owner, Glow Beauty Studio");
    expect(content).toContain("500+");
    expect(content).toContain("30%");

    // No legacy Phase 1A or BookPilot AI marketing text
    expect(content).not.toContain("Phase 1A: Architectural &amp; Technical Foundation");
    expect(content).not.toContain("Phase 1A: Architectural & Technical Foundation");
    expect(content).not.toContain("no live appointments are active");
  });
});

