import { NextRequest, NextResponse } from "next/server";
import {
  isPreviewEnvironment,
  consumeQaActivationTicket,
  createQaSessionToken,
} from "@/features/ai-receptionist/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * In-memory fallback rate limiter for activation attempts (used when Supabase is offline/in tests)
 */
const activationAttemptLimits = new Map<string, { count: number; resetAt: number }>();

async function checkActivationRateLimit(ip: string): Promise<boolean> {
  const maxAttempts = 5;
  const windowSeconds = 60;
  const now = Date.now();

  const serviceClient = createServiceClient();
  if (serviceClient) {
    try {
      const { data, error } = await serviceClient.rpc(
        "check_and_increment_rate_limit",
        {
          p_key: `rate:qa_activate:${ip}`,
          p_max_requests: maxAttempts,
          p_window_seconds: windowSeconds,
        }
      );
      if (!error && data) {
        return Boolean(data.allowed);
      }
    } catch {
      // Fall through to memory limiter
    }
  }

  const record = activationAttemptLimits.get(ip);
  if (!record || record.resetAt <= now) {
    activationAttemptLimits.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * GET /api/internal/qa-session/activate
 *
 * 1. Categorically returns 404 in Production.
 * 2. Rejects query string bearer credentials (?ticket=... or ?code=...) to prevent
 *    exposure across browser history, URL logs, referrers, and monitoring.
 * 3. In Preview, renders a clean, server-rendered owner activation form (zero client JS).
 */
export async function GET(req: NextRequest) {
  if (!(await isPreviewEnvironment())) {
    return NextResponse.json(
      { error: "QA activation is only available in preview environments." },
      { status: 404 }
    );
  }

  // Security gate: Reject credentials in URL query strings
  const searchParams = req.nextUrl.searchParams;
  if (searchParams.has("ticket") || searchParams.has("code")) {
    return NextResponse.json(
      {
        error:
          "Bearer credentials in URL query strings are strictly disabled to prevent exposure in browser history and server logs. Please submit your activation code via the secure POST form.",
      },
      { status: 400 }
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BookPilot QA — Owner Session Activation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #09090b;
      color: #f4f4f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 2rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #fafafa;
    }
    p {
      font-size: 0.875rem;
      color: #a1a1aa;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }
    .badge {
      display: inline-block;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      margin-bottom: 0.5rem;
    }
    input[type="password"] {
      width: 100%;
      box-sizing: border-box;
      background: #09090b;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      color: #f4f4f5;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      font-family: monospace;
      outline: none;
      transition: border-color 0.2s;
      margin-bottom: 1.25rem;
    }
    input[type="password"]:focus {
      border-color: #3b82f6;
    }
    button {
      width: 100%;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #1d4ed8;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #52525b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Preview Environment Only</div>
    <h1>Authorize QA Browser Session</h1>
    <p>Submit your single-use owner activation code to establish an HttpOnly QA session without exposing credentials in URLs or browser storage.</p>
    <form method="POST" action="/api/internal/qa-session/activate">
      <label for="code">Owner Activation Code</label>
      <input type="password" id="code" name="code" placeholder="Paste single-use code" required autofocus autocomplete="off" />
      <button type="submit">Activate Browser QA Session</button>
    </form>
    <div class="footer">Protected by BookPilot AI Replay Guard & Rate Limiting</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * POST /api/internal/qa-session/activate
 *
 * 1. Categorically returns 404 in Production.
 * 2. Rate-limited (5 attempts per minute per IP).
 * 3. Atomically consumes single-use ticket in persistent storage (preventing replays).
 * 4. Sets HttpOnly, Secure, SameSite=Lax bp_qa_session cookie.
 * 5. Returns 303 Redirect to /booking/bookpilot-qa-salon (for form submissions)
 *    or JSON (for API clients).
 */
export async function POST(req: NextRequest) {
  if (!(await isPreviewEnvironment())) {
    return NextResponse.json(
      { error: "QA activation is only available in preview environments." },
      { status: 404 }
    );
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // Enforce rate limiting
  const allowed = await checkActivationRateLimit(clientIp);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many activation attempts. Please wait 60 seconds." },
      { status: 429 }
    );
  }

  // Extract code from JSON or Form submission
  let code: string | null = null;
  const contentType = req.headers.get("content-type") || "";
  const isFormSubmission =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      code = typeof body.code === "string" ? body.code.trim() : null;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  } else if (isFormSubmission) {
    try {
      const formData = await req.formData();
      const rawCode = formData.get("code");
      code = typeof rawCode === "string" ? rawCode.trim() : null;
    } catch {
      return NextResponse.json({ error: "Invalid form body." }, { status: 400 });
    }
  } else {
    // Attempt text or JSON fallback
    try {
      const body = await req.json();
      code = typeof body.code === "string" ? body.code.trim() : null;
    } catch {
      code = null;
    }
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing required activation code." },
      { status: 400 }
    );
  }

  // Atomically consume ticket (persistent replay protection)
  const consumeResult = await consumeQaActivationTicket(code);

  if (!consumeResult.success) {
    if (consumeResult.reason === "ALREADY_CONSUMED") {
      return NextResponse.json(
        {
          error:
            "Activation code has already been consumed. Single-use replay protection enforced.",
        },
        { status: 409 }
      );
    }
    if (consumeResult.reason === "EXPIRED") {
      return NextResponse.json(
        { error: "Activation code has expired (2-minute window exceeded)." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Invalid or forged activation code." },
      { status: 401 }
    );
  }

  // Create 30-minute HMAC session token
  const sessionToken = await createQaSessionToken("bookpilot-qa-salon");
  if (!sessionToken) {
    return NextResponse.json(
      { error: "Failed to initialize QA session." },
      { status: 500 }
    );
  }

  // Handle Response
  let response: NextResponse;
  if (isFormSubmission) {
    // Native browser redirect with cookie
    const redirectUrl = new URL("/booking/bookpilot-qa-salon", req.url);
    response = NextResponse.redirect(redirectUrl, 303);
  } else {
    response = NextResponse.json({
      success: true,
      mode: "openai",
      salon: "bookpilot-qa-salon",
    });
  }

  response.cookies.set("bp_qa_session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1800, // 30 minutes
  });

  return response;
}
