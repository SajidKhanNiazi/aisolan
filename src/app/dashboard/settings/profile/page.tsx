"use client";

import { useState, useTransition, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";
import { getCurrentProfile, updateProfile } from "@/features/organizations/server";
import type { UserProfile } from "@/features/organizations/types";

export default function ProfileSettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const p = await getCurrentProfile();
      if (p) {
        setProfile(p);
        setFullName(p.full_name || "");
        setAvatarUrl(p.avatar_url || "");
      }
      setIsLoading(false);
    }
    loadProfile();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!fullName || fullName.trim().length < 2) {
      setFeedback({ type: "error", message: "Full name must be at least 2 characters." });
      return;
    }

    startTransition(async () => {
      const result = await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl ? avatarUrl : null,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error || "Failed to update profile.",
        });
      } else {
        if (result.data) {
          setProfile(result.data);
        }
        setFeedback({
          type: "success",
          message: "Profile updated successfully!",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account Profile
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage your personal details and account preferences.
        </p>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* User ID (read only) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              User ID
            </label>
            <input
              type="text"
              readOnly
              value={profile?.id || ""}
              disabled
              className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-mono text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 cursor-not-allowed"
            />
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="full_name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isPending}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <label
              htmlFor="avatar_url"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Avatar URL (Optional)
            </label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              disabled={isPending}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100"
            />
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
