import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/internal/whatsapp/diagnostic/route";
import { NextRequest } from "next/server";

describe("Temporary WhatsApp Runtime Diagnostic Endpoint (GET /api/internal/whatsapp/diagnostic)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("strictly rejects unauthenticated requests with 401 Unauthorized", async () => {
    process.env.CRON_SECRET = "super_secret_cron_key_12345";

    const req = new NextRequest("http://localhost:3000/api/internal/whatsapp/diagnostic");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
    expect(body).not.toHaveProperty("checks");
  });

  it("strictly rejects requests with invalid Authorization bearer header", async () => {
    process.env.CRON_SECRET = "super_secret_cron_key_12345";

    const req = new NextRequest("http://localhost:3000/api/internal/whatsapp/diagnostic", {
      headers: {
        authorization: "Bearer wrong_token_abc",
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("authenticates via valid CRON_SECRET and returns only high-level PASS/FAIL without leaks", async () => {
    process.env.CRON_SECRET = "valid_cron_secret_789";
    process.env.WHATSAPP_ACCESS_TOKEN = "EAABtest_token_not_real";
    process.env.WHATSAPP_TEST_PHONE_NUMBER_ID = "1314214205118465";
    process.env.WHATSAPP_AUTHORIZED_TEST_RECIPIENTS = "447700900123";
    process.env.WHATSAPP_ENABLED = "false";
    process.env.WHATSAPP_OUTBOUND_ENABLED = "false";
    process.env.WHATSAPP_BOOKING_WRITES_ENABLED = "false";

    // Mock fetch for read-only Meta Graph API calls
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("app?fields=id,name")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "1761678114892387", name: "Bookzello AI" }),
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
      return { ok: false, status: 404 } as Response;
    });

    const req = new NextRequest("http://localhost:3000/api/internal/whatsapp/diagnostic", {
      headers: {
        authorization: "Bearer valid_cron_secret_789",
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.overallStatus).toBe("PASS");
    expect(body.checks.accessTokenPresent).toBe(true);
    expect(body.checks.metaAppIdMatch).toBe("PASS");
    expect(body.checks.metaPhoneIdMatch).toBe("PASS");
    expect(body.checks.metaTokenHandshake).toBe("PASS");
    expect(body.checks.messagingPermission).toBe("PASS");
    expect(body.checks.testPhoneNumberIdConfigured).toBe("PASS");
    expect(body.checks.authorizedRecipientsConfigured).toBe("PASS");
    expect(body.checks.safetyFlagsDisabled).toBe("PASS");

    // Strict privacy verification: zero credentials or raw numbers in payload
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("EAABtest_token_not_real");
    expect(bodyStr).not.toContain("447700900123");
    expect(bodyStr).not.toContain("+1 555-213-4504");
    expect(bodyStr).not.toContain("valid_cron_secret_789");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
