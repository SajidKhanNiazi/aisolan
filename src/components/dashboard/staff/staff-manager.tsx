"use client";

import { useState } from "react";
import type { StaffWithServices } from "@/features/staff/types";
import type { ServiceWithCategory } from "@/features/services/types";
import {
  createStaffProfile,
  updateStaffProfile,
  archiveStaffProfile,
  restoreStaffProfile,
  toggleStaffStatus,
  updateStaffServiceAssignments,
} from "@/features/staff/server";
import {
  Plus,
  Users,
  Search,
  Calendar,
  Clock,
  Scissors,
  CheckCircle,
  XCircle,
  Edit2,
  Archive,
  RotateCcw,
  AlertCircle,
  X,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";

interface StaffManagerProps {
  initialStaff: StaffWithServices[];
  allServices: ServiceWithCategory[];
  businessId: string;
  businessSlug: string;
}

export function StaffManager({
  initialStaff,
  allServices,
  businessId,
  businessSlug,
}: StaffManagerProps) {
  const [staffList, setStaffList] = useState<StaffWithServices[]>(initialStaff);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("all");

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithServices | null>(null);
  const [assigningServicesStaff, setAssigningServicesStaff] = useState<StaffWithServices | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StaffWithServices | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Service Assignment State
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setDisplayName("");
    setProfessionalTitle("");
    setBio("");
    setContactEmail("");
    setContactPhone("");
    setIsActive(true);
    setEditingStaff(null);
    setErrorMessage(null);
  };

  const openEditModal = (staff: StaffWithServices) => {
    setEditingStaff(staff);
    setDisplayName(staff.display_name);
    setProfessionalTitle(staff.professional_title || "");
    setBio(staff.bio || "");
    setContactEmail(staff.contact_email || "");
    setContactPhone(staff.contact_phone || "");
    setIsActive(staff.is_active);
    setErrorMessage(null);
  };

  const openAssignModal = (staff: StaffWithServices) => {
    if (!staff.is_active || staff.is_archived) {
      setErrorMessage("Cannot assign services to an inactive or archived staff member.");
      return;
    }
    setAssigningServicesStaff(staff);
    setSelectedServiceIds([...staff.service_ids]);
    setErrorMessage(null);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      display_name: displayName.trim(),
      professional_title: professionalTitle.trim() || null,
      bio: bio.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      is_active: isActive,
    };

    try {
      if (editingStaff) {
        const res = await updateStaffProfile(businessId, editingStaff.id, payload, businessSlug);
        if (!res.success || !res.staff) {
          setErrorMessage(res.error || "Failed to update staff profile");
          setIsSaving(false);
          return;
        }
        setStaffList((prev) =>
          prev.map((s) => (s.id === editingStaff.id ? { ...s, ...res.staff! } : s))
        );
        setSuccessMessage(`Staff member "${res.staff.display_name}" updated.`);
      } else {
        const res = await createStaffProfile(businessId, payload, businessSlug);
        if (!res.success || !res.staff) {
          setErrorMessage(res.error || "Failed to create staff profile");
          setIsSaving(false);
          return;
        }
        const newStaff: StaffWithServices = {
          ...res.staff,
          service_ids: [],
          assigned_services_count: 0,
        };
        setStaffList((prev) => [...prev, newStaff]);
        setSuccessMessage(`Staff member "${res.staff.display_name}" created.`);
      }
      resetForm();
      setIsAddStaffOpen(false);
    } catch {
      setErrorMessage("An unexpected error occurred while saving the staff profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveServiceAssignments = async () => {
    if (!assigningServicesStaff) return;
    setIsSaving(true);
    setErrorMessage(null);

    const res = await updateStaffServiceAssignments(
      businessId,
      assigningServicesStaff.id,
      selectedServiceIds,
      businessSlug
    );

    if (!res.success) {
      setErrorMessage(res.error || "Failed to update service assignments");
      setIsSaving(false);
      return;
    }

    setStaffList((prev) =>
      prev.map((s) =>
        s.id === assigningServicesStaff.id
          ? {
              ...s,
              service_ids: selectedServiceIds,
              assigned_services_count: selectedServiceIds.length,
            }
          : s
      )
    );

    setSuccessMessage(`Updated assigned services for "${assigningServicesStaff.display_name}".`);
    setAssigningServicesStaff(null);
    setIsSaving(false);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    setErrorMessage(null);
    const res = await archiveStaffProfile(businessId, archiveTarget.id, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to archive staff member");
      setIsArchiving(false);
      return;
    }
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === archiveTarget.id ? { ...s, is_archived: true, is_active: false } : s
      )
    );
    setSuccessMessage(`Staff member "${archiveTarget.display_name}" archived.`);
    setArchiveTarget(null);
    setIsArchiving(false);
  };

  const handleRestore = async (staff: StaffWithServices) => {
    setIsSaving(true);
    setErrorMessage(null);
    const res = await restoreStaffProfile(businessId, staff.id, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to restore staff profile");
      setIsSaving(false);
      return;
    }
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === staff.id ? { ...s, is_archived: false, is_active: true } : s
      )
    );
    setSuccessMessage(`Staff member "${staff.display_name}" restored to team directory.`);
    setIsSaving(false);
  };

  const handleToggleStatus = async (staff: StaffWithServices) => {
    const newStatus = !staff.is_active;
    const res = await toggleStaffStatus(businessId, staff.id, newStatus, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to update status");
      return;
    }
    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? { ...s, is_active: newStatus } : s))
    );
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.professional_title && s.professional_title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all"
        ? !s.is_archived
        : statusFilter === "active"
        ? s.is_active && !s.is_archived
        : statusFilter === "inactive"
        ? !s.is_active && !s.is_archived
        : s.is_archived;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Team & Staff Directory
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Manage your barbers, stylists, working shifts, recurring breaks, and time-off leave.
          </p>
        </div>

        <button
          type="button"
          id="add-staff-btn"
          onClick={() => {
            resetForm();
            setIsAddStaffOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Staff Member
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs sm:text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4 text-emerald-600 hover:opacity-75" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs sm:text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)}>
            <X className="h-4 w-4 text-rose-600 hover:opacity-75" />
          </button>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            id="staff-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team members by name or role title..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            id="staff-status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "active" | "inactive" | "archived"
              )
            }
            aria-label="Filter staff by status"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-3.5 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">
              Active Team ({staffList.filter((s) => !s.is_archived).length})
            </option>
            <option value="active">Active Members Only</option>
            <option value="inactive">Inactive Members Only</option>
            <option value="archived">
              Archived ({staffList.filter((s) => s.is_archived).length})
            </option>
          </select>
        </div>
      </div>

      {/* Staff Cards Grid */}
      {filteredStaff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 sm:p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Users className="mx-auto h-10 w-10 text-zinc-400" />
          <h3 className="mt-3 text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {staffList.length === 0 ? "No staff profiles created" : "No matching team members"}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">
            {staffList.length === 0
              ? "Add barbers, stylists, and therapists to configure their working shifts and assign services."
              : "Try adjusting your search criteria."}
          </p>
          {staffList.length === 0 && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddStaffOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Staff Profile
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className={`rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                staff.is_archived
                  ? "border-amber-200/60 bg-amber-50/20 opacity-75 dark:border-amber-900/40 dark:bg-amber-950/20"
                  : staff.is_active
                  ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  : "border-zinc-200/60 bg-zinc-50/60 opacity-80 dark:border-zinc-800/50 dark:bg-zinc-900/40"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-sm dark:bg-blue-950/60 dark:text-blue-300">
                      {staff.display_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {staff.display_name}
                      </h3>
                      {staff.professional_title ? (
                        <p className="truncate text-xs text-zinc-500 font-medium">
                          {staff.professional_title}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 italic">No title</p>
                      )}
                    </div>
                  </div>

                  {staff.is_archived ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                      <Archive className="h-3 w-3" /> Archived
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(staff)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
                        staff.is_active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {staff.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Inactive
                        </>
                      )}
                    </button>
                  )}
                </div>

                {staff.bio && (
                  <p className="mt-3 text-xs text-zinc-500 line-clamp-2">{staff.bio}</p>
                )}

                <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                  {staff.contact_email && (
                    <div className="flex items-center gap-2 truncate text-zinc-500">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
                      <span className="truncate">{staff.contact_email}</span>
                    </div>
                  )}
                  {staff.contact_phone && (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
                      <span>{staff.contact_phone}</span>
                    </div>
                  )}
                </div>

                {/* Assigned Services Indicator */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <Scissors className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      {staff.assigned_services_count === 0
                        ? "No services assigned"
                        : `${staff.assigned_services_count} service${
                            staff.assigned_services_count > 1 ? "s" : ""
                          } assigned`}
                    </span>
                  </div>
                  {!staff.is_archived && (
                    <button
                      type="button"
                      disabled={!staff.is_active}
                      title={
                        !staff.is_active
                          ? "Activate staff member to assign services"
                          : "Assign services"
                      }
                      onClick={() => openAssignModal(staff)}
                      className={`text-xs font-semibold ${
                        !staff.is_active
                          ? "text-zinc-400 cursor-not-allowed"
                          : "text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                      }`}
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons: Schedule, Time Off, Edit, Archive/Restore */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                {!staff.is_archived && (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/dashboard/${businessSlug}/staff/${staff.id}/schedule`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Shifts & Breaks
                    </Link>

                    <Link
                      href={`/dashboard/${businessSlug}/staff/${staff.id}/time-off`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      Time Off
                    </Link>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  {staff.is_archived ? (
                    <button
                      type="button"
                      id={`restore-staff-${staff.id}`}
                      onClick={() => handleRestore(staff)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore Profile
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        id={`edit-staff-${staff.id}`}
                        onClick={() => openEditModal(staff)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        id={`archive-staff-${staff.id}`}
                        onClick={() => setArchiveTarget(staff)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archive Staff Confirmation Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Archive Staff Member?
                </h2>
                <p className="text-xs text-zinc-500">Soft-archive preserves past shifts & bookings</p>
              </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
              Are you sure you want to archive <strong>&ldquo;{archiveTarget.display_name}&rdquo;</strong>? They will be removed from future online booking eligibility, but their historical shifts, breaks, and appointments remain preserved.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                id="cancel-archive-staff-btn"
                onClick={() => setArchiveTarget(null)}
                disabled={isArchiving}
                className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-archive-staff-btn"
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {isArchiving ? "Archiving..." : "Archive Staff Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {(isAddStaffOpen || editingStaff) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsAddStaffOpen(false);
                  setEditingStaff(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Harrison"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Professional Title / Role
                </label>
                <input
                  type="text"
                  value={professionalTitle}
                  onChange={(e) => setProfessionalTitle(e.target.value)}
                  placeholder="e.g. Master Barber, Senior Stylist, Colorist"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Contact Email (Internal)
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="alex@salon.co.uk"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Contact Phone (Internal)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+44 7911 123456"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Bio / Specialties
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Experienced in precision skin fades, beard sculpting, and hot towel treatments..."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="staff-active-toggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="staff-active-toggle" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Active team member (available for booking assignments)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStaffOpen(false);
                    setEditingStaff(null);
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingStaff ? "Update Staff" : "Create Staff Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Services Modal */}
      {assigningServicesStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Assign Services
                </h2>
                <p className="text-xs text-zinc-500">
                  Select services {assigningServicesStaff.display_name} can perform.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningServicesStaff(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1">
              {allServices.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">
                  No services configured yet. Add services under the Services tab first.
                </p>
              ) : (
                allServices.map((service) => {
                  const isChecked = selectedServiceIds.includes(service.id);
                  const isServiceInactive = !service.is_active || service.is_archived;
                  const isBlockedFromNewAssignment = isServiceInactive && !isChecked;

                  return (
                    <label
                      key={service.id}
                      className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                        isBlockedFromNewAssignment
                          ? "border-zinc-200 bg-zinc-50/50 opacity-60 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900/30"
                          : isChecked
                          ? "border-blue-500 bg-blue-50/60 dark:border-blue-500/60 dark:bg-blue-950/30 cursor-pointer"
                          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isBlockedFromNewAssignment}
                          onChange={() => toggleServiceSelection(service.id)}
                          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {service.name}
                            </p>
                            {isServiceInactive && (
                              <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            {service.duration_minutes}m •{" "}
                            {(service.price_amount / 100).toFixed(2)} {service.currency}
                            {isBlockedFromNewAssignment && " • Inactive (cannot assign)"}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
              <button
                type="button"
                onClick={() => setAssigningServicesStaff(null)}
                className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveServiceAssignments}
                className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
