import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
  DM_Sans: () => ({ variable: "--font-dm-sans" }),
  DM_Serif_Display: () => ({ variable: "--font-dm-serif" }),
  Plus_Jakarta_Sans: () => ({ variable: "--font-plus-jakarta" }),
}));

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import manifest from "@/app/manifest";
import { metadata } from "@/app/layout";

describe("Bookzello Sitemap, Robots & Favicon Verification", () => {
  it("generates a clean sitemap without newlines or trailing slashes", () => {
    const sitemapEntries = sitemap();
    expect(sitemapEntries.length).toBeGreaterThanOrEqual(10);

    const urls = sitemapEntries.map((e) => e.url);

    // Verify key pages are included
    expect(urls).toContain("https://bookzello.com");
    expect(urls).toContain("https://bookzello.com/salon-management-software");
    expect(urls).toContain("https://bookzello.com/barbershop-booking-software");
    expect(urls).toContain("https://bookzello.com/spa-booking-software");
    expect(urls).toContain("https://bookzello.com/pricing");
    expect(urls).toContain("https://bookzello.com/booking");
    expect(urls).toContain("https://bookzello.com/login");
    expect(urls).toContain("https://bookzello.com/signup");
    expect(urls).toContain("https://bookzello.com/privacy");
    expect(urls).toContain("https://bookzello.com/terms");

    // Critical: No URL should have carriage returns or newlines
    for (const url of urls) {
      expect(url).not.toMatch(/[\r\n]/);
      expect(url.startsWith("http")).toBe(true);
    }
  });

  it("generates clean robots.txt rules including the sitemap pointer", () => {
    const robotRules = robots();
    expect(robotRules.sitemap).toMatch(/^https?:\/\/[^\r\n]+\/sitemap\.xml$/);
    
    // Must allow marketing pages
    const rules = Array.isArray(robotRules.rules) ? robotRules.rules[0] : robotRules.rules;
    const allowed = Array.isArray(rules.allow) ? rules.allow : [rules.allow];
    expect(allowed).toContain("/salon-management-software");
    expect(allowed).toContain("/barbershop-booking-software");
    expect(allowed).toContain("/spa-booking-software");
    expect(allowed).toContain("/pricing");
  });

  it("serves a complete Web App Manifest with Bookzello branding and icons", () => {
    const appManifest = manifest();
    expect(appManifest.name).toBe("Bookzello");
    expect(appManifest.short_name).toBe("Bookzello");
    expect(appManifest.theme_color).toBe("#1852E8");
    expect(appManifest.icons).toBeDefined();
    expect(appManifest.icons!.length).toBeGreaterThanOrEqual(3);
  });

  it("has all brand favicon and touch icon files in public and app directories", () => {
    const publicDir = path.resolve(__dirname, "../../public");
    const appDir = path.resolve(__dirname, "../../src/app");

    // SVG icon
    expect(fs.existsSync(path.join(publicDir, "icon.svg"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "icon.svg"))).toBe(true);

    // Multi-res ICO
    expect(fs.existsSync(path.join(publicDir, "favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "favicon.ico"))).toBe(true);

    // Apple touch icon
    expect(fs.existsSync(path.join(publicDir, "apple-touch-icon.png"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "apple-icon.png"))).toBe(true);

    // PWA icons
    expect(fs.existsSync(path.join(publicDir, "icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-512.png"))).toBe(true);

    // SVG must contain Bookzello logo elements
    const svg = fs.readFileSync(path.join(publicDir, "icon.svg"), "utf8");
    expect(svg).toContain("bz-icon-bubble");
    expect(svg).toContain("bz-icon-check");
  });

  it("declares comprehensive icon metadata in root layout", () => {
    expect(metadata.icons).toBeDefined();
    const icons = metadata.icons as { icon: Array<{ url: string }>; apple: Array<{ url: string }> };
    expect(icons.icon).toBeDefined();
    const iconUrls = icons.icon.map((i) => i.url);
    expect(iconUrls).toContain("/icon.svg");
    expect(iconUrls).toContain("/favicon.ico");
    expect(icons.apple).toBeDefined();
  });
});
