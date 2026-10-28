import { describe, it, expect } from "vitest";

describe("Homepage SEO & Heading Hierarchy Specification", () => {
  it("matches exact SEO metadata from Section 4", async () => {
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
    expect(h1Matches[0]).toContain("Salon Booking Software That Makes Every Appointment Easier");

    // Eyebrow
    expect(html).toContain("ONLINE BOOKING FOR SALONS &amp; BARBERSHOPS");

    // Verified H2 headings from Section 5
    expect(html).toContain("Tired of Managing Appointments Across Calls, Messages and Notes?");
    expect(html).toContain("Online Salon Booking Software for Clients and Staff");
    expect(html).toContain("Salon Appointment Scheduling Software That Fits Your Team");
    expect(html).toContain("One Salon Booking Dashboard, Less Guesswork");
    expect(html).toContain("Built for Hair Salons, Barbershops and Beauty Teams");
    expect(html).toContain("An AI-Ready Salon Booking System, Built Around Real Availability");
    expect(html).toContain("What to Look for in Salon Booking Software");
    expect(html).toContain("See Bookzello in Action");
    expect(html).toContain("Frequently Asked Questions About Salon Booking Software");
    expect(html).toContain("Make Your Next Booking Simpler");

    // Verified H3 headings from Section 5
    expect(html).toContain("Give Clients a Clear Way to Book");
    expect(html).toContain("Keep Your Calendar Up to Date");
    expect(html).toContain("Let Availability Do the Checking");
    expect(html).toContain("Step 1: Choose a Service");
    expect(html).toContain("Step 2: Pick a Staff Member and Time");
    expect(html).toContain("Step 3: Complete the Booking");
    expect(html).toContain("Step 4: Manage the Appointment");
    expect(html).toContain("Organize Staff Availability");
    expect(html).toContain("Plan for Service Duration");
    expect(html).toContain("Reduce Scheduling Conflicts");
    expect(html).toContain("See Today&#x27;s Appointments");
    expect(html).toContain("Keep Customer Details Connected");
    expect(html).toContain("Handle Changes in One Place");
    expect(html).toContain("Hair Salons");
    expect(html).toContain("Barbershops");
    expect(html).toContain("Nail and Beauty Studios");
    expect(html).toContain("A Conversational Way to Ask About Bookings");
    expect(html).toContain("The Booking Engine Remains in Control");
    expect(html).toContain("Introduced Carefully, Not Overpromised");
    expect(html).toContain("Can Clients Find an Available Time Easily?");
    expect(html).toContain("Does It Support Your Staff and Services?");
    expect(html).toContain("Can Your Team Manage Confirmed Bookings?");
    expect(html).toContain("Can You Try the Booking Experience?");

    // FAQ questions present
    expect(html).toContain("What is salon booking software?");
    expect(html).toContain("How does online salon booking work with Bookzello?");
    expect(html).toContain("Can a salon manage more than one staff member?");
    expect(html).toContain("Does Bookzello help prevent double bookings?");
    expect(html).toContain("Is Bookzello only for hair salons?");
    expect(html).toContain("Does Bookzello offer an AI receptionist?");
    expect(html).toContain("Can I see how the system works before deciding?");

    // Captions
    expect(html).toContain(
      "Your salon schedule, at a glance. See staff availability, upcoming bookings and appointment details in one place."
    );
    expect(html).toContain(
      "Bookzello appointment dashboard showing real service, staff and calendar information from a safe demo account."
    );

    // No legacy Phase 1A or BookPilot AI marketing text
    expect(html).not.toContain("Phase 1A: Architectural &amp; Technical Foundation");
    expect(html).not.toContain("no live appointments are active");
  });
});
