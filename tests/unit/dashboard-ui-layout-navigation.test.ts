import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Bookzello Dashboard UI/UX Redesign & Navigation Performance Suite", () => {
  const rootDir = path.resolve(__dirname, "../../");

  describe("1. Public Website vs Authenticated Dashboard Layout Separation", () => {
    it("suppresses public marketing navbar on /dashboard and /embed routes", () => {
      const navbarClientPath = path.join(rootDir, "src/components/layout/navbar-client.tsx");
      const content = fs.readFileSync(navbarClientPath, "utf-8");

      expect(content).toContain('pathname?.startsWith("/dashboard")');
      expect(content).toContain('pathname?.startsWith("/embed")');
      expect(content).toContain("return null;");
    });

    it("suppresses public marketing footer on /dashboard and /embed routes", () => {
      const footerPath = path.join(rootDir, "src/components/layout/footer.tsx");
      const content = fs.readFileSync(footerPath, "utf-8");

      expect(content).toContain('pathname?.startsWith("/dashboard")');
      expect(content).toContain('pathname?.startsWith("/embed")');
      expect(content).toContain("return null;");
    });

    it("preserves public marketing navbar and footer for marketing and public booking pages", () => {
      const rootLayoutPath = path.join(rootDir, "src/app/layout.tsx");
      const content = fs.readFileSync(rootLayoutPath, "utf-8");

      expect(content).toContain("<Navbar />");
      expect(content).toContain("<Footer />");
      expect(content).toContain("<AuthHashListener />");
    });
  });

  describe("2. Dedicated SaaS DashboardShell & Test ID Invariants", () => {
    it("exports DashboardShell with workspace-switcher-button and workspace-switcher-item test IDs", () => {
      const shellPath = path.join(rootDir, "src/components/dashboard/dashboard-shell.tsx");
      const content = fs.readFileSync(shellPath, "utf-8");

      expect(content).toContain('data-testid="workspace-switcher-button"');
      expect(content).toContain('data-testid="workspace-switcher-item"');
    });

    it("implements desktop sidebar, topbar, and accessible mobile drawer", () => {
      const shellPath = path.join(rootDir, "src/components/dashboard/dashboard-shell.tsx");
      const content = fs.readFileSync(shellPath, "utf-8");

      // Desktop sidebar
      expect(content).toContain('aria-label="Sidebar navigation"');
      expect(content).toContain("lg:fixed");
      expect(content).toContain("lg:w-64");

      // Mobile hamburger & drawer
      expect(content).toContain('aria-label="Open sidebar menu"');
      expect(content).toContain('aria-label="Close sidebar menu"');

      // Top instant navigation feedback bar
      expect(content).toContain("animate-pulse");
      expect(content).toContain("from-blue-600");
    });

    it("uses DashboardShell in dashboard layout with parallelized userBusinesses and profile queries", () => {
      const layoutPath = path.join(rootDir, "src/app/dashboard/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      expect(content).toContain("DashboardShell");
      expect(content).toContain("Promise.all([");
      expect(content).toContain("getUserBusinesses()");
      expect(content).toContain("getCurrentProfile()");
    });
  });

  describe("3. Route-Level Loading Skeletons for Instant Click Feedback", () => {
    it("defines route-level loading.tsx skeletons across all primary dashboard modules", () => {
      const expectedSkeletons = [
        "src/app/dashboard/loading.tsx",
        "src/app/dashboard/[businessSlug]/settings/loading.tsx",
        "src/app/dashboard/[businessSlug]/appointments/loading.tsx",
        "src/app/dashboard/[businessSlug]/services/loading.tsx",
        "src/app/dashboard/[businessSlug]/staff/loading.tsx",
        "src/app/dashboard/[businessSlug]/customers/loading.tsx",
        "src/app/dashboard/[businessSlug]/availability/loading.tsx",
      ];

      for (const skeletonPath of expectedSkeletons) {
        const fullPath = path.join(rootDir, skeletonPath);
        expect(fs.existsSync(fullPath), `Expected ${skeletonPath} to exist`).toBe(true);
        const code = fs.readFileSync(fullPath, "utf-8");
        expect(code).toContain("export default function");
        expect(code).toContain("animate-pulse");
      }
    });
  });

  describe("4. Business Settings Performance & Concurrency", () => {
    it("parallelizes dependent queries in getFullBusinessConfig via Promise.all", () => {
      const settingsServerPath = path.join(rootDir, "src/features/organizations/settings-server.ts");
      const content = fs.readFileSync(settingsServerPath, "utf-8");

      expect(content).toContain("Promise.all([");
      expect(content).toContain("business_opening_hours");
      expect(content).toContain("business_schedule_exceptions");
      expect(content).toContain("business_booking_policies");
      expect(content).toContain("business_onboarding_progress");
      expect(content).toContain("business_notification_settings");
      expect(content).toContain("notification_outbox");
      expect(content).toContain("getOwnerAiSettings(business.id)");
      expect(content).toContain("getActiveAiMode()");
    });

    it("supports searchParams and hash-safe tab navigation in BusinessSettingsTabs", () => {
      const tabsPath = path.join(rootDir, "src/components/dashboard/settings/business-settings-tabs.tsx");
      const content = fs.readFileSync(tabsPath, "utf-8");

      expect(content).toContain("useSearchParams");
      expect(content).toContain('searchParams?.get("tab")');
      expect(content).toContain("handleSelectTab");
    });
  });
});

