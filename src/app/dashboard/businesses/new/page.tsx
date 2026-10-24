"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  Globe,
} from "lucide-react";
import { createBusinessWithOwner } from "@/features/organizations/server";
import { createBusinessSchema } from "@/features/organizations/validation";

export default function NewBusinessPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    business_type: "salon" as "salon" | "barbershop" | "spa" | "trainer" | "other",
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate slug from business name if not manually modified
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => {
      const updated = { ...prev, name };
      if (!slugManuallyEdited) {
        const generatedSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50);
        updated.slug = generatedSlug;
      }
      return updated;
    });

    if (fieldErrors.name) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
    if (errorMessage) setErrorMessage(null);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setFormData((prev) => ({ ...prev, slug }));

    if (fieldErrors.slug) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.slug;
        return next;
      });
    }
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const clientValidation = createBusinessSchema.safeParse(formData);
    if (!clientValidation.success) {
      const errors: Record<string, string> = {};
      for (const issue of clientValidation.error.issues) {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const result = await createBusinessWithOwner(formData);
      if (!result.success || !result.data) {
        setErrorMessage(
          result.error || "Failed to create business workspace. Please try again."
        );
      } else {
        // Redirect to new workspace overview with setup query param
        router.push(`/dashboard/${result.data.slug}?created=true`);
        router.refresh();
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>New Business Workspace</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome to Bookzello
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          Create your first workspace to start managing your appointment-based business.
        </p>
      </div>

      {/* Workspace Form Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Business Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Business Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g., Crown & Blade Barbershop"
              disabled={isPending}
              className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800/80 dark:text-zinc-100 ${
                fieldErrors.name
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-800"
                  : "border-zinc-300 focus:border-blue-600 dark:border-zinc-700"
              }`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Business Type */}
          <div>
            <label
              htmlFor="business_type"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Business Category
            </label>
            <select
              id="business_type"
              name="business_type"
              value={formData.business_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  business_type: e.target.value as "salon" | "barbershop" | "spa" | "trainer" | "other",
                }))
              }
              disabled={isPending}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100"
            >
              <option value="salon">Hair Salon & Hairdresser</option>
              <option value="barbershop">Barbershop</option>
              <option value="spa">Spa & Wellness Center</option>
              <option value="trainer">Fitness Trainer & Studio</option>
              <option value="other">Other Appointment Business</option>
            </select>
          </div>

          {/* Slug & URL Preview */}
          <div>
            <label
              htmlFor="slug"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Workspace URL Slug
            </label>
            <div className="relative mt-1.5 flex rounded-lg shadow-sm">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-100 px-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                aisalon.com/booking/
              </span>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="crown-and-blade"
                disabled={isPending}
                className={`block w-full flex-1 rounded-none rounded-r-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-zinc-800/80 dark:text-zinc-100 ${
                  fieldErrors.slug
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-800"
                    : "border-zinc-300 focus:border-blue-600 dark:border-zinc-700"
                }`}
              />
            </div>
            {fieldErrors.slug ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.slug}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                This URL will be your public booking portal address.
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending || !formData.name || !formData.slug}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating workspace...
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
