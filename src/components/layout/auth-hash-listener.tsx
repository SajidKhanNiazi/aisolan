"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Listens for auth hash fragments (#access_token=...) on public landing pages
 * in case Supabase redirects to Site URL (/) instead of the specified emailRedirectTo.
 * Transparently forwards the tokens to /auth/confirm or /reset-password.
 */
export function AuthHashListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const type = params.get("type");

    if (accessToken) {
      if (type === "recovery") {
        router.replace(`/reset-password#${hash}`);
      } else {
        router.replace(`/auth/confirm#${hash}`);
      }
    }
  }, [router]);

  return null;
}
