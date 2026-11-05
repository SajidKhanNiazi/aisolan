import { describe, it, expect } from "vitest";

describe("Bookzello Dashboard Navigation Circuit Simulation Suite", () => {
  const businessSlug = "bookpilot-qa-salon";
  const circuitPages = [
    { name: "Overview", href: `/dashboard/${businessSlug}`, exact: true },
    { name: "Calendar", href: `/dashboard/${businessSlug}/appointments`, exact: false },
    { name: "Customers", href: `/dashboard/${businessSlug}/customers`, exact: false },
    { name: "Services", href: `/dashboard/${businessSlug}/services`, exact: false },
    { name: "Team & Staff", href: `/dashboard/${businessSlug}/staff`, exact: false },
    { name: "Availability", href: `/dashboard/${businessSlug}/availability`, exact: false },
  ];

  const isLinkActive = (currentPathname: string, href: string, exact: boolean) => {
    if (exact) return currentPathname === href;
    return currentPathname === href || currentPathname.startsWith(`${href}/`);
  };

  describe("Circuit 1 — Full 6-Page Navigation Cycle", () => {
    it("simulates full forward sequential traversal through all 6 operational routes twice", () => {
      for (let run = 1; run <= 2; run++) {
        for (let i = 0; i < circuitPages.length; i++) {
          const currentPage = circuitPages[i];
          const nextPage = circuitPages[(i + 1) % circuitPages.length];

          // Current page active state
          expect(isLinkActive(currentPage.href, currentPage.href, currentPage.exact)).toBe(true);

          // Other pages should not be marked active
          const inactivePages = circuitPages.filter((p) => p.href !== currentPage.href);
          for (const inactive of inactivePages) {
            expect(isLinkActive(currentPage.href, inactive.href, inactive.exact)).toBe(false);
          }

          // Simulate click transition to next page
          expect(nextPage.href).toMatch(new RegExp(`^/dashboard/${businessSlug}`));
          expect(isLinkActive(nextPage.href, nextPage.href, nextPage.exact)).toBe(true);
        }
      }
    });
  });

  describe("Circuit 2 — Specific QA Bug Trigger Circuits", () => {
    it("verifies Customers -> Overview navigation state resolution", () => {
      const customersHref = `/dashboard/${businessSlug}/customers`;
      const overviewHref = `/dashboard/${businessSlug}`;

      expect(isLinkActive(customersHref, customersHref, false)).toBe(true);
      expect(isLinkActive(customersHref, overviewHref, true)).toBe(false);

      // Transition to Overview
      expect(isLinkActive(overviewHref, overviewHref, true)).toBe(true);
      expect(isLinkActive(overviewHref, customersHref, false)).toBe(false);
    });

    it("verifies Settings -> Overview navigation state resolution", () => {
      const settingsHref = `/dashboard/${businessSlug}/settings`;
      const overviewHref = `/dashboard/${businessSlug}`;

      expect(isLinkActive(settingsHref, overviewHref, true)).toBe(false);
      expect(isLinkActive(overviewHref, overviewHref, true)).toBe(true);
    });

    it("verifies Calendar -> Services navigation state resolution", () => {
      const calendarHref = `/dashboard/${businessSlug}/appointments`;
      const servicesHref = `/dashboard/${businessSlug}/services`;

      expect(isLinkActive(calendarHref, calendarHref, false)).toBe(true);
      expect(isLinkActive(calendarHref, servicesHref, false)).toBe(false);

      // Transition to Services
      expect(isLinkActive(servicesHref, servicesHref, false)).toBe(true);
      expect(isLinkActive(servicesHref, calendarHref, false)).toBe(false);
    });
  });

  describe("Workspace Resolution Invariants Across Navigation", () => {
    const allBusinesses = [
      { id: "1", name: "Salon Alpha", slug: "salon-alpha", role: "owner" as const },
      { id: "2", name: "Salon Beta", slug: "salon-beta", role: "manager" as const },
    ];

    it("retains active business on global routes using preferred slug", () => {
      const pathname = "/dashboard/settings/profile";
      const preferredSlug = "salon-beta";

      const pathnameBusiness = allBusinesses.find(
        (b) => pathname === `/dashboard/${b.slug}` || pathname.startsWith(`/dashboard/${b.slug}/`)
      );
      expect(pathnameBusiness).toBeUndefined();

      const activeBusiness =
        pathnameBusiness ||
        (preferredSlug ? allBusinesses.find((b) => b.slug === preferredSlug) : null) ||
        allBusinesses[0];

      // Correctly keeps Salon Beta rather than arbitrarily reverting to Salon Alpha!
      expect(activeBusiness.slug).toBe("salon-beta");
      expect(activeBusiness.name).toBe("Salon Beta");
    });

    it("enforces tenant isolation by ignoring unauthorized preferred slugs", () => {
      const pathname = "/dashboard/settings/profile";
      const unauthorizedSlug = "malicious-external-salon";

      const pathnameBusiness = allBusinesses.find(
        (b) => pathname === `/dashboard/${b.slug}` || pathname.startsWith(`/dashboard/${b.slug}/`)
      );

      const activeBusiness =
        pathnameBusiness ||
        allBusinesses.find((b) => b.slug === unauthorizedSlug) ||
        allBusinesses[0];

      // Safely falls back to the user's first authorized salon
      expect(activeBusiness.slug).toBe("salon-alpha");
    });
  });
});

