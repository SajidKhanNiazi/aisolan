import { describe, it, expect } from "vitest";

describe("Bookzello Homepage Design & SEO Verification", () => {
  it("matches SEO metadata and premium layout hierarchy", async () => {
    const res = await fetch("http://localhost:3000");
    expect(res.status).toBe(200);
    const html = await res.text();

    // Title
    expect(html).toContain(
      "<title>Salon Booking Software for Hair &amp; Beauty Businesses | Bookzello</title>"
    );

    // Meta description
    expect(html).toContain(
      'name="description" content="Bookzello salon booking software helps clients book online while you manage staff availability, services and appointments in one place. Explore a demo."'
    );

    // Canonical
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/bookzello\.com\/?\s*"/);

    // Single H1 exactly matching brief
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    expect(h1Matches.length).toBe(1);
    expect(h1Matches[0]).toContain("Salon Booking Software");
    expect(h1Matches[0]).toContain("Powered by AI");

    // Eyebrow
    expect(html).toContain("AI-POWERED FOR SALON BUSINESSES");

    // Verified Section H2 headings matching reference image layout
    expect(html).toContain("Everything You Need to Run a Smoother, Busier Salon");
    expect(html).toContain("Three Easy Ways to Book Appointments");
    expect(html).toContain("A Unified Workspace for Modern Salon Teams");
    expect(html).toContain("Tailored for Hair Salons, Barbershops &amp; Beauty Studios");
    expect(html).toContain("Loved by Salons Like Yours");
    expect(html).toContain("Frequently Asked Questions");
    expect(html).toContain("Ready to Grow Your Salon with AI?");

    // Quick Benefits present
    expect(html).toContain("24/7 AI Receptionist");
    expect(html).toContain("Online Booking");
    expect(html).toContain("WhatsApp Booking");
    expect(html).toContain("Staff &amp; Calendar");

    // Key Features present
    expect(html).toContain("Real-time Availability");
    expect(html).toContain("Automated Confirmations");
    expect(html).toContain("Staff Scheduling");
    expect(html).toContain("Manage Bookings Easily");

    // Three Easy Ways
    expect(html).toContain("1. Website Chatbot");
    expect(html).toContain("2. WhatsApp Booking");
    expect(html).toContain("3. Hosted Booking Page");

    // Testimonial present
    expect(html).toContain("Sarah Mitchell");
    expect(html).toContain("Salon Owner, Glow Beauty Studio");
    expect(html).toContain("500+");
    expect(html).toContain("30%");

    // No legacy Phase 1A or BookPilot AI marketing text
    expect(html).not.toContain("Phase 1A: Architectural &amp; Technical Foundation");
    expect(html).not.toContain("no live appointments are active");
  });
});
