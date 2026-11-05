import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Bookzello Dashboard QA Bug Fixes Suite", () => {
  const rootDir = path.resolve(__dirname, "../../");

  describe("P1 Fix 1 — Navigation First Click Stability", () => {
    const shellPath = path.join(rootDir, "src/components/dashboard/dashboard-shell.tsx");
    const content = fs.readFileSync(shellPath, "utf-8");

    it("keeps mobile drawer persistently mounted with CSS transitions to prevent event cancellation", () => {
      // Drawer should not be conditionally destroyed via {mobileMenuOpen && <div ...>}
      expect(content).not.toContain("{mobileMenuOpen && (\n        <div className=\"fixed inset-0 z-50 lg:hidden\">");
      // Drawer uses CSS visibility & transform transitions
      expect(content).toContain("opacity-100 pointer-events-auto visible");
      expect(content).toContain("opacity-0 pointer-events-none invisible");
      expect(content).toContain("translate-x-0");
      expect(content).toContain("-translate-x-full");
    });

    it("does not mutate link children or swap icons on click to prevent event target detachment", () => {
      // Must not swap <Icon> with <Loader2> inside <Link>
      expect(content).not.toContain("{isNavigating ? (\n                        <Loader2 className=\"h-4 w-4 shrink-0 animate-spin text-blue-600\" />");
      // Shows pulse/ping or top progress bar instead of destroying the clicked icon node
      expect(content).toContain("text-blue-600 animate-pulse");
      expect(content).toContain("h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping");
    });

    it("automatically closes drawer on route/pathname change without premature unmount", () => {
      expect(content).toContain("if (pathname !== prevPathname) {");
      expect(content).toContain("setMobileMenuOpen(false);");
      expect(content).toContain("setNavigatingTo(null);");
    });
  });

  describe("P1 Fix 2 — Google Calendar Infinite Loading Prevention", () => {
    const editorPath = path.join(
      rootDir,
      "src/components/dashboard/settings/google-calendar-settings-editor.tsx"
    );
    const content = fs.readFileSync(editorPath, "utf-8");

    it("implements a 5-second hard timeout guard to guarantee loading resolution", () => {
      expect(content).toContain("5000");
      expect(content).toContain("timedOut = true;");
      expect(content).toContain("setIsLoading(false);");
      expect(content).toContain("clearTimeout(timeoutId);");
    });

    it("displays an explicit Not Connected state when no connection exists or request fails", () => {
      expect(content).toContain("Not Connected");
      expect(content).toContain("Connect Google Calendar");
      expect(content).toContain("setConnection(null);");
    });

    it("provides retry capability for network errors or status timeouts", () => {
      expect(content).toContain("Retry Check");
      expect(content).toContain("RefreshCw");
      expect(content).toContain("Skip waiting (Show Disconnected)");
    });
  });

  describe("P2 Fix 1 — Customers Table Responsiveness Around 845px", () => {
    const customerDir = path.join(
      rootDir,
      "src/components/dashboard/customers/customer-directory.tsx"
    );
    const content = fs.readFileSync(customerDir, "utf-8");

    it("sets minimum table width to prevent column squeezing at 845px", () => {
      expect(content).toContain("min-w-[720px]");
      expect(content).toContain("overflow-x-auto");
    });

    it("makes the Actions column sticky to ensure button accessibility during horizontal scroll", () => {
      expect(content).toContain("sticky right-0");
      expect(content).toContain("min-w-[140px]");
    });
  });

  describe("P2 Fix 2 & P2 Fix 3 — Workspace Switcher & Post-Login Workspace Recovery", () => {
    const pagePath = path.join(rootDir, "src/app/dashboard/page.tsx");
    const shellPath = path.join(rootDir, "src/components/dashboard/dashboard-shell.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    const shellContent = fs.readFileSync(shellPath, "utf-8");

    it("restores last-used workspace from secure cookie post-login with tenant membership validation", () => {
      expect(pageContent).toContain('cookieStore.get("bookzello_last_business_slug")');
      expect(pageContent).toContain("businesses.find((b) => b.slug === lastSlug)");
      expect(pageContent).toContain("redirect(`/dashboard/${matched.slug}`)");
      // Safe fallback if not matched or unauthorized
      expect(pageContent).toContain("redirect(`/dashboard/${businesses[0].slug}`)");
    });

    it("persists active business slug to cookie and synchronizes topbar, sidebar, and switcher", () => {
      expect(shellContent).toContain("bookzello_last_business_slug=");
      expect(shellContent).toContain("preferredSlug");
      expect(shellContent).toContain("setPreferredSlug");
    });
  });

  describe("P2 Fix 4 — WhatsApp UI Wording & Status Clarity", () => {
    const serverPath = path.join(rootDir, "src/features/integrations/whatsapp/server.ts");
    const editorPath = path.join(
      rootDir,
      "src/components/dashboard/settings/whatsapp-settings-editor.tsx"
    );
    const serverContent = fs.readFileSync(serverPath, "utf-8");
    const editorContent = fs.readFileSync(editorPath, "utf-8");

    it("distinguishes disconnected and incomplete states accurately", () => {
      expect(serverContent).toContain('let statusBadge = "Disconnected";');
      expect(serverContent).toContain('statusBadge = "Configuration Incomplete";');
      expect(serverContent).toContain('statusBadge = "Blocked (Salon Not Whitelisted)";');
      expect(serverContent).toContain('statusBadge = "Connected (Active)";');
    });

    it("does not default disconnected state to misleading 'Ready to Connect'", () => {
      expect(editorContent).not.toContain('(isConnected ? "Connected (Active)" : "Ready to Connect")');
      expect(editorContent).toContain('(isConnected ? "Connected (Active)" : "Disconnected")');
    });
  });

  describe("P2 Fix 5 — Public Marketing Header at 845px", () => {
    const navbarPath = path.join(rootDir, "src/components/layout/navbar-client.tsx");
    const content = fs.readFileSync(navbarPath, "utf-8");

    it("uses lg breakpoint for desktop navigation links so buttons never clip around 845px", () => {
      expect(content).toContain("hidden lg:flex items-center gap-6 xl:gap-8");
      expect(content).toContain("flex lg:hidden items-center gap-2");
    });
  });

  describe("P2 Fix 6 — Logout Immediate Feedback", () => {
    const shellPath = path.join(rootDir, "src/components/dashboard/dashboard-shell.tsx");
    const content = fs.readFileSync(shellPath, "utf-8");

    it("shows immediate 'Logging out...' spinner and disables buttons on desktop and mobile", () => {
      expect(content).toContain("isLoggingOut ? \"Logging out...\" : \"Log out of Bookzello\"");
      expect(content).toContain("<span>Logging out...</span>");
      expect(content).toContain("disabled={isLoggingOut}");
    });
  });
});
