"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  ArrowLeft,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceWithCategory } from "@/features/services/types";
import type { StaffWithServices } from "@/features/staff/types";
import type { Customer, Appointment } from "@/features/appointments/types";
import type { AvailabilityResponse, AvailabilitySlot, StaffPreference } from "@/features/availability/types";
import { getAppointmentAvailability } from "@/features/availability/server";
import { assignStaffForAnyAvailableSlot } from "@/features/availability/engine";
import { createAppointment, searchCustomers } from "@/features/appointments/server";

interface ManualBookingWizardProps {
  businessId: string;
  businessSlug: string;
  businessTimezone: string;
  currency: string;
  services: ServiceWithCategory[];
  staff: StaffWithServices[];
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (appointment: Appointment) => void;
  initialDate?: string;
  initialCustomer?: { id: string; name: string; phone?: string | null; email?: string | null } | null;
}

export function ManualBookingWizard(props: ManualBookingWizardProps) {
  if (!props.isOpen) return null;
  return <ManualBookingWizardInner {...props} />;
}

function ManualBookingWizardInner({
  businessId,
  businessSlug,
  businessTimezone,
  currency,
  services,
  staff,
  onClose,
  onBookingSuccess,
  initialDate,
  initialCustomer,
}: ManualBookingWizardProps) {
  // Wizard Step: 1 = Customer, 2 = Service & Staff, 3 = Date & Slot, 4 = Review & Confirm
  const [step, setStep] = useState<number>(initialCustomer ? 2 : 1);

  // Step 1: Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialCustomer
      ? {
          id: initialCustomer.id,
          business_id: businessId,
          name: initialCustomer.name,
          phone: initialCustomer.phone || null,
          email: initialCustomer.email || null,
          notes: null,
          created_at: "",
          updated_at: "",
        }
      : null
  );

  // New Customer Form Fields
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Step 2: Service & Staff
  const activeServices = services.filter((s) => s.is_active && !s.is_archived);
  const activeStaff = staff.filter((s) => s.is_active && !s.is_archived);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    activeServices[0]?.id || ""
  );
  const [staffPreference, setStaffPreference] = useState<StaffPreference>("any");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  // Step 3: Date & Slot
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [slotInterval, setSlotInterval] = useState<number>(15);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [isLoadingAvailability, startAvailabilityTransition] = useTransition();
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Step 4: Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filter staff who can perform the chosen service
  const eligibleStaff = activeStaff.filter((st) =>
    st.service_ids?.includes(selectedServiceId)
  );

  // Customer debounced search
  useEffect(() => {
    if (isNewCustomerMode) return;
    const timer = setTimeout(async () => {
      if (customerSearch.trim().length >= 1) {
        setIsSearchingCustomers(true);
        const res = await searchCustomers(businessSlug, customerSearch, 6);
        if (res.success) {
          setCustomerResults(res.customers);
        }
        setIsSearchingCustomers(false);
      } else {
        setCustomerResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, businessSlug, isNewCustomerMode]);

  // Fetch availability when reaching Step 3 or when controls change
  const loadAvailability = (
    srvId = selectedServiceId,
    pref = staffPreference,
    stfId = selectedStaffId,
    dt = selectedDate,
    inv = slotInterval
  ) => {
    if (!srvId || !dt) return;

    startAvailabilityTransition(async () => {
      setAvailabilityError(null);
      setSelectedSlot(null);

      const res = await getAppointmentAvailability({
        businessSlug,
        serviceId: srvId,
        date: dt,
        staffId: pref === "specific" && stfId ? stfId : null,
        staffPreference: pref,
        slotIntervalMinutes: inv,
      });

      if (!res.success) {
        setAvailabilityError(res.error || "Failed to calculate appointment slots.");
        setAvailability(null);
      } else if (res.data) {
        setAvailability(res.data);
      }
    });
  };

  useEffect(() => {
    if (step === 3) {
      loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedServiceId, staffPreference, selectedStaffId, selectedDate, slotInterval]);

  // Selected Service object
  const currentService = activeServices.find((s) => s.id === selectedServiceId);

  // Compute Assigned Staff
  let assignedStaffName = "Any Available Staff";
  let assignedStaffProfileId: string | null = null;

  if (staffPreference === "specific" && selectedStaffId) {
    const found = activeStaff.find((s) => s.id === selectedStaffId);
    assignedStaffName = found?.display_name || "Assigned Staff";
    assignedStaffProfileId = selectedStaffId;
  } else if (selectedSlot && selectedSlot.availableStaffIds.length > 0) {
    assignedStaffProfileId = assignStaffForAnyAvailableSlot(
      selectedSlot.availableStaffIds,
      activeStaff
    );
    const found = activeStaff.find((s) => s.id === assignedStaffProfileId);
    assignedStaffName = found?.display_name || "Auto-assigned Staff";
  }

  // Format Time Helper
  const formatSlotTime12h = (time24: string) => {
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const formatPrice = (minor: number) => {
    return (minor / 100).toFixed(2);
  };

  // Submission handler
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !currentService) return;

    if (!selectedCustomer && !isNewCustomerMode) {
      setSubmitError("Please select or create a customer.");
      setStep(1);
      return;
    }

    if (isNewCustomerMode) {
      if (!newCustomerName.trim()) {
        setSubmitError("Customer name is required.");
        setStep(1);
        return;
      }
      if (!newCustomerPhone.trim() && !newCustomerEmail.trim()) {
        setSubmitError("At least one contact method (phone or email) is required.");
        setStep(1);
        return;
      }
    }

    // Resolve assigned staff ID
    const finalStaffId =
      assignedStaffProfileId ||
      selectedStaffId ||
      assignStaffForAnyAvailableSlot(selectedSlot.availableStaffIds, activeStaff);

    if (!finalStaffId) {
      setSubmitError("No eligible staff available to fulfill this slot.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      business_id: businessId,
      service_id: currentService.id,
      staff_id: finalStaffId,
      starts_at: selectedSlot.startsAt,
      customer_id: selectedCustomer ? selectedCustomer.id : undefined,
      customer_name: isNewCustomerMode ? newCustomerName.trim() : undefined,
      customer_email: isNewCustomerMode && newCustomerEmail.trim() ? newCustomerEmail.trim() : undefined,
      customer_phone: isNewCustomerMode && newCustomerPhone.trim() ? newCustomerPhone.trim() : undefined,
      notes: customerNotes.trim() || undefined,
    };

    const res = await createAppointment(payload, businessSlug);

    setIsSubmitting(false);

    if (!res.success || !res.data) {
      setSubmitError(res.error || "Failed to create appointment.");
      // If slot conflict occurred, jump back to Step 3 and refresh slots
      if (res.code === "SLOT_TAKEN" || res.code === "CONFLICT") {
        setStep(3);
        loadAvailability();
      }
      return;
    }

    // Success!
    onBookingSuccess(res.data);
    onClose();
  };

  // Group slots
  const morningSlots = availability?.slots.filter((s) => s.localTime < "12:00") || [];
  const afternoonSlots =
    availability?.slots.filter((s) => s.localTime >= "12:00" && s.localTime < "17:00") || [];
  const eveningSlots = availability?.slots.filter((s) => s.localTime >= "17:00") || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-2xl max-h-[92vh] rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-800/40 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                New Appointment Booking
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Guided 4-step booking with real-time slot and double-booking verification.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex border-b border-zinc-100 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900 text-xs font-semibold flex-shrink-0">
          {[
            { id: 1, label: "Customer" },
            { id: 2, label: "Service & Staff" },
            { id: 3, label: "Date & Time" },
            { id: 4, label: "Review & Confirm" },
          ].map((item) => (
            <div
              key={item.id}
              className={`flex-1 flex items-center gap-2 ${
                step === item.id
                  ? "text-blue-600 dark:text-blue-400"
                  : step > item.id
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  step === item.id
                    ? "bg-blue-600 text-white"
                    : step > item.id
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                }`}
              >
                {step > item.id ? "✓" : item.id}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {submitError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1: CUSTOMER */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Select or Register Customer
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCustomerMode(!isNewCustomerMode);
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
                >
                  {isNewCustomerMode ? (
                    <>
                      <Search className="h-3 w-3" /> Search Existing Customers
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" /> + Add New Customer
                    </>
                  )}
                </button>
              </div>

              {/* Chosen customer badge */}
              {selectedCustomer && !isNewCustomerMode && (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
                        {selectedCustomer.name}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {selectedCustomer.phone || selectedCustomer.email || "No direct contact"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs"
                  >
                    Change
                  </Button>
                </div>
              )}

              {/* Search mode */}
              {!selectedCustomer && !isNewCustomerMode && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search customers by name, phone or email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                    {isSearchingCustomers && (
                      <RefreshCw className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-zinc-400" />
                    )}
                  </div>

                  {customerResults.length > 0 ? (
                    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                      {customerResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCustomer(c)}
                          className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {c.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {c.phone ? `Phone: ${c.phone}` : ""}
                              {c.phone && c.email ? " • " : ""}
                              {c.email ? `Email: ${c.email}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            Select
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : customerSearch.trim().length >= 1 && !isSearchingCustomers ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
                      No matching customers found.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomerMode(true);
                          setNewCustomerName(customerSearch.trim());
                        }}
                        className="font-semibold text-blue-600 underline"
                      >
                        Create customer &ldquo;{customerSearch}&rdquo;
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">
                      Type at least 1 character to search existing salon customer directory.
                    </p>
                  )}
                </div>
              )}

              {/* New Customer Form */}
              {isNewCustomerMode && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/30 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Phone Number (Mobile)
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 07123 456789"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. john@example.com"
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    * Either phone number or email address is required to register a customer.
                  </p>
                </div>
              )}

              {/* Booking Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Optional Booking Notes (Internal)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Phone booking / walk-in, requests styling with clippers..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          {/* STEP 2: SERVICE & STAFF */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  1. Select Service
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto">
                  {activeServices.map((srv) => {
                    const isSelected = selectedServiceId === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`rounded-xl border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {srv.name}
                          </p>
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {currency} {formatPrice(srv.price_amount)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                          <span>{srv.duration_minutes} mins</span>
                          {srv.buffer_minutes > 0 && (
                            <>
                              <span>•</span>
                              <span>+{srv.buffer_minutes}m cleanup buffer</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  2. Choose Staff Preference
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setStaffPreference("any");
                      setSelectedStaffId("");
                    }}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      staffPreference === "any"
                        ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      Any Available Staff
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Aggregates bookable slots across {eligibleStaff.length} eligible staff profiles.
                    </p>
                  </div>

                  {eligibleStaff.map((st) => {
                    const isSelected =
                      staffPreference === "specific" && selectedStaffId === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          setStaffPreference("specific");
                          setSelectedStaffId(st.id);
                        }}
                        className={`rounded-xl border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {st.display_name}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {st.professional_title || "Stylist / Barber"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DATE & AVAILABLE SLOTS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-0.5">
                      Booking Date ({businessTimezone})
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-0.5">
                      Interval
                    </label>
                    <select
                      value={slotInterval}
                      onChange={(e) => setSlotInterval(parseInt(e.target.value, 10))}
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value={15}>15 mins</option>
                      <option value={30}>30 mins</option>
                      <option value={60}>60 mins</option>
                    </select>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAvailability()}
                  disabled={isLoadingAvailability}
                  className="gap-1.5 text-xs self-end sm:self-center"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isLoadingAvailability ? "animate-spin" : ""}`}
                  />
                  <span>Refresh Slots</span>
                </Button>
              </div>

              {availabilityError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {availabilityError}
                </div>
              )}

              {/* Slot Results */}
              {isLoadingAvailability ? (
                <div className="space-y-3 py-6">
                  <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                </div>
              ) : availability && availability.totalSlotsCount > 0 ? (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {morningSlots.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Morning
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {morningSlots.map((slot) => {
                          const isSelected = selectedSlot?.startsAt === slot.startsAt;
                          return (
                            <button
                              key={slot.startsAt}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2 rounded-lg border text-center transition-all ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white font-bold"
                                  : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              <span className="text-xs font-mono">
                                {formatSlotTime12h(slot.localTime)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {afternoonSlots.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Afternoon
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {afternoonSlots.map((slot) => {
                          const isSelected = selectedSlot?.startsAt === slot.startsAt;
                          return (
                            <button
                              key={slot.startsAt}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2 rounded-lg border text-center transition-all ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white font-bold"
                                  : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              <span className="text-xs font-mono">
                                {formatSlotTime12h(slot.localTime)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {eveningSlots.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Evening
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {eveningSlots.map((slot) => {
                          const isSelected = selectedSlot?.startsAt === slot.startsAt;
                          return (
                            <button
                              key={slot.startsAt}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2 rounded-lg border text-center transition-all ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white font-bold"
                                  : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              <span className="text-xs font-mono">
                                {formatSlotTime12h(slot.localTime)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-800">
                  <Clock className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    No Slots Available on {selectedDate}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    Check if salon is closed on this day, staff is on leave/break, or the date is outside the allowed booking window.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Appointment Review
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500">Customer:</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      {selectedCustomer
                        ? selectedCustomer.name
                        : newCustomerName || "Customer Name"}
                    </p>
                    <p className="text-zinc-500 text-[11px]">
                      {selectedCustomer
                        ? selectedCustomer.phone || selectedCustomer.email
                        : newCustomerPhone || newCustomerEmail}
                    </p>
                  </div>

                  <div>
                    <span className="text-zinc-500">Service:</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      {currentService?.name}
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                      {currency} {currentService ? formatPrice(currentService.price_amount) : "0.00"}
                    </p>
                  </div>

                  <div>
                    <span className="text-zinc-500">Assigned Staff:</span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {assignedStaffName}
                    </p>
                  </div>

                  <div>
                    <span className="text-zinc-500">Date & Start Time:</span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                      {selectedDate} @ {selectedSlot ? formatSlotTime12h(selectedSlot.localTime) : ""}
                    </p>
                  </div>

                  <div>
                    <span className="text-zinc-500">Service Duration:</span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {currentService?.duration_minutes} mins
                      {currentService?.buffer_minutes ? ` (+${currentService.buffer_minutes}m buffer)` : ""}
                    </p>
                  </div>

                  <div>
                    <span className="text-zinc-500">Timezone:</span>
                    <p className="font-mono text-zinc-800 dark:text-zinc-200">
                      {businessTimezone}
                    </p>
                  </div>
                </div>

                {customerNotes && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 text-xs">
                    <span className="text-zinc-500">Notes:</span>
                    <p className="text-zinc-800 dark:text-zinc-200 italic mt-0.5">
                      &ldquo;{customerNotes}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-blue-50/80 p-3 text-[11px] text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>
                  Capacity will be atomically reserved in PostgreSQL using Bookzello&apos;s concurrency-safe RPC.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-800/40 flex-shrink-0">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              size="sm"
              onClick={() => {
                if (step === 1) {
                  if (!selectedCustomer && !isNewCustomerMode) {
                    setSubmitError("Please select a customer or switch to Add New Customer.");
                    return;
                  }
                  if (isNewCustomerMode) {
                    if (!newCustomerName.trim()) {
                      setSubmitError("Customer name is required.");
                      return;
                    }
                    if (!newCustomerPhone.trim() && !newCustomerEmail.trim()) {
                      setSubmitError("At least one contact method (phone or email) is required.");
                      return;
                    }
                  }
                  setSubmitError(null);
                  setStep(2);
                } else if (step === 2) {
                  if (!selectedServiceId) {
                    setSubmitError("Please select a service.");
                    return;
                  }
                  setSubmitError(null);
                  setStep(3);
                } else if (step === 3) {
                  if (!selectedSlot) {
                    setSubmitError("Please click an available timeslot before continuing.");
                    return;
                  }
                  setSubmitError(null);
                  setStep(4);
                }
              }}
              className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Reserving Capacity...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Appointment</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
