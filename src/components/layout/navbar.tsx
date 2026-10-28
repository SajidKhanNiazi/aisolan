import { connection } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { NavbarClient } from "./navbar-client";

export async function Navbar() {
  await connection();
  let isAuthenticated = false;
  let userEmail: string | null = null;

  try {
    const user = await getAuthenticatedUser();
    if (user) {
      isAuthenticated = true;
      userEmail = user.email || null;
    }
  } catch {
    // If Supabase check fails in test environment, default gracefully
    isAuthenticated = false;
  }

  return <NavbarClient isAuthenticated={isAuthenticated} userEmail={userEmail} />;
}

export function NavbarSkeleton() {
  return <NavbarClient isAuthenticated={false} userEmail={null} />;
}


