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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready for Online Booking</span>
          </span>
        );
      case "partially_ready":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Setup Action Recommended</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Setup Required Before Launch</span>
          </span>
        );
    }
  };

  const getCardTone = () => {
    switch (status) {
      case "ready":
        return "border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/50";
      case "partially_ready":
        return "border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/50";
      default:
        return "border-blue-200/90 bg-gradient-to-br from-blue-50/30 via-white to-slate-50/50";
    }
  };

  const getScoreColor = () => {
    if (report.scorePercent >= 100) return "from-emerald-500 to-teal-600";
    if (report.scorePercent >= 50) return "from-amber-500 to-orange-500";
    return "from-blue-600 to-indigo-600";
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-xs transition-all ${getCardTone()}`}>
      {/* Top Header & Readiness Score */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-200/80 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge()}
            
            {/* Visual Progress Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <span>Readiness:</span>
              <strong className="text-slate-900">{report.scorePercent}%</strong>
              <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden ml-1">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getScoreColor()} transition-all duration-500`}
                  style={{ width: `${Math.max(5, report.scorePercent)}%` }}
                />
              </div>
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
            {summary}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            {status === "ready"
              ? "All booking requirements are satisfied. Your salon is actively generating collision-free appointment slots."
              : "Complete the guided checklist below to unlock client online appointments and automated reminders."}
          </p>
        </div>

        {/* Action Hub */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {status !== "ready" && isOwner && stats.activeStaff === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSoloSetup}
              disabled={isSettingUpSolo}
              className="text-xs font-bold gap-1.5 border-amber-300 bg-white hover:bg-amber-50 text-amber-900 shadow-2xs"
            >
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <span>{isSettingUpSolo ? "Configuring Solo..." : "1-Click Solo Owner Setup"}</span>
            </Button>
          )}

          {status !== "ready" && (
            <Link
              href={`/dashboard/${businessSlug}/onboarding`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-blue-500/20 transition-all"
            >
              <span>Setup Wizard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 4 Launch Pillars Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Pillar 1: Services */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 text-slate-500 font-semibold mb-1.5">
            <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Scissors className="h-3.5 w-3.5" />
            </div>
            <span>Bookable Services</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {stats.bookableServices} / {stats.activeServices}
          </div>
          <div className="text-[11px] mt-1 font-medium">
            {stats.unbookableServices > 0 ? (
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                {stats.unbookableServices} missing staff
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                All bookable
              </span>
            )}
          </div>
        </div>

        {/* Pillar 2: Staff */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 text-slate-500 font-semibold mb-1.5">
            <div className="h-6 w-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
            <span>Active Staff</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {stats.activeStaff}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {stats.staffWithSchedules} with working shifts
          </div>
        </div>

        {/* Pillar 3: Schedule */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 text-slate-500 font-semibold mb-1.5">
            <div className="h-6 w-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span>Salon Schedule</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {stats.openDaysCount} days / week
          </div>
          <div className="text-[11px] mt-1 font-medium">
            {stats.openDaysCount > 0 ? (
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                Open for booking
              </span>
            ) : (
              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-semibold">
                Marked closed
              </span>
            )}
          </div>
        </div>

        {/* Pillar 4: Online Portal */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 text-slate-500 font-semibold mb-1.5">
            <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Globe className="h-3.5 w-3.5" />
            </div>
            <span>Online Portal</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {stats.onlineBookingEnabled ? "Live" : "Paused"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-semibold">
            <Link
              href={`/booking/${businessSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Preview Link</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Guided Setup Checklist (when issues exist) */}
      {issues.length > 0 && (
        <div className="mt-5 pt-5 border-t border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Required Setup Checklist</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                {issues.length} {issues.length === 1 ? "Action" : "Actions"} Needed
              </span>
            </h3>
          </div>

          <div className="space-y-2.5">
            {issues.map((issue) => {
              const isBlocker = issue.severity === "blocker";
              return (
                <div
                  key={issue.code}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-white shadow-2xs transition-all ${
                    isBlocker
                      ? "border-rose-200/80 hover:border-rose-300"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isBlocker
                          ? "bg-rose-50 text-rose-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {isBlocker ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {issue.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                            isBlocker
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isBlocker ? "Blocker" : "Recommended"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {issue.message}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={issue.actionUrl}
                    className="inline-flex items-center gap-1 self-start sm:self-center font-bold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg whitespace-nowrap text-xs shrink-0 transition-colors"
                  >
                    <span>{issue.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unbookable Services Breakdown if any */}
      {unbookableServices.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs shadow-2xs">
          <p className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
            <Scissors className="h-3.5 w-3.5 text-amber-700" />
            <span>Unbookable Services ({unbookableServices.length}) — No specialist assigned:</span>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 font-medium">
            {unbookableServices.map((u) => (
              <li key={u.id}>
                <strong>{u.name}</strong> — {u.reason}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link
              href={`/dashboard/${businessSlug}/services`}
              className="inline-flex items-center gap-1.5 font-bold text-amber-900 underline hover:no-underline"
            >
              <span>Assign specialists in Services Manager</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
