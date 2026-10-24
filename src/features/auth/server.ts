"use server";

import { createClient } from "@/lib/supabase/server";
import { getEnv } from "@/lib/env";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type SignupInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "./validation";

export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Registers a new user with Supabase Auth.
 */
export async function signupAction(
  data: SignupInput
): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0]) {
        fieldErrors[issue.path[0].toString()] = issue.message;
      }
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Authentication service unavailable." };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
      },
      emailRedirectTo: `${getEnv().appUrl}/auth/confirm`,
    },
  });

  if (error) {
    // Avoid detailed account enumeration disclosures
    return {
      success: false,
      error: error.message || "Failed to create account. Please check your details.",
    };
  }

  return {
    success: true,
    message: "Registration successful! Please check your email to confirm your account.",
  };
}

/**
 * Signs in an existing user with Supabase Auth.
 */
export async function loginAction(
  data: LoginInput
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please enter a valid email and password.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Authentication service unavailable." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: "Invalid email or password. Please try again.",
    };
  }

  return { success: true };
}

/**
 * Requests a password reset email.
 */
export async function forgotPasswordAction(
  data: ForgotPasswordInput
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Authentication service unavailable." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getEnv().appUrl}/reset-password`,
    }
  );

  if (error) {
    // Return friendly generic response to avoid email enumeration
    return {
      success: true,
      message: "If an account exists for this email, password reset instructions have been sent.",
    };
  }

  return {
    success: true,
    message: "If an account exists for this email, password reset instructions have been sent.",
  };
}

/**
 * Sets a new password after verifying recovery session.
 */
export async function resetPasswordAction(
  data: ResetPasswordInput
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Authentication service unavailable." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to update password. Recovery link may have expired.",
    };
  }

  return {
    success: true,
    message: "Your password has been successfully reset! You can now log in.",
  };
}

/**
 * Signs out the current user.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
