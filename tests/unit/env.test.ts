import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnv } from "@/lib/env";

describe("Environment Utility (getEnv)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return default app URL when NEXT_PUBLIC_APP_URL is not provided", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const env = getEnv();
    expect(env.appUrl).toBe("http://localhost:3000");
  });

  it("should report Supabase isConfigured as false when keys are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const env = getEnv();
    expect(env.supabase.isConfigured).toBe(false);
    expect(env.supabase.url).toBeNull();
    expect(env.supabase.anonKey).toBeNull();
  });

  it("should report Supabase isConfigured as true when keys are provided", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const env = getEnv();
    expect(env.supabase.isConfigured).toBe(true);
    expect(env.supabase.url).toBe("https://example.supabase.co");
    expect(env.supabase.anonKey).toBe("test-anon-key");
  });
});
