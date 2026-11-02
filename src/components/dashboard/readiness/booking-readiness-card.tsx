"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Scissors,
  Users,
  Clock,
  Globe,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingReadinessReport } from "@/features/organizations/readiness";
import { setupSoloOwnerOperator } from "@/features/staff/server";

interface BookingReadinessCardProps {
  report: BookingReadinessReport;
  businessSlug: string;
  isOwner: boolean;
}

export function BookingReadinessCard({
  report,
  businessSlug,
  isOwner,
}: BookingReadinessCardProps) {
  const [isSettingUpSolo, setIsSettingUpSolo] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { status, summary, stats, unbookableServices, issues } = report;

  const handleSoloSetup = async () => {
    if (!isOwner) return;
    setIsSettingUpSolo(true);
    setActionMessage(null);
    try {
      const res = await setupSoloOwnerOperator(report.businessId, businessSlug);
      if (res.success) {
        setActionMessage(`Solo operator setup complete! Linked ${res.servicesLinked || 0} service(s). Please refresh.`);
        window.location.reload();
      } else {
        setActionMessage(res.error || "Failed to complete solo operator setup.");
      }
    } catch {
      setActionMessage("Error executing solo operator setup.");
    } finally {
      setIsSettingUpSolo(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready for Online Booking</span>
          </span>
        );
      case "partially_ready":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Action Recommended</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Setup Required</span>
          </span>
        );
    }
  };

  const getBorderAndBg = () => {
    switch (status) {
      case "ready":
        return "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10";
      case "partially_ready":
        return "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/15";
      default:
        return "border-rose-200 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/15";
    }
  };

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 transition-all ${getBorderAndBg()}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {getStatusBadge()}
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Readiness Score: <strong className="text-zinc-900 dark:text-zinc-100">{report.scorePercent}%</strong>
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {summary}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {status !== "ready" && isOwner && stats.activeStaff === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSoloSetup}
              disabled={isSettingUpSolo}
              className="text-xs gap-1.5 border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 dark:hover:bg-amber-950/30"
            >
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <span>{isSettingUpSolo ? "Setting up..." : "1-Click Solo Setup"}</span>
            </Button>
          )}

          {status !== "ready" && (
            <Link
              href={`/dashboard/${businessSlug}/onboarding`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 shadow-sm hover:opacity-90 transition-opacity"
            >
              <span>Onboarding Wizard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
          {actionMessage}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Scissors className="h-3.5 w-3.5" />
            <span>Bookable Services</span>
          </div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {stats.bookableServices} / {stats.activeServices}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {stats.unbookableServices > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {stats.unbookableServices} missing staff
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">All bookable</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Users className="h-3.5 w-3.5" />
            <span>Active Staff</span>
          </div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {stats.activeStaff}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {stats.staffWithSchedules} with working shifts
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Salon Schedule</span>
          </div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {stats.openDaysCount} days / week
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {stats.openDaysCount > 0 ? "Open for booking" : "Marked closed"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/60 p-3">
          <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
            <Globe className="h-3.5 w-3.5" />
            <span>Online Portal</span>
          </div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {stats.onlineBookingEnabled ? "Live" : "Paused"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            <Link
              href={`/booking/${businessSlug}`}
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Visit Page</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Issues / Recommendations List if any */}
      {issues.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Required Actions to Accept Appointments
          </h3>
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.code}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800 text-xs"
              >
                <div className="flex items-start gap-2">
                  {issue.severity === "blocker" ? (
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {issue.title}:
                    </span>{" "}
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {issue.message}
                    </span>
                  </div>
                </div>

                <Link
                  href={issue.actionUrl}
                  className="inline-flex items-center gap-1 self-start sm:self-center font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap text-xs shrink-0"
                >
                  <span>{issue.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unbookable Services Breakdown if partially ready */}
      {unbookableServices.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-amber-100/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
          <p className="font-semibold text-amber-950 dark:text-amber-200 mb-1.5">
            Unbookable Services ({unbookableServices.length}):
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 dark:text-amber-300/90">
            {unbookableServices.map((u) => (
              <li key={u.id}>
                <strong>{u.name}</strong> — {u.reason}
              </li>
            ))}
          </ul>
          <div className="mt-2.5">
            <Link
              href={`/dashboard/${businessSlug}/services`}
              className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 underline hover:no-underline"
            >
              <span>Assign professionals in Services manager</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
