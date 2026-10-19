"use client";

import { useState } from "react";
import {
  Building2,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import type { BusinessWithRole } from "@/features/organizations/types";
import {
  BUSINESS_CATEGORIES,
  businessProfileSchema,
  type BusinessProfileInput,
} from "@/features/organizations/validation";
import { updateBusinessProfile } from "@/features/organizations/settings-server";
import { LogoUploader } from "./logo-uploader";
import { TimezoneSelector } from "./timezone-selector";

interface BusinessProfileFormProps {
  business: BusinessWithRole;
  onSaved?: (updated: BusinessWithRole) => void;
  disabled?: boolean;
}

export function BusinessProfileForm({
  business,
  onSaved,
  disabled,
}: BusinessProfileFormProps) {
  const [formData, setFormData] = useState<BusinessProfileInput>({
    name: business.name,
    business_type: business.business_type,
    description: business.description || "",
    logo_url: business.logo_url || "",
    phone: business.phone || "",
    email: business.email || "",
    website: business.website || "",
    address_line1: business.address_line1 || "",
    address_line2: business.address_line2 || "",
    city: business.city || "",
    state_region: business.state_region || "",
    postal_code: business.postal_code || "",
    country: business.country || "GB",
    timezone: business.timezone || "Europe/London",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsed = businessProfileSchema.safeParse(formData);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message || "Please fix validation errors.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateBusinessProfile(business.id, parsed.data);
      if (res.success) {
        setSuccessMessage("Business profile updated successfully!");
        onSaved?.({
          ...business,
          ...parsed.data,
        });
      } else {
        setErrorMessage(res.error || "Failed to update business profile.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Immutable Workspace Identifier Badge */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Lock className="h-4 w-4 text-zinc-500" />
          <span>
            Workspace Slug: <code className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{business.slug}</code>
          </span>
        </div>
        <span className="text-[11px] text-zinc-500">
          Permanent identifier preserved across name updates to prevent breaking public links.
        </span>
      </div>

      {/* Brand & Identity */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Basic Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="biz-name"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Business Display Name *
            </label>
            <input
              id="biz-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={disabled || isSubmitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="biz-category"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Business Category *
            </label>
            <select
              id="biz-category"
              value={formData.business_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  business_type: e.target.value as BusinessProfileInput["business_type"],
                }))
              }
              disabled={disabled || isSubmitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 capitalize"
            >
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="capitalize">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="biz-desc"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Business Description
          </label>
          <textarea
            id="biz-desc"
            rows={3}
            value={formData.description || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Tell customers about your salon services, ambiance, and specialty treatments..."
            maxLength={1000}
            disabled={disabled || isSubmitting}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {/* Logo Uploader */}
        <LogoUploader
          businessId={business.id}
          initialLogoUrl={formData.logo_url}
          onLogoUploaded={(url) => setFormData((prev) => ({ ...prev, logo_url: url }))}
          disabled={disabled || isSubmitting}
        />
      </div>

      {/* Contact & Online Presence */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Contact Information</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="biz-phone"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Phone Number (Intl format)
            </label>
            <div className="relative">
              <input
                id="biz-phone"
                type="tel"
                placeholder="+44 7911 123456"
                value={formData.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                disabled={disabled || isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <span className="text-[10px] text-zinc-400">Include country code (+44, +1, +92, etc.)</span>
          </div>

          <div>
            <label
              htmlFor="biz-email"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Customer Contact Email
            </label>
            <input
              id="biz-email"
              type="email"
              placeholder="contact@yoursalon.com"
              value={formData.email || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              disabled={disabled || isSubmitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="biz-website"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Website (Optional)
            </label>
            <input
              id="biz-website"
              type="url"
              placeholder="https://yoursalon.com"
              value={formData.website || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              disabled={disabled || isSubmitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
      </div>

      {/* Location Address & Timezone */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Location & Timezone</span>
        </h3>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="biz-addr1"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Street Address (Line 1)
              </label>
              <input
                id="biz-addr1"
                type="text"
                placeholder="123 High Street"
                value={formData.address_line1 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_line1: e.target.value }))}
                disabled={disabled || isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="biz-addr2"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Street Address (Line 2 / Suite)
              </label>
              <input
                id="biz-addr2"
                type="text"
                placeholder="Suite 4B, 2nd Floor"
                value={formData.address_line2 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_line2: e.target.value }))}
                disabled={disabled || isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="biz-city"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                City
              </label>
              <input
                id="biz-city"
                type="text"
                placeholder="London"
                value={formData.city || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                disabled={disabled || isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="biz-region"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                State / Region
              </label>
              <input
                id="biz-region"
                type="text"
                placeholder="Greater London"
                value={formData.state_region || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, state_region: e.target.value }))}
                disabled={disabled || isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="biz-postcode"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Postal Code
              </label>
              <input
                id="biz-postcode"
                type="text"
                placeholder="EC1A 1BB"
                value={formData.postal_code || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, postal_code: e.target.value }))}
                disabled={disabled || isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="biz-country"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Country
              </label>
              <select
                id="biz-country"
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                disabled={disabled || isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="GB">United Kingdom (GB)</option>
                <option value="US">United States (US)</option>
                <option value="CA">Canada (CA)</option>
                <option value="AU">Australia (AU)</option>
                <option value="PK">Pakistan (PK)</option>
                <option value="IE">Ireland (IE)</option>
                <option value="DE">Germany (DE)</option>
                <option value="FR">France (FR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timezone Selector */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <TimezoneSelector
            value={formData.timezone}
            onChange={(tz) => setFormData((prev) => ({ ...prev, timezone: tz }))}
            disabled={disabled || isSubmitting}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{isSubmitting ? "Saving Profile..." : "Save Business Profile"}</span>
        </button>
      </div>
    </form>
  );
}
