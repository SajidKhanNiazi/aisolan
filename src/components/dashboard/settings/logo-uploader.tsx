"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle } from "lucide-react";
import { uploadBusinessLogo } from "@/features/organizations/settings-server";

interface LogoUploaderProps {
  businessId: string;
  initialLogoUrl?: string | null;
  onLogoUploaded: (url: string) => void;
  disabled?: boolean;
}

export function LogoUploader({
  businessId,
  initialLogoUrl,
  onLogoUploaded,
  disabled,
}: LogoUploaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Client-side validations
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setErrorMessage("Please choose a PNG, JPEG, WebP, or SVG image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Image file exceeds the 2MB size limit.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await uploadBusinessLogo(businessId, formData);
      if (res.success && res.url) {
        setLogoUrl(res.url);
        onLogoUploaded(res.url);
      } else {
        setErrorMessage(res.error || "Failed to upload logo.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error uploading logo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Business Brand Logo
      </label>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Preview Container */}
        <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60 overflow-hidden">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Business Logo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-zinc-400" />
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Action & Instructions */}
        <div className="flex-1 space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="hidden"
            id="business-logo-input"
          />

          <div className="flex items-center gap-2">
            <label
              htmlFor="business-logo-input"
              className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors ${
                disabled || isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{logoUrl ? "Replace Logo" : "Upload Logo"}</span>
            </label>

            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  setLogoUrl(null);
                  onLogoUploaded("");
                }}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Recommended size: 400x400px. PNG, JPG, WebP or SVG up to 2MB.
          </p>

          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
