import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/internal/whatsapp/diagnostic/route";
import { NextRequest } from "next/server";

describe("Phase 1H-D13 WhatsApp Diagnostic Endpoint (GET /api/internal/whatsapp/diagnostic)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("strictly rejects unauthenticated requests with HTTP 401 Unauthorized", async () => {
    process.env.CRON_SECRET = "secure_cron_secret_d13";

    const req = new NextRequest("http://localhost:3000/api/internal/whatsapp/diagnostic");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
    expect(body).not.toHaveProperty("checks");
  });

  it("strictly rejects invalid authorization headers", async () => {
    process.env.CRON_SECRET = "secure_cron_secret_d13";

    const req = new NextRequest("http://localhost:3000/api/internal/whatsapp/diagnostic", {
      headers: {
        authorization: "Bearer wrong_key_999",
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("authenticates via valid CRON_SECRET and validates App, WABA, Phone, and permissions without secret leaks", async () => {
    process.env.CRON_SECRET = "valid_cron_secret_d13";
    process.env.WHATSAPP_ACCESS_TOKEN = "EAAGtest_system_user_token";
    process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
    process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";
    process.env.WHATSAPP_ENABLED = "false";
    process.env.WHATSAPP_OUTBOUND_ENABLED = "false";
    process.env.WHATSAPP_BOOKING_WRITES_ENABLED = "false";

    vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("1761678114892387")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "1761678114892387", name: "Bookzello AI" }),
        } as Response;
      }
      if (urlStr.includes("1796731811545454")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "1796731811545454", name: "Bookzello QA WABA", timezone_id: "1" }),
        } as Response;
      }
      if (urlStr.includes("1314214205118465")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "1314214205118465",
            display_phone_number: "+1 555-213-4504",
            verified_name: "Bookzello QA",
          }),
        } as Response;
      }
      if (urlStr.includes("debug_token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              app_id: "1761678114892387",
              type: "SYSTEM_USER",
              application: "Bookzello AI",
              is_valid: true,
              scopes: ["whatsapp_business_messaging", "whatsapp_business_management"],
            },
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const req = new NextRequest("http://localhost:3000/api/internal/whatsapp/diagnostic", {
      headers: {
        authorization: "Bearer valid_cron_secret_d13",
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.overallStatus).toBe("PASS");
    expect(body.checks.tokenValid).toBe("PASS");
    expect(body.checks.metaAppIdMatch).toBe("PASS");
    expect(body.checks.metaWabaIdMatch).toBe("PASS");
    expect(body.checks.metaPhoneIdMatch).toBe("PASS");
    expect(body.checks.messagingPermission).toBe("PASS");
    expect(body.checks.authorizedRecipientsConfigured).toBe("PASS");
    expect(body.checks.safetyFlagsDisabled).toBe("PASS");

    // Zero secret leakage in payload
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("EAAGtest_system_user_token");
    expect(bodyStr).not.toContain("447700900123");
    expect(bodyStr).not.toContain("valid_cron_secret_d13");
  });
});
