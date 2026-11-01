import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { metadata as privacyMetadata } from "@/app/privacy/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import { metadata as dataDeletionMetadata } from "@/app/data-deletion/page";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("Bookzello Legal Pages & Meta Compliance Verification Suite", () => {
  describe("1. Metadata & Canonical URLs", () => {
    it("exports correct metadata for Privacy Policy (/privacy)", () => {
      expect(privacyMetadata.title).toBe("Privacy Policy | Bookzello");
      expect(privacyMetadata.alternates?.canonical).toBe("https://bookzello.com/privacy");
      expect(privacyMetadata.robots).toEqual({ index: true, follow: true });
      expect(privacyMetadata.description).toContain("Bookzello collects, processes, and protects");
    });

    it("exports correct metadata for Terms and Conditions (/terms)", () => {
      expect(termsMetadata.title).toBe("Terms and Conditions | Bookzello");
      expect(termsMetadata.alternates?.canonical).toBe("https://bookzello.com/terms");
      expect(termsMetadata.robots).toEqual({ index: true, follow: true });
      expect(termsMetadata.description).toContain("terms, conditions, and operational policies");
    });

    it("exports correct metadata for Data Deletion Instructions (/data-deletion)", () => {
      expect(dataDeletionMetadata.title).toBe("Data Deletion Instructions | Bookzello");
      expect(dataDeletionMetadata.alternates?.canonical).toBe("https://bookzello.com/data-deletion");
      expect(dataDeletionMetadata.robots).toEqual({ index: true, follow: true });
      expect(dataDeletionMetadata.description).toContain("Step-by-step instructions for salon owners, clients, and WhatsApp users");
    });
  });

  describe("2. Sitemap & Robots Configuration", () => {
    it("sitemap includes all three legal URLs", () => {
      const entries = sitemap();
      const urls = entries.map((e) => e.url);
      expect(urls).toContain("https://bookzello.com/privacy");
      expect(urls).toContain("https://bookzello.com/terms");
      expect(urls).toContain("https://bookzello.com/data-deletion");
    });

    it("robots.txt explicitly permits crawling of legal and marketing pages", () => {
      const robotsConfig = robots();
      const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
      const allowed = Array.isArray(rules?.allow) ? rules.allow : [rules?.allow];
      expect(allowed).toContain("/privacy");
      expect(allowed).toContain("/terms");
      expect(allowed).toContain("/data-deletion");
      expect(allowed).toContain("/salon-management-software");
    });
  });

  describe("3. Footer Integration", () => {
    it("footer component contains working links to all legal pages", () => {
      const footerPath = path.resolve(__dirname, "../../src/components/layout/footer.tsx");
      const content = fs.readFileSync(footerPath, "utf-8");

      expect(content).toContain('href="/privacy"');
      expect(content).toContain('href="/terms"');
      expect(content).toContain('href="/data-deletion"');
      expect(content).toContain("Legal &amp; Trust");
    });
  });

  describe("4. Privacy Policy Content & Subprocessor Accuracy", () => {
    it("covers all required subprocessors and architectural constraints", () => {
      const privacyPath = path.resolve(__dirname, "../../src/app/privacy/page.tsx");
      const content = fs.readFileSync(privacyPath, "utf-8");

      expect(content).toContain("Supabase Inc.");
      expect(content).toContain("Vercel Inc.");
      expect(content).toContain("OpenAI, LLC");
      expect(content).toContain("Meta Platforms, Inc.");
      expect(content).toContain("Resend, Inc.");
      expect(content).toContain("Upstash, Inc.");

      // Check date and safety statements
      expect(content).toContain("October 31, 2026");
      expect(content).toContain("Row Level Security");
      expect(content).toContain("privacy@bookzello.com");
      expect(content).toContain("support@bookzello.com");
    });
  });

  describe("5. Terms & Conditions Accuracy", () => {
    it("contains robust SaaS protections and realistic disclaimers", () => {
      const termsPath = path.resolve(__dirname, "../../src/app/terms/page.tsx");
      const content = fs.readFileSync(termsPath, "utf-8");

      expect(content).toContain("Deterministic Booking Engine");
      expect(content).toContain("Customer Booking, Rescheduling &amp; Cancellation");
      expect(content).toContain("AI Receptionist Capabilities &amp; Limitations");
      expect(content).toContain("WhatsApp Business Platform Messaging Terms");
      expect(content).toContain("Disclaimer of Warranties");
      expect(content).toContain("Limitation of Liability");
      expect(content).toContain("support@bookzello.com");
    });
  });

  describe("6. Data Deletion Instructions Compliance", () => {
    it("provides explicit instructions, timelines, and security warnings", () => {
      const deletionPath = path.resolve(__dirname, "../../src/app/data-deletion/page.tsx");
      const content = fs.readFileSync(deletionPath, "utf-8");

      // Meta App ID reference
      expect(content).toContain("1761678114892387");

      // User categories
      expect(content).toContain("Salon Clients &amp; Customers");
      expect(content).toContain("WhatsApp Users");
      expect(content).toContain("Salon Owners &amp; Businesses");

      // Timelines
      expect(content).toContain("48 business hours");
      expect(content).toContain("30 calendar days");

      // Critical security warning
      expect(content).toContain("Never Send Sensitive Security Credentials");
      expect(content).toContain("privacy@bookzello.com");
    });
  });
});
