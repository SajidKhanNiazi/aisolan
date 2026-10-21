"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Clock,
  AlertCircle,
  RefreshCw,
  Info,
  CalendarCheck,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ServiceWithCategory } from "@/features/services/types";
import type { StaffWithServices } from "@/features/staff/types";
import type { AvailabilityResponse, AvailabilitySlot, StaffPreference } from "@/features/availability/types";
import { getAppointmentAvailability } from "@/features/availability/server";

interface AvailabilityPreviewProps {
  businessSlug: string;
  businessName: string;
  businessTimezone: string;
  services: ServiceWithCategory[];
  staff: StaffWithServices[];
  initialDate: string;
}

export function AvailabilityPreview({
  businessSlug,
  businessName,
  businessTimezone,
  services,
  staff,
  initialDate,
}: AvailabilityPreviewProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    services[0]?.id || ""
  );
  const [staffPreference, setStaffPreference] = useState<StaffPreference>("any");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [slotInterval, setSlotInterval] = useState<number>(15);

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeServices = services.filter((s) => s.is_active && !s.is_archived);
  const activeStaff = staff.filter((s) => s.is_active && !s.is_archived);

  // Filter staff who can perform the selected service
  const eligibleStaff = activeStaff.filter((st) =>
    st.service_ids?.includes(selectedServiceId)
  );

  const fetchAvailability = (
    srvId = selectedServiceId,
    pref = staffPreference,
    stfId = selectedStaffId,
    dt = selectedDate,
    interval = slotInterval
  ) => {
    if (!srvId || !dt) return;

    startTransition(async () => {
      setError(null);
      setSelectedSlot(null);

      const res = await getAppointmentAvailability({
        businessSlug,
        serviceId: srvId,
        date: dt,
        staffId: pref === "specific" && stfId ? stfId : null,
        staffPreference: pref,
        slotIntervalMinutes: interval,
      });

      if (!res.success) {
        setError(res.error || "Failed to calculate appointment availability.");
        setAvailability(null);
      } else if (res.data) {
        setAvailability(res.data);
      }
    });
  };

  useEffect(() => {
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId, staffPreference, selectedStaffId, selectedDate, slotInterval]);

  // Group slots by time of day
  const morningSlots =
    availability?.slots.filter((s) => s.localTime < "12:00") || [];
  const afternoonSlots =
    availability?.slots.filter(
      (s) => s.localTime >= "12:00" && s.localTime < "17:00"
    ) || [];
  const eveningSlots =
    availability?.slots.filter((s) => s.localTime >= "17:00") || [];

  const formatSlotTime12h = (time24: string) => {
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const getStaffName = (id: string) => {
    return activeStaff.find((s) => s.id === id)?.display_name || "Unknown Staff";
  };

  return (
    <div className="space-y-6">
      {/* Selection Controls Card */}
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-xl">Appointment Availability</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Preview available booking times for {businessName} based on services, staff schedules, and existing appointments.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono py-1 px-2.5">
                {businessTimezone}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAvailability()}
                disabled={isPending}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Service Selection */}
            <div>
              <label
                htmlFor="service-select"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Service
              </label>
              <select
                id="service-select"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {activeServices.length === 0 ? (
                  <option value="">No active services available</option>
                ) : (
                  activeServices.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({srv.duration_minutes}m
                      {srv.buffer_minutes ? ` + ${srv.buffer_minutes}m buffer` : ""})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Staff Selection */}
            <div>
              <label
                htmlFor="staff-select"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Staff Member
              </label>
              <select
                id="staff-select"
                value={staffPreference === "any" ? "any" : selectedStaffId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "any") {
                    setStaffPreference("any");
                    setSelectedStaffId("");
                  } else {
                    setStaffPreference("specific");
                    setSelectedStaffId(val);
                  }
                }}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="any">
                  Any Available Staff ({eligibleStaff.length} eligible)
                </option>
                {eligibleStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.display_name} {st.professional_title ? `— ${st.professional_title}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Booking Date Picker */}
            <div>
              <label
                htmlFor="booking-date"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Booking Date (Business Local)
              </label>
              <input
                type="date"
                id="booking-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* 4. Slot Granularity */}
            <div>
              <label
                htmlFor="slot-interval"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Slot Interval
              </label>
              <select
                id="slot-interval"
                value={slotInterval}
                onChange={(e) => setSlotInterval(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value={15}>15 minutes (Standard)</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Main Results View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Slot Groups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Date: <span className="font-mono">{selectedDate}</span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Mode:{" "}
                <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                  {staffPreference === "any" ? "Any Available Staff" : "Specific Staff"}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isPending ? (
                <Badge variant="outline" className="animate-pulse">
                  Calculating slots...
                </Badge>
              ) : (
                <Badge
                  variant={
                    availability && availability.totalSlotsCount > 0
                      ? "default"
                      : "secondary"
                  }
                  className="font-medium"
                >
                  {availability?.totalSlotsCount || 0} Slots Available
                </Badge>
              )}
            </div>
          </div>

          {/* Skeletons when pending */}
          {isPending && (
            <div className="space-y-4">
              <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            </div>
          )}

          {/* Loaded Slots Display */}
          {!isPending && availability && availability.totalSlotsCount > 0 && (
            <div className="space-y-6">
              {/* Morning Slots */}
              {morningSlots.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Morning (Before 12:00 PM)
                    </h3>
                    <span className="text-xs text-zinc-400">
                      {morningSlots.length} slots
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {morningSlots.map((slot) => {
                      const isSelected = selectedSlot?.startsAt === slot.startsAt;
                      return (
                        <button
                          key={slot.startsAt}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 text-blue-900 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm"
                              : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="text-sm font-bold font-mono">
                            {formatSlotTime12h(slot.localTime)}
                          </span>
                          {staffPreference === "any" && (
                            <span className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                              {slot.availableStaffIds.length} staff
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Afternoon Slots */}
              {afternoonSlots.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Afternoon (12:00 PM – 5:00 PM)
                    </h3>
                    <span className="text-xs text-zinc-400">
                      {afternoonSlots.length} slots
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {afternoonSlots.map((slot) => {
                      const isSelected = selectedSlot?.startsAt === slot.startsAt;
                      return (
                        <button
                          key={slot.startsAt}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 text-blue-900 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm"
                              : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="text-sm font-bold font-mono">
                            {formatSlotTime12h(slot.localTime)}
                          </span>
                          {staffPreference === "any" && (
                            <span className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                              {slot.availableStaffIds.length} staff
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evening Slots */}
              {eveningSlots.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Evening (5:00 PM onwards)
                    </h3>
                    <span className="text-xs text-zinc-400">
                      {eveningSlots.length} slots
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {eveningSlots.map((slot) => {
                      const isSelected = selectedSlot?.startsAt === slot.startsAt;
                      return (
                        <button
                          key={slot.startsAt}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 text-blue-900 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-sm"
                              : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="text-sm font-bold font-mono">
                            {formatSlotTime12h(slot.localTime)}
                          </span>
                          {staffPreference === "any" && (
                            <span className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                              {slot.availableStaffIds.length} staff
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isPending && availability && availability.totalSlotsCount === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-10 text-center bg-white dark:bg-zinc-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <Clock className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No Bookable Slots on this Date
              </h4>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                There are no open slots matching this service, staff preference, and date.
                Possible reasons include salon closed days, staff day off or leave, scheduled breaks,
                minimum booking notice, or existing conflicting appointments.
              </p>
            </div>
          )}
        </div>

        {/* Right Col: Slot Detail Inspector */}
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-sm">Slot Details & Capacity Inspector</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Inspect capacity reservation, occupied boundaries, and staff eligibility.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {selectedSlot ? (
                <div className="space-y-3.5 text-xs">
                  <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/30 p-3 border border-blue-200/60 dark:border-blue-900/40">
                    <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm font-mono">
                      {formatSlotTime12h(selectedSlot.localTime)} ({selectedSlot.localTime} local)
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 font-mono">
                      UTC Instant: {selectedSlot.startsAt}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Service Duration:</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 font-mono">
                        {availability?.durationMinutes} mins
                      </span>
                    </div>

                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Buffer After Service:</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 font-mono">
                        {availability?.bufferMinutes} mins
                      </span>
                    </div>

                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Total Occupied Capacity:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                        {availability?.metadata.totalOccupiedMinutes} mins
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Available Staff for this Slot ({selectedSlot.availableStaffIds.length}):
                    </p>
                    <div className="space-y-1.5">
                      {selectedSlot.availableStaffIds.map((stId) => (
                        <div
                          key={stId}
                          className="flex items-center gap-2 rounded-md bg-zinc-50 dark:bg-zinc-800/60 p-2 text-[11px]"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {getStaffName(stId)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 text-[11px] text-zinc-500 leading-relaxed">
                    <p className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                      <Layers className="h-3.5 w-3.5 text-blue-600" />
                      Atomic Confirmation Note
                    </p>
                    <p className="mt-1">
                      Slots in this preview reflect live database state at query time. Final appointment booking reserves capacity atomically using BookPilot AI&apos;s Phase 1E-A database RPC.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Click any available timeslot to inspect its exact occupied capacity and assigned staff.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Notice Policy Card */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-500">
                Active Booking Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Minimum Notice Window:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {availability?.metadata.minNoticeHours ?? 2} hours
                </span>
              </div>
              <div className="flex justify-between">
                <span>Maximum Advance Booking:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {availability?.metadata.maxAdvanceDays ?? 60} days
                </span>
              </div>
              <div className="flex justify-between">
                <span>Timezone:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 font-mono">
                  {businessTimezone}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
