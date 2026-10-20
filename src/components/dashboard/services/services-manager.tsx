"use client";

import { useState } from "react";
import type { ServiceWithCategory, ServiceCategory } from "@/features/services/types";
import { formatCurrency, parsePriceToMinorUnits } from "@/features/services/types";
import {
  createService,
  updateService,
  archiveService,
  toggleServiceStatus,
  createServiceCategory,
} from "@/features/services/server";
import {
  Plus,
  Search,
  Tag,
  Clock,
  Sparkles,
  Edit2,
  Archive,
  CheckCircle,
  XCircle,
  Users,
  FolderPlus,
  AlertCircle,
  X,
} from "lucide-react";

interface ServicesManagerProps {
  initialServices: ServiceWithCategory[];
  categories: ServiceCategory[];
  businessId: string;
  businessSlug: string;
  currency: string;
}

export function ServicesManager({
  initialServices,
  categories: initialCategories,
  businessId,
  businessSlug,
  currency,
}: ServicesManagerProps) {
  const [services, setServices] = useState<ServiceWithCategory[]>(initialServices);
  const [categories, setCategories] = useState<ServiceCategory[]>(initialCategories);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithCategory | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceMajor, setPriceMajor] = useState(""); // decimal string (e.g. "25.00")
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [bufferMinutes, setBufferMinutes] = useState("0");
  const [isActive, setIsActive] = useState(true);

  // Category form state
  const [newCategoryName, setNewCategoryName] = useState("");

  // Loading & Feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtered services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryId === "all" || service.category_id === selectedCategoryId;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && service.is_active) ||
      (statusFilter === "inactive" && !service.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const resetServiceForm = () => {
    setName("");
    setDescription("");
    setCategoryId("");
    setPriceMajor("");
    setDurationMinutes("30");
    setBufferMinutes("0");
    setIsActive(true);
    setEditingService(null);
    setErrorMessage(null);
  };

  const openEditModal = (service: ServiceWithCategory) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || "");
    setCategoryId(service.category_id || "");
    setPriceMajor((service.price_amount / 100).toFixed(2));
    setDurationMinutes(service.duration_minutes.toString());
    setBufferMinutes(service.buffer_minutes.toString());
    setIsActive(service.is_active);
    setErrorMessage(null);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const minorPrice = parsePriceToMinorUnits(priceMajor);
    const duration = parseInt(durationMinutes, 10);
    const buffer = parseInt(bufferMinutes, 10) || 0;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      price_amount: minorPrice,
      currency,
      duration_minutes: duration,
      buffer_minutes: buffer,
      is_active: isActive,
    };

    try {
      if (editingService) {
        const res = await updateService(businessId, editingService.id, payload, businessSlug);
        if (!res.success || !res.service) {
          setErrorMessage(res.error || "Failed to update service");
          setIsSaving(false);
          return;
        }
        setServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? res.service! : s))
        );
        setSuccessMessage(`Service "${res.service.name}" updated successfully.`);
      } else {
        const res = await createService(businessId, payload, businessSlug);
        if (!res.success || !res.service) {
          setErrorMessage(res.error || "Failed to create service");
          setIsSaving(false);
          return;
        }
        setServices((prev) => [...prev, res.service!]);
        setSuccessMessage(`Service "${res.service.name}" created successfully.`);
      }
      resetServiceForm();
      setIsAddServiceOpen(false);
    } catch {
      setErrorMessage("An unexpected error occurred while saving the service.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to archive "${serviceName}"? It will no longer appear for booking.`)) {
      return;
    }
    const res = await archiveService(businessId, serviceId, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to archive service");
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    setSuccessMessage(`Service "${serviceName}" archived.`);
  };

  const handleToggleStatus = async (service: ServiceWithCategory) => {
    const newStatus = !service.is_active;
    const res = await toggleServiceStatus(businessId, service.id, newStatus, businessSlug);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to update service status");
      return;
    }
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: newStatus } : s))
    );
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);

    const res = await createServiceCategory(
      businessId,
      { name: newCategoryName.trim(), display_order: categories.length },
      businessSlug
    );

    if (!res.success || !res.category) {
      setErrorMessage(res.error || "Failed to create category");
      setIsSaving(false);
      return;
    }

    setCategories((prev) => [...prev, res.category!]);
    setNewCategoryName("");
    setIsAddCategoryOpen(false);
    setIsSaving(false);
    setSuccessMessage(`Category "${res.category.name}" added.`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Services & Pricing
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Manage your service catalog, prices in {currency}, durations, buffers, and categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="add-category-btn"
            onClick={() => {
              setNewCategoryName("");
              setErrorMessage(null);
              setIsAddCategoryOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <FolderPlus className="h-4 w-4 text-zinc-500" />
            Add Category
          </button>

          <button
            type="button"
            id="add-service-btn"
            onClick={() => {
              resetServiceForm();
              setIsAddServiceOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        </div>
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

      {/* Search & Category Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            id="services-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services by name or description..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            id="category-filter-select"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            aria-label="Filter by category"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-3.5 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            aria-label="Filter by status"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-3.5 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Services List / Cards */}
      {filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 sm:p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Sparkles className="mx-auto h-10 w-10 text-zinc-400" />
          <h3 className="mt-3 text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {services.length === 0 ? "No services added yet" : "No matching services"}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">
            {services.length === 0
              ? "Build your service catalog by adding haircuts, grooming, styling, and treatments."
              : "Try adjusting your search query or category filters."}
          </p>
          {services.length === 0 && (
            <button
              type="button"
              onClick={() => {
                resetServiceForm();
                setIsAddServiceOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Service
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`rounded-2xl border p-5 shadow-sm transition-all ${
                service.is_active
                  ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  : "border-zinc-200/60 bg-zinc-50/60 opacity-80 dark:border-zinc-800/50 dark:bg-zinc-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {service.name}
                  </h3>
                  {service.category && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      <Tag className="h-3 w-3" />
                      {service.category.name}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(service)}
                  title={service.is_active ? "Active: Click to disable" : "Inactive: Click to enable"}
                  className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
                    service.is_active
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {service.is_active ? (
                    <>
                      <CheckCircle className="h-3 w-3" /> Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" /> Inactive
                    </>
                  )}
                </button>
              </div>

              {service.description && (
                <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
                  {service.description}
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(service.price_amount, service.currency)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    {service.duration_minutes}m
                  </span>
                  {service.buffer_minutes > 0 && (
                    <span className="text-[11px] text-zinc-400">
                      +{service.buffer_minutes}m buffer
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                  <Users className="h-3 w-3" />
                  {service.assigned_staff_count || 0} staff
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(service)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(service.id, service.name)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {(isAddServiceOpen || editingService) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingService ? "Edit Service" : "Add New Service"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsAddServiceOpen(false);
                  setEditingService(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Men's Haircut, Beard Trim, Styling"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">No Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Price ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      {currency === "GBP" ? "£" : "$"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={priceMajor}
                      onChange={(e) => setPriceMajor(e.target.value)}
                      placeholder="20.00"
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-3.5 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Duration (Minutes) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="720"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="30"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Cleanup / Prep Buffer (Min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details for clients booking this service..."
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="service-active-toggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="service-active-toggle" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Enable service for booking
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddServiceOpen(false);
                    setEditingService(null);
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
                  {isSaving ? "Saving..." : editingService ? "Update Service" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Add Service Category</h2>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Haircuts, Grooming, Facials"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
