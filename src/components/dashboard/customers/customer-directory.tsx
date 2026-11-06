"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import {
  User,
  Search,
  Phone,
  Mail,
  X,
  History,
  AlertCircle,
  Loader2,
  UserPlus,
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerWithMetrics, CustomerProfileWithHistory } from "@/features/appointments/types";
import type { StaffWithServices } from "@/features/staff/types";
import type { ServiceWithCategory } from "@/features/services/types";
import {
  listCustomersWithMetrics,
  getCustomerProfileWithAppointments,
  createCustomerDirect,
  updateCustomerNotes,
} from "@/features/appointments/server";
import { ManualBookingWizard } from "../appointments/manual-booking-wizard";

interface CustomerDirectoryProps {
  businessId: string;
  businessSlug: string;
  businessTimezone: string;
  currency: string;
  initialCustomers: CustomerWithMetrics[];
  initialTotalCount?: number;
  staffList: StaffWithServices[];
  servicesList: ServiceWithCategory[];
}

export function CustomerDirectory({
  businessId,
  businessSlug,
  businessTimezone,
  currency,
  initialCustomers,
  initialTotalCount = 0,
  staffList,
  servicesList,
}: CustomerDirectoryProps) {
  const [customers, setCustomers] = useState<CustomerWithMetrics[]>(initialCustomers);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount || initialCustomers.length);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isSearching, setIsSearching] = useState(false);
  const [, startTransition] = useTransition();

  // Create Customer Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Profile Slide-over State
  const [selectedProfile, setSelectedProfile] = useState<CustomerProfileWithHistory | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Private Notes Editor State inside Profile Slide-over
  const [notesInput, setNotesInput] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Visit History Filter Tabs: 'all' | 'upcoming' | 'completed' | 'cancelled'
  const [historyTab, setHistoryTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  // Booking Wizard Trigger from Customer
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardCustomer, setWizardCustomer] = useState<{ id: string; name: string; phone?: string | null; email?: string | null } | null>(null);

  // Format helpers
  const formatPrice = (minorUnits?: number | null) => {
    if (typeof minorUnits !== "number") return "£0.00";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
    }).format(minorUnits / 100);
  };

  const formatDateDisplay = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: businessTimezone,
      });
    } catch {
      return isoString;
    }
  };

  const formatTimeDisplay = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: businessTimezone,
      });
    } catch {
      return isoString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";
      case "pending":
        return "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300";
      case "completed":
        return "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300";
      case "cancelled":
        return "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 line-through";
      case "no_show":
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 line-through";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-300";
    }
  };

  // Perform server-side search and page fetch
  const fetchCustomerPage = useCallback(
    async (targetPage: number, query: string) => {
      setIsSearching(true);
      try {
        const res = await listCustomersWithMetrics(businessSlug, {
          search: query.trim() || undefined,
          page: targetPage,
          limit: pageSize,
        });

        if (res.success && res.customers) {
          setCustomers(res.customers);
          setTotalCount(res.totalCount);
          setPage(targetPage);
        }
      } catch (err) {
        console.error("Error searching customers:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [businessSlug]
  );

  // Debounced server query on search input change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomerPage(1, searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchCustomerPage]);

  // Load customer profile with appointments
  const handleOpenProfile = async (customerId: string) => {
    setIsLoadingProfile(true);
    setIsProfileOpen(true);
    setNotesMessage(null);
    setHistoryTab("all");

    try {
      const res = await getCustomerProfileWithAppointments(businessSlug, customerId);
      if (res.success && res.data) {
        setSelectedProfile(res.data);
        setNotesInput(res.data.customer.notes || "");
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Save private internal notes
  const handleSaveNotes = async () => {
    if (!selectedProfile) return;
    setIsSavingNotes(true);
    setNotesMessage(null);

    try {
      const res = await updateCustomerNotes(
        businessSlug,
        selectedProfile.customer.id,
        notesInput
      );

      if (res.success && res.customer) {
        setSelectedProfile({
          ...selectedProfile,
          customer: {
            ...selectedProfile.customer,
            notes: res.customer.notes,
          },
        });
        setNotesMessage({ type: "success", text: "Notes saved securely." });
      } else {
        setNotesMessage({
          type: "error",
          text: res.error || "Failed to save customer notes.",
        });
      }
    } catch {
      setNotesMessage({ type: "error", text: "Unexpected error saving notes." });
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Categorize appointments for history tabs
  const [referenceTime] = useState(() => Date.now());
  const appointments = useMemo(
    () => selectedProfile?.appointments || [],
    [selectedProfile?.appointments]
  );

  const upcomingAppts = useMemo(() => {
    return appointments.filter(
      (a) =>
        (a.status === "confirmed" || a.status === "pending") &&
        new Date(a.starts_at).getTime() > referenceTime
    );
  }, [appointments, referenceTime]);

  const completedAppts = useMemo(() => {
    return appointments.filter((a) => a.status === "completed");
  }, [appointments]);

  const cancelledAppts = useMemo(() => {
    return appointments.filter((a) => a.status === "cancelled" || a.status === "no_show");
  }, [appointments]);

  const displayedAppts = useMemo(() => {
    switch (historyTab) {
      case "upcoming":
        return upcomingAppts;
      case "completed":
        return completedAppts;
      case "cancelled":
        return cancelledAppts;
      default:
        return appointments;
    }
  }, [historyTab, appointments, upcomingAppts, completedAppts, cancelledAppts]);

  // Submit new customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError("Customer name is required.");
      return;
    }
    if (!createPhone.trim() && !createEmail.trim()) {
      setCreateError("Please provide either a phone number or an email address.");
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      const res = await createCustomerDirect(businessSlug, {
        name: createName.trim(),
        phone: createPhone.trim() || undefined,
        email: createEmail.trim() || undefined,
        notes: createNotes.trim() || undefined,
      });

      if (!res.success) {
        setCreateError(res.error || "Failed to create customer profile.");
      } else if (res.customer) {
        const newCustomer: CustomerWithMetrics = {
          ...res.customer,
          totalVisits: 0,
          cancelledVisits: 0,
          lastVisitDate: null,
          upcomingVisitDate: null,
        };
        setCustomers((prev) => [newCustomer, ...prev]);
        setTotalCount((prev) => prev + 1);
        setIsCreateOpen(false);
        setCreateName("");
        setCreatePhone("");
        setCreateEmail("");
        setCreateNotes("");
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error creating customer.");
    } finally {
      setIsCreating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Customer Directory & CRM
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage salon client profiles, private internal notes, and chronological visit histories.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700 h-9"
        >
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-8 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
          <span>
            Total: <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span> client{totalCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Customer Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase tracking-wider dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 font-semibold">
              <tr>
                <th className="py-3 px-4 min-w-[180px]">Customer Name</th>
                <th className="py-3 px-4 min-w-[170px]">Contact Details</th>
                <th className="py-3 px-4 text-center w-24">Visits</th>
                <th className="py-3 px-4 text-center w-24">Cancelled</th>
                <th className="py-3 px-4 min-w-[120px]">Last Visit</th>
                <th className="py-3 px-4 text-right min-w-[140px] sticky right-0 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-xs shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {customers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => handleOpenProfile(cust.id)}
                  className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase">
                        {cust.name.slice(0, 2)}
                      </div>
                      <span>{cust.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                      {cust.phone && (
                        <div className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-zinc-400" />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                      {cust.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-zinc-400" />
                          <span>{cust.email}</span>
                        </div>
                      )}
                      {!cust.phone && !cust.email && (
                        <span className="text-zinc-400 italic">No contact stored</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant="secondary" className="font-medium">
                      {cust.totalVisits} visit{cust.totalVisits === 1 ? "" : "s"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-center text-zinc-500">
                    {cust.cancelledVisits}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {formatDateDisplay(cust.lastVisitDate)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px] sticky right-0 bg-white/95 dark:bg-zinc-900/95 group-hover:bg-zinc-50/95 dark:group-hover:bg-zinc-800/95 backdrop-blur-xs shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenProfile(cust.id)}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Profile
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWizardCustomer({
                            id: cust.id,
                            name: cust.name,
                            phone: cust.phone,
                            email: cust.email,
                          });
                          setIsWizardOpen(true);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        + Book
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && !isSearching && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 text-xs">
                    {searchQuery
                      ? `No customers found matching "${searchQuery}". Click "Add Customer" to create a new profile.`
                      : "No customer records registered yet. Customers are automatically saved when bookings occur, or can be added manually above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing page <span className="font-semibold text-zinc-900 dark:text-zinc-100">{page}</span> of{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isSearching}
                onClick={() => fetchCustomerPage(page - 1, searchQuery)}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isSearching}
                onClick={() => fetchCustomerPage(page + 1, searchQuery)}
                className="h-7 px-2.5 text-xs gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Add Customer Profile
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 pt-4 text-xs">
              {createError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="e.g. +44 7700 900077"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. sarah.jenkins@example.com"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="e.g. Preferred styling, color formula, allergies"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving Profile...
                    </>
                  ) : (
                    "Save Customer"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE & VISIT HISTORY SLIDE-OVER */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/40 backdrop-blur-sm">
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
              {/* Profile Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Customer Profile & History
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setSelectedProfile(null);
                  }}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoadingProfile || !selectedProfile ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
                    <span>Loading customer history...</span>
                  </div>
                ) : (
                  <>
                    {/* Customer Summary Card */}
                    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                          {selectedProfile.customer.name}
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setWizardCustomer({
                              id: selectedProfile.customer.id,
                              name: selectedProfile.customer.name,
                              phone: selectedProfile.customer.phone,
                              email: selectedProfile.customer.email,
                            });
                            setIsWizardOpen(true);
                          }}
                          className="h-7 text-xs bg-blue-600 text-white hover:bg-blue-700"
                        >
                          + New Booking
                        </Button>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {selectedProfile.customer.phone && (
                          <div className="flex items-center gap-2 font-mono">
                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                            <a href={`tel:${selectedProfile.customer.phone}`} className="hover:underline">
                              {selectedProfile.customer.phone}
                            </a>
                          </div>
                        )}
                        {selectedProfile.customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-zinc-400" />
                            <a href={`mailto:${selectedProfile.customer.email}`} className="hover:underline">
                              {selectedProfile.customer.email}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Lifetime Stats */}
                      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-zinc-200/80 pt-3 text-center dark:border-zinc-800">
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase font-medium">Completed</div>
                          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {selectedProfile.metrics.completedVisits}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase font-medium">Upcoming</div>
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {upcomingAppts.length}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase font-medium" title="Estimated service value from completed appointments (no payment deposits)">
                            Est. Service Value
                          </div>
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatPrice(selectedProfile.metrics.totalSpendMinor)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase font-medium">Cancelled</div>
                          <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                            {selectedProfile.metrics.cancelledVisits}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Private Internal Notes Card */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-zinc-500" />
                          Internal Private Notes
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <span>Team-only</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Private to your salon team. Notes are never shown or disclosed to clients.
                      </p>

                      <textarea
                        rows={3}
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        placeholder="Add private styling preferences, formula notes, sensitivities, or special instructions..."
                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50/50 p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {notesMessage && (
                            <span
                              className={`text-[11px] font-medium flex items-center gap-1 ${
                                notesMessage.type === "success"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {notesMessage.type === "success" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              {notesMessage.text}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSavingNotes}
                          onClick={handleSaveNotes}
                          className="h-7 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          {isSavingNotes ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Saving...
                            </>
                          ) : (
                            "Save Notes"
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Appointment History with Categorized Tabs */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-blue-600" />
                          Appointment History ({appointments.length})
                        </span>
                      </div>

                      {/* History Navigation Tabs */}
                      <div className="flex items-center gap-1.5 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                        {[
                          { id: "all", label: "All", count: appointments.length },
                          { id: "upcoming", label: "Upcoming", count: upcomingAppts.length },
                          { id: "completed", label: "Completed", count: completedAppts.length },
                          { id: "cancelled", label: "Cancelled", count: cancelledAppts.length },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setHistoryTab(tab.id as typeof historyTab)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              historyTab === tab.id
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {tab.label} ({tab.count})
                          </button>
                        ))}
                      </div>

                      {/* Filtered Appointments List */}
                      <div className="space-y-2.5">
                        {displayedAppts.map((app) => (
                          <div
                            key={app.id}
                            className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800 space-y-1.5 bg-white dark:bg-zinc-900/60"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {app.service?.name || app.service_name_snapshot || "Service"}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getStatusColor(
                                  app.status
                                )}`}
                              >
                                {app.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-zinc-400" />
                                {formatDateDisplay(app.starts_at)} • {formatTimeDisplay(app.starts_at)}
                              </span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                {formatPrice(app.price_minor_snapshot)}
                              </span>
                            </div>

                            <div className="text-[11px] text-zinc-500">
                              Specialist: {app.staff?.display_name || "Any Staff"}
                            </div>

                            {app.notes && (
                              <div className="rounded bg-zinc-50 p-1.5 text-[11px] text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400">
                                Note: {app.notes}
                              </div>
                            )}
                          </div>
                        ))}

                        {displayedAppts.length === 0 && (
                          <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                            {historyTab === "upcoming"
                              ? "No upcoming appointments scheduled for this client."
                              : historyTab === "completed"
                              ? "No completed visits recorded yet."
                              : historyTab === "cancelled"
                              ? "No cancelled or no-show appointments."
                              : "No appointments on record for this customer."}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Booking Wizard Modal from Customer Profile */}
      <ManualBookingWizard
        businessId={businessId}
        businessSlug={businessSlug}
        businessTimezone={businessTimezone}
        currency={currency}
        services={servicesList}
        staff={staffList}
        isOpen={isWizardOpen}
        initialCustomer={wizardCustomer}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardCustomer(null);
        }}
        onBookingSuccess={() => {
          setIsWizardOpen(false);
          // Reload customers
          startTransition(async () => {
            fetchCustomerPage(page, searchQuery);
          });
        }}
      />
    </div>
  );
}
