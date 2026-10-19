"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

function ConfirmHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email and setting up your session...");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleVerification() {
      // 1. Check URL hash fragment (Default Supabase template delivers tokens in hash)
      const hash = window.location.hash ? window.location.hash.substring(1) : "";
      const hashParams = new URLSearchParams(hash);

      // Check for error in hash (e.g. otp_expired, access_denied)
      const hashError = hashParams.get("error");
      const hashErrorDesc = hashParams.get("error_description");
      if (hashError) {
        if (!isMounted) return;
        setStatus("error");
        setErrorDetails(
          hashErrorDesc?.replace(/\+/g, " ") ||
            "Your verification link has expired or has already been used. Please request a new one."
        );
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      const supabase = createClient();
      if (!supabase) {
        if (!isMounted) return;
        setStatus("error");
        setErrorDetails("Authentication service is temporarily unavailable.");
        return;
      }

      // Case A: Access token and refresh token present in hash
      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            if (!isMounted) return;
            setStatus("error");
            setErrorDetails(error.message || "Failed to establish authenticated session.");
            return;
          }

          if (!isMounted) return;
          setStatus("success");
          setMessage("Email confirmed successfully! Redirecting...");

          // Small timeout so user sees confirmation before navigation
          setTimeout(() => {
            if (hashType === "recovery") {
              router.push("/reset-password");
            } else {
              router.push("/dashboard");
            }
            router.refresh();
          }, 800);
          return;
        } catch {
          if (!isMounted) return;
          setStatus("error");
          setErrorDetails("An unexpected error occurred while setting up your session.");
          return;
        }
      }

      // Case B: PKCE code in query searchParams (?code=...)
      const code = searchParams.get("code");
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!isMounted) return;
            setStatus("error");
            setErrorDetails(error.message);
            return;
          }

          if (!isMounted) return;
          setStatus("success");
          setMessage("Email confirmed successfully! Redirecting...");
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 800);
          return;
        } catch {
          if (!isMounted) return;
          setStatus("error");
          setErrorDetails("Failed to verify authentication code.");
          return;
        }
      }

      // Case C: token_hash in query searchParams (?token_hash=...&type=...)
      const tokenHash = searchParams.get("token_hash");
      const queryType = searchParams.get("type") as EmailOtpType | null;
      if (tokenHash && queryType) {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: queryType,
          });

          if (error) {
            if (!isMounted) return;
            setStatus("error");
            setErrorDetails(error.message);
            return;
          }

          if (!isMounted) return;
          setStatus("success");
          setMessage("Email confirmed successfully! Redirecting...");
          setTimeout(() => {
            if (queryType === "recovery") {
              router.push("/reset-password");
            } else {
              router.push("/dashboard");
            }
            router.refresh();
          }, 800);
          return;
        } catch {
          if (!isMounted) return;
          setStatus("error");
          setErrorDetails("Failed to verify confirmation token.");
          return;
        }
      }

      // Case D: No tokens found in either hash or search params
      if (!isMounted) return;
      setStatus("error");
      setErrorDetails(
        "No verification tokens found in the request. The link may have expired or been improperly copied."
      );
    }

    handleVerification();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-center">
      {status === "loading" && (
        <div className="py-6">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
          <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Confirming your email
          </h2>
          <p className="mt-1.5 text-xs text-zinc-500">{message}</p>
        </div>
      )}

      {status === "success" && (
        <div className="py-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Email Confirmed!
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {message}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Verification Link Expired or Invalid
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {errorDetails || "Your verification link has expired or has already been used."}
          </p>
          <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <span>Go to Login</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Sign up again
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
              <p className="mt-3 text-xs text-zinc-500">Loading verification session...</p>
            </div>
          }
        >
          <ConfirmHandler />
        </Suspense>
      </div>
    </div>
  );
}
