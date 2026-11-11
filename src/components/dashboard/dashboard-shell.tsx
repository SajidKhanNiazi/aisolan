"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Plus,
  User,
  LogOut,
  Check,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  Sparkles,
  Scissors,
  Users,
  Calendar,
  Globe,
  ExternalLink,
  Loader2,
  Copy,
} from "lucide-react";
import type { BusinessWithRole, UserProfile } from "@/features/organizations/types";
import { logoutAction } from "@/features/auth/server";
import { Badge } from "@/components/ui/badge";
import { BookzelloLogo } from "@/components/ui/bookzello-logo";

interface DashboardShellProps {
  currentBusiness?: BusinessWithRole | null;
  allBusinesses: BusinessWithRole[];
  profile: UserProfile | null;
  userEmail?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  currentBusiness,
  allBusinesses,
  profile,
  userEmail,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, startLogout] = useTransition();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [copiedLink, setCopiedLink] = useState(false);
  const [preferredSlug, setPreferredSlug] = useState<string | null>(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("bookzello_last_business_slug="));
      if (match) {
        return decodeURIComponent(match.split("=")[1]);
      }
    }
    return null;
  });

  // Match business from current pathname first
  const pathnameBusiness = allBusinesses.find(
    (b) =>
      pathname === `/dashboard/${b.slug}` ||
      pathname.startsWith(`/dashboard/${b.slug}/`)
  );

  // Sync cookie whenever on a business-specific route
  useEffect(() => {
    if (pathnameBusiness?.slug && typeof document !== "undefined") {
      document.cookie = `bookzello_last_business_slug=${encodeURIComponent(
        pathnameBusiness.slug
      )}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [pathnameBusiness?.slug]);

  // Derive active business: prop -> pathname match -> remembered preference -> first salon
  const activeBusiness =
    currentBusiness ||
    pathnameBusiness ||
    (preferredSlug ? allBusinesses.find((b) => b.slug === preferredSlug) : null) ||
    allBusinesses[0] ||
    null;

  // Clear pending navigation state and close drawer whenever pathname changes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setNavigatingTo(null);
    setMobileMenuOpen(false);
    setSwitcherOpen(false);
  }

  // Handle escape key to close mobile drawer and dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setSwitcherOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    startLogout(async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
    });
  };

  const handleCopyBookingLink = async () => {
    if (!activeBusiness) return;
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://bookzello.com";
    const bookingUrl = `${origin}/booking/${activeBusiness.slug}`;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Build nav items dynamically based on active business
  const navItems = activeBusiness
    ? [
        {
          label: "Overview",
          href: `/dashboard/${activeBusiness.slug}`,
          icon: LayoutDashboard,
          exact: true,
          badge: null,
        },
        {
          label: "Calendar",
          href: `/dashboard/${activeBusiness.slug}/appointments`,
          icon: Calendar,
          exact: false,
          badge: null,
        },
        {
          label: "Customers",
          href: `/dashboard/${activeBusiness.slug}/customers`,
          icon: Users,
          exact: false,
          badge: null,
        },
        {
          label: "Services",
          href: `/dashboard/${activeBusiness.slug}/services`,
          icon: Scissors,
          exact: false,
          badge: null,
        },
        {
          label: "Team & Staff",
          href: `/dashboard/${activeBusiness.slug}/staff`,
          icon: User,
          exact: false,
          badge: null,
        },
        {
          label: "Availability",
          href: `/dashboard/${activeBusiness.slug}/availability`,
          icon: Sparkles,
          exact: false,
          badge: null,
        },
        ...(activeBusiness.role === "owner"
          ? [
              {
                label: "Business Settings",
                href: `/dashboard/${activeBusiness.slug}/settings`,
                icon: Settings,
                exact: false,
                badge: null,
              },
            ]
          : []),
      ]
    : [];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {/* Top Instant Navigation Progress Bar */}
      {navigatingTo && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 animate-pulse" />
      )}

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Fixed Left, Persistent Shell)                             */}
      {/* ========================================================================= */}
      <aside
        aria-label="Sidebar navigation"
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r border-slate-200/80 bg-white shadow-[1px_0_12px_rgba(15,23,42,0.02)]"
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-slate-100/90">
          <Link
            href={activeBusiness ? `/dashboard/${activeBusiness.slug}` : "/dashboard"}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-95"
            aria-label="Bookzello Dashboard Home"
          >
            <BookzelloLogo
              iconClassName="h-8 w-8"
              textClassName="text-lg font-bold text-slate-900 tracking-tight"
            />
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/60 bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider shadow-2xs">
            <span className="h-1 w-1 rounded-full bg-blue-600 animate-pulse" />
            Salon OS
          </span>
        </div>

        {/* Workspace Switcher */}
        <div className="p-3.5 border-b border-slate-100/90 bg-slate-50/40">
          <div className="relative">
            <button
              type="button"
              data-testid="workspace-switcher-button"
              onClick={() => setSwitcherOpen((prev) => !prev)}
              aria-expanded={switcherOpen}
              className="w-full flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-900 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-102 transition-transform">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <div className="truncate font-bold text-slate-900 text-xs">
                    {activeBusiness ? activeBusiness.name : "Select Salon"}
                  </div>
                  {activeBusiness && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 capitalize">
                        {activeBusiness.role}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
            </button>

            {switcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Your Salons ({allBusinesses.length})
                  </div>
                  <div className="mt-1 max-h-56 overflow-y-auto space-y-1">
                    {allBusinesses.map((b) => {
                      const isSelected = activeBusiness?.id === b.id;
                      return (
                        <Link
                          key={b.id}
                          href={`/dashboard/${b.slug}`}
                          data-testid="workspace-switcher-item"
                          onClick={() => {
                            setSwitcherOpen(false);
                            setPreferredSlug(b.slug);
                            if (typeof document !== "undefined") {
                              document.cookie = `bookzello_last_business_slug=${encodeURIComponent(
                                b.slug
                              )}; path=/; max-age=31536000; SameSite=Lax`;
                            }
                            if (b.slug !== activeBusiness?.slug) {
                              setNavigatingTo(`/dashboard/${b.slug}`);
                            }
                          }}
                          className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-blue-50/80 text-blue-700 font-bold border border-blue-200/50"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                              <Building2 className="h-3 w-3" />
                            </div>
                            <span className="truncate">{b.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 font-bold" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <Link
                      href="/dashboard/businesses/new"
                      onClick={() => setSwitcherOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add New Salon</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Operations Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operations
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href, item.exact);
                const isNavigating = navigatingTo === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (!active) setNavigatingTo(item.href);
                    }}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                      active
                        ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                        : isNavigating
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          active
                            ? "text-white"
                            : isNavigating
                            ? "text-blue-600 animate-pulse"
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.label === "Business Settings" && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          active
                            ? "bg-blue-500/40 text-blue-50"
                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                        }`}
                      >
                        config
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Management & External Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace &amp; Public
            </div>
            <nav className="space-y-1">
              <Link
                href="/dashboard/businesses"
                onClick={() => {
                  if (pathname !== "/dashboard/businesses") {
                    setNavigatingTo("/dashboard/businesses");
                  }
                }}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                  pathname === "/dashboard/businesses"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2
                    className={`h-4 w-4 shrink-0 ${
                      pathname === "/dashboard/businesses"
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>All Salons</span>
                </div>
              </Link>

              {activeBusiness && (
                <Link
                  href={`/booking/${activeBusiness.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 shrink-0 text-blue-500" />
                    <span>Public Booking Page</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600" />
                </Link>
              )}
            </nav>
          </div>
        </div>

        {/* User Account & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <Link
              href="/dashboard/settings/profile"
              onClick={() => {
                if (pathname !== "/dashboard/settings/profile") {
                  setNavigatingTo("/dashboard/settings/profile");
                }
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
              title="Manage profile settings"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                {profile?.full_name?.charAt(0).toUpperCase() ||
                  userEmail?.charAt(0).toUpperCase() ||
                  "U"}
              </div>
              <div className="truncate min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {profile?.full_name || "Account Owner"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {userEmail}
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title={isLoggingOut ? "Logging out..." : "Log out of Bookzello"}
            >
              {isLoggingOut ? (
                <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden xl:inline">Logging out...</span>
                </div>
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE HEADER & DRAWER (Compact Header + Slide-Over)                      */}
      {/* ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open sidebar menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href={activeBusiness ? `/dashboard/${activeBusiness.slug}` : "/dashboard"}
            className="flex items-center gap-2"
          >
            <BookzelloLogo iconClassName="h-7 w-7" textClassName="text-base font-bold text-slate-900" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {activeBusiness && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 max-w-[140px] truncate">
              {activeBusiness.name}
            </span>
          )}

          <Link
            href="/dashboard/settings/profile"
            className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs"
            title="Profile Settings"
          >
            {profile?.full_name?.charAt(0).toUpperCase() ||
              userEmail?.charAt(0).toUpperCase() ||
              "U"}
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Slide-out (Persistent DOM with CSS Transition to prevent event cancelation) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-200 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        {/* Overlay Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer Panel */}
        <div
          className={`fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white shadow-2xl transition-transform duration-200 ease-in-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="flex h-14 items-center justify-between border-b border-slate-100 px-5">
            <BookzelloLogo iconClassName="h-7 w-7" textClassName="text-base font-bold text-slate-900" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close sidebar menu"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Salon Switcher */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Active Salon
            </label>
            <div className="relative">
              <select
                value={activeBusiness?.slug || ""}
                onChange={(e) => {
                  const slug = e.target.value;
                  if (slug === "__new__") {
                    router.push("/dashboard/businesses/new");
                  } else if (slug) {
                    setPreferredSlug(slug);
                    if (typeof document !== "undefined") {
                      document.cookie = `bookzello_last_business_slug=${encodeURIComponent(
                        slug
                      )}; path=/; max-age=31536000; SameSite=Lax`;
                    }
                    router.push(`/dashboard/${slug}`);
                  }
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-600 focus:outline-none"
              >
                {allBusinesses.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name} ({b.role})
                  </option>
                ))}
                <option value="__new__">+ Create New Salon...</option>
              </select>
            </div>
          </div>

          {/* Drawer Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Salon Management
              </div>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item.href, item.exact);
                  const isNavigating = navigatingTo === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (active) {
                          setMobileMenuOpen(false);
                        } else {
                          setNavigatingTo(item.href);
                        }
                      }}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-blue-600 text-white"
                          : isNavigating
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active
                              ? "text-white"
                              : isNavigating
                              ? "text-blue-600 animate-pulse"
                              : "text-slate-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isNavigating && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping mr-1" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Links
              </div>
              <div className="space-y-1">
                <Link
                  href="/dashboard/businesses"
                  onClick={() => {
                    if (pathname === "/dashboard/businesses") {
                      setMobileMenuOpen(false);
                    } else {
                      setNavigatingTo("/dashboard/businesses");
                    }
                  }}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>All Salons</span>
                </Link>

                {activeBusiness && (
                  <Link
                    href={`/booking/${activeBusiness.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span>View Public Booking Page</span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/dashboard/settings/profile"
                onClick={() => {
                  if (pathname === "/dashboard/settings/profile") {
                    setMobileMenuOpen(false);
                  } else {
                    setNavigatingTo("/dashboard/settings/profile");
                  }
                }}
                className="flex items-center gap-2 min-w-0"
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="truncate text-xs font-semibold text-slate-800">
                  {profile?.full_name || "Profile"}
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP TOPBAR (Clean, Compact Header for Active Workspace & Quick Tools) */}
      {/* ========================================================================= */}
      <div className="lg:pl-64 flex flex-col min-w-0 flex-1">
        <header className="hidden lg:flex sticky top-0 z-20 h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 lg:px-8">
          {/* Left: Active Workspace Pill & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            {activeBusiness ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 tracking-tight">
                  {activeBusiness.name}
                </span>
                <Badge
                  variant={getRoleBadgeVariant(activeBusiness.role)}
                  className="text-[10px] uppercase font-bold px-1.5 py-0"
                >
                  {activeBusiness.role}
                </Badge>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-medium text-slate-500">
                  {navItems.find((n) => isLinkActive(n.href, n.exact))?.label ||
                    (pathname.includes("/settings") ? "Settings" : "Workspace")}
                </span>
              </div>
            ) : (
              <span className="font-semibold text-sm text-slate-900">
                Salon Workspaces
              </span>
            )}
          </div>

          {/* Right: Quick Actions & Status */}
          <div className="flex items-center gap-3">
            {activeBusiness && (
              <>
                <button
                  type="button"
                  onClick={handleCopyBookingLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copy client booking URL"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy Booking Link</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/booking/${activeBusiness.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200/60 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  <span>View Public Page</span>
                  <ExternalLink className="h-3 w-3 text-blue-500" />
                </Link>
              </>
            )}

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <Link
              href="/dashboard/settings/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {profile?.full_name?.charAt(0).toUpperCase() ||
                  userEmail?.charAt(0).toUpperCase() ||
                  "U"}
              </div>
              <span className="hidden xl:inline text-slate-800">
                {profile?.full_name || "Profile"}
              </span>
            </Link>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN DASHBOARD CONTENT AREA                                               */}
        {/* ========================================================================= */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
