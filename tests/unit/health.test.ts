import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("Health Route Handler (GET /api/health)", () => {
  it("should return status 200 with non-sensitive health metadata", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("service", "bookpilot");
    expect(data).toHaveProperty("timestamp");

    // Must never leak secrets or credentials
    expect(data).not.toHaveProperty("env");
    expect(data).not.toHaveProperty("supabaseKey");
    expect(data).not.toHaveProperty("databaseUrl");
  });
});
