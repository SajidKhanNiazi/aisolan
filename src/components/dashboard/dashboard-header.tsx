"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import type { BusinessWithRole, UserProfile } from "@/features/organizations/types";
import { logoutAction } from "@/features/auth/server";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  currentBusiness?: BusinessWithRole | null;
  allBusinesses: BusinessWithRole[];
  profile: UserProfile | null;
  userEmail?: string;
}

export function DashboardHeader({
  currentBusiness,
  allBusinesses,
  profile,
  userEmail,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
    });
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

  return (
    <header className="sticky top-16 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Workspace selector & breadcrumb */}
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Business Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="max-w-[140px] sm:max-w-[200px] truncate">
                {currentBusiness ? currentBusiness.name : "Select Workspace"}
              </span>
              {currentBusiness && (
                <Badge
                  variant={getRoleBadgeVariant(currentBusiness.role)}
                  className="hidden sm:inline-flex text-[10px] uppercase font-bold px-1.5 py-0"
                >
                  {currentBusiness.role}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            </button>

            {switcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div className="absolute left-0 mt-2 z-50 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Workspaces ({allBusinesses.length})
                  </div>
                  <div className="mt-1 max-h-60 overflow-y-auto space-y-1">
                    {allBusinesses.map((b) => {
                      const isSelected = currentBusiness?.id === b.id;
                      return (
                        <Link
                          key={b.id}
                          href={`/dashboard/${b.slug}`}
                          onClick={() => setSwitcherOpen(false)}
                          className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{b.name}</span>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                    <Link
                      href="/dashboard/businesses/new"
                      onClick={() => setSwitcherOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create New Workspace
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4 border-l border-zinc-200 pl-4 dark:border-zinc-800">
            {currentBusiness && (
              <Link
                href={`/dashboard/${currentBusiness.slug}`}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  pathname === `/dashboard/${currentBusiness.slug}`
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Overview
              </Link>
            )}
            <Link
              href="/dashboard/businesses"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                pathname === "/dashboard/businesses"
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              All Workspaces
            </Link>
            <Link
              href="/dashboard/settings/profile"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                pathname === "/dashboard/settings/profile"
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Profile
            </Link>
          </nav>
        </div>

        {/* Right: User identity & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {profile?.full_name || "Account Owner"}
            </span>
            <span className="text-[11px] text-zinc-500 truncate max-w-[150px]">
              {userEmail}
            </span>
          </div>

          <Link
            href="/dashboard/settings/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
            title="Profile Settings"
          >
            <User className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            title="Sign out of account"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 space-y-1">
          {currentBusiness && (
            <Link
              href={`/dashboard/${currentBusiness.slug}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <LayoutDashboard className="h-4 w-4" />
              Workspace Overview
            </Link>
          )}
          <Link
            href="/dashboard/businesses"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Building2 className="h-4 w-4" />
            All Workspaces
          </Link>
          <Link
            href="/dashboard/businesses/new"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <Plus className="h-4 w-4" />
            Create Workspace
          </Link>
          <Link
            href="/dashboard/settings/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Settings className="h-4 w-4" />
            Profile Settings
          </Link>
        </div>
      )}
    </header>
  );
}
