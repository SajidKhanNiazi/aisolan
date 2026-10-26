import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { BookingDraft, ChannelContext, BookingDraftStage } from "./types";

const DRAFT_TTL_MINUTES = 30;

// Durable in-memory store for instant lookups, concurrency locks, and offline test execution.
const inMemoryDraftStore = new Map<
  string,
  { draft: BookingDraft; tokenHash: string; rawSecret: string }
>();

/**
 * Resets the in-memory draft store (used in tests).
 */
export function clearInMemoryDraftStore(): void {
  inMemoryDraftStore.clear();
}

/**
 * Retrieves the dedicated server-only AI_DRAFT_SECRET.
 * Requirements:
 * - Cryptographically random, at least 32 bytes of entropy.
 * - No hardcoded production fallback.
 * - Must NOT reuse SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, or OPENAI_API_KEY.
 * - Fails closed in production if absent or insufficient entropy (< 32 chars).
 * - Never logs or exposes the key value.
 */
export function getAiDraftSecret(): string {
  const secret = process.env.AI_DRAFT_SECRET;

  if (!secret || secret.trim().length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION: Dedicated AI_DRAFT_SECRET must be configured with at least 32 bytes of entropy in production. Never fallback to other service keys."
      );
    }
    // Safe deterministic development/test fallback with 32+ bytes of entropy
    return crypto
      .createHash("sha256")
      .update("bookzello-dev-ai-draft-signing-secret-minimum-32-bytes")
      .digest("hex");
  }

  return crypto.createHash("sha256").update(secret.trim()).digest("hex");
}

/**
 * Backward-compatible alias for getAiDraftSecret.
 */
export function getSigningSecret(): string {
  return getAiDraftSecret();
}

/**
 * Produces a SHA-256 hex digest of a raw draft secret.
 * Stored in PostgreSQL `conversational_booking_drafts.token_hash`.
 */
export function hashDraftSecret(rawSecret: string): string {
  return crypto.createHash("sha256").update(rawSecret).digest("hex");
}

/**
 * Creates a cryptographically signed opaque draft possession token.
 * Token contains ONLY: bkd_<draftId>_<rawSecret>.<signature>
 * ZERO customer PII (no name, phone, email, notes, or prices) is stored in the token.
 */
export function sealDraftToken(draftId: string, rawSecret: string): string {
  const secret = getAiDraftSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${draftId}:${rawSecret}`)
    .digest("hex");
  return `bkd_${draftId}_${rawSecret}.${signature}`;
}

/**
 * Parses and cryptographically verifies an opaque draft token.
 * Returns null if the HMAC signature does not match or the token is malformed.
 */
export function parseDraftToken(
  token: string
): { draftId: string; rawSecret: string; tokenHash: string } | null {
  if (!token || typeof token !== "string") return null;

  // New Opaque Token Format: bkd_<draftId>_<rawSecret>.<signature>
  if (token.startsWith("bkd_")) {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return null;

    const payload = token.substring(4, dotIndex); // Strip 'bkd_'
    const signature = token.substring(dotIndex + 1);

    const underscoreIndex = payload.indexOf("_");
    if (underscoreIndex === -1) return null;

    const draftId = payload.substring(0, underscoreIndex);
    const rawSecret = payload.substring(underscoreIndex + 1);

    if (!draftId || !rawSecret || rawSecret.length !== 64) return null;

    const secret = getAiDraftSecret();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${draftId}:${rawSecret}`)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;

    return {
      draftId,
      rawSecret,
      tokenHash: hashDraftSecret(rawSecret),
    };
  }

  // Legacy Base64 token support (for transition / backwards compatibility)
  const parts = token.split(".");
  if (parts.length === 2) {
    const [base64Payload, signature] = parts;
    const expectedHmac = crypto
      .createHmac("sha256", getAiDraftSecret())
      .update(base64Payload)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature, "utf-8");
    const expBuffer = Buffer.from(expectedHmac, "utf-8");
    if (sigBuffer.length !== expBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;

    try {
      const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
      const parsed = JSON.parse(jsonStr) as BookingDraft;
      if (parsed && parsed.id) {
        return {
          draftId: parsed.id,
          rawSecret: "legacy-token",
          tokenHash: parsed.tokenHash || hashDraftSecret(parsed.id),
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Seals a booking draft into a token (backward compatibility helper).
 */
export function sealDraft(draft: BookingDraft): string {
  const entry = inMemoryDraftStore.get(draft.id);
  const rawSecret = entry?.rawSecret || crypto.randomBytes(32).toString("hex");
  const tokenHash = hashDraftSecret(rawSecret);
  inMemoryDraftStore.set(draft.id, {
    draft: { ...draft, tokenHash },
    tokenHash,
    rawSecret,
  });
  return sealDraftToken(draft.id, rawSecret);
}

/**
 * Unseals a draft token (synchronous lookup).
 */
export function unsealDraft(token: string): BookingDraft | null {
  const parsed = parseDraftToken(token);
  if (!parsed) return null;

  const entry = inMemoryDraftStore.get(parsed.draftId);
  if (entry) {
    if (parsed.rawSecret !== "legacy-token" && entry.tokenHash !== parsed.tokenHash) {
      return null;
    }
    return entry.draft;
  }

  // If legacy token, fallback to decoded draft if present in payload
  if (token.includes(".")) {
    const [base64Payload] = token.split(".");
    try {
      const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
      return JSON.parse(jsonStr) as BookingDraft;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Persists a draft to both in-memory store and PostgreSQL `conversational_booking_drafts`.
 */
export async function saveDraftToStorage(
  draft: BookingDraft,
  tokenHash: string,
  rawSecret: string
): Promise<void> {
  // 1. In-memory store
  inMemoryDraftStore.set(draft.id, {
    draft: { ...draft, tokenHash },
    tokenHash,
    rawSecret,
  });

  // 2. PostgreSQL store (via Supabase service client)
  try {
    const serviceClient = createServiceClient();
    if (serviceClient) {
      const { error } = await serviceClient
        .from("conversational_booking_drafts")
        .upsert({
          id: draft.id,
          business_id: draft.businessId,
          conversation_id: draft.conversationId,
          channel: draft.channel,
          token_hash: tokenHash,
          service_id: draft.serviceId || null,
          service_name: draft.serviceName || null,
          service_price_cents: draft.servicePriceCents || null,
          staff_id: draft.staffId || null,
          staff_name: draft.staffName || null,
          staff_preference: draft.staffPreference || "any",
          slot_date: draft.slotDate || null,
          slot_start_time: draft.slotStartTime || null,
          slot_starts_at: draft.slotStartsAtUtc || null,
          customer_name: draft.customerName || null,
          customer_phone: draft.customerPhone || null,
          customer_email: draft.customerEmail || null,
          customer_notes: draft.customerNotes || null,
          stage: draft.stage,
          version: draft.version || 1,
          idempotency_key: draft.idempotencyKey,
          appointment_id: draft.appointmentId || null,
          booking_reference: draft.bookingReference || null,
          management_url: draft.managementUrl || null,
          expires_at: draft.expiresAt,
          updated_at: draft.updatedAt || new Date().toISOString(),
        });

      if (error && process.env.NODE_ENV === "production") {
        console.error("[saveDraftToStorage] PostgreSQL upsert error:", error);
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[saveDraftToStorage] Failed to persist draft to PostgreSQL:", err);
    }
  }
}

/**
 * Loads a draft from PostgreSQL `conversational_booking_drafts` with in-memory fallback.
 */
export async function loadDraftFromStorage(
  draftId: string,
  tokenHash?: string
): Promise<BookingDraft | null> {
  // 1. Try PostgreSQL
  try {
    const serviceClient = createServiceClient();
    if (serviceClient) {
      let query = serviceClient
        .from("conversational_booking_drafts")
        .select("*, businesses(slug)")
        .eq("id", draftId);

      if (tokenHash) {
        query = query.eq("token_hash", tokenHash);
      }

      let { data, error } = await query.maybeSingle();

      // If relationship join failed, retry without join
      if (error || !data) {
        let fallbackQuery = serviceClient
          .from("conversational_booking_drafts")
          .select("*")
          .eq("id", draftId);

        if (tokenHash) {
          fallbackQuery = fallbackQuery.eq("token_hash", tokenHash);
        }

        const fallbackRes = await fallbackQuery.maybeSingle();
        if (fallbackRes.data && !fallbackRes.error) {
          const biz = await serviceClient
            .from("businesses")
            .select("slug")
            .eq("id", fallbackRes.data.business_id)
            .maybeSingle();
          data = {
            ...fallbackRes.data,
            businesses: biz.data ? { slug: biz.data.slug } : undefined,
          };
          error = null;
        }
      }

      if (data && !error) {
        const row = data as Record<string, unknown> & {
          businesses?: { slug?: string };
        };
        const draft: BookingDraft = {
          id: String(row.id),
          businessId: String(row.business_id),
          businessSlug: row.businesses?.slug || "",
          conversationId: String(row.conversation_id || ""),
          channel: (row.channel as BookingDraft["channel"]) || "hosted_web",
          serviceId: row.service_id ? String(row.service_id) : undefined,
          serviceName: row.service_name ? String(row.service_name) : undefined,
          servicePriceCents: row.service_price_cents ? Number(row.service_price_cents) : undefined,
          staffId: row.staff_id ? String(row.staff_id) : null,
          staffName: row.staff_name ? String(row.staff_name) : null,
          staffPreference: (row.staff_preference as "any" | "specific") || "any",
          slotDate: row.slot_date ? String(row.slot_date) : undefined,
          slotStartTime: row.slot_start_time ? String(row.slot_start_time).substring(0, 5) : undefined,
          slotStartsAtUtc: row.slot_starts_at ? String(row.slot_starts_at) : undefined,
          customerName: row.customer_name ? String(row.customer_name) : undefined,
          customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
          customerEmail: row.customer_email ? String(row.customer_email) : undefined,
          customerNotes: row.customer_notes ? String(row.customer_notes) : undefined,
          stage: (row.stage as BookingDraft["stage"]) || "idle",
          version: Number(row.version) || 1,
          idempotencyKey: String(row.idempotency_key || ""),
          tokenHash: row.token_hash ? String(row.token_hash) : undefined,
          appointmentId: row.appointment_id ? String(row.appointment_id) : undefined,
          bookingReference: row.booking_reference ? String(row.booking_reference) : undefined,
          managementUrl: row.management_url ? String(row.management_url) : undefined,
          expiresAt: String(row.expires_at || ""),
          createdAt: String(row.created_at || ""),
          updatedAt: String(row.updated_at || ""),
        };
        return draft;
      }
    }
  } catch {
    // Fall back to in-memory store
  }

  // 2. In-memory store fallback
  const entry = inMemoryDraftStore.get(draftId);
  if (!entry) return null;
  if (tokenHash && entry.tokenHash !== tokenHash) return null;
  return entry.draft;
}

/**
 * Resolves a draft from token by checking in-memory cache first,
 * then falling back to PostgreSQL storage across serverless instances.
 */
export async function getDraftFromToken(
  draftToken: string
): Promise<BookingDraft | null> {
  const parsed = parseDraftToken(draftToken);
  if (!parsed) return null;

  // 1. In-memory check
  const inMem = unsealDraft(draftToken);
  if (inMem) return inMem;

  // 2. Database check
  const fromDb = await loadDraftFromStorage(
    parsed.draftId,
    parsed.rawSecret === "legacy-token" ? undefined : parsed.tokenHash
  );
  if (fromDb) {
    inMemoryDraftStore.set(fromDb.id, {
      draft: fromDb,
      tokenHash: parsed.tokenHash,
      rawSecret: parsed.rawSecret,
    });
    return fromDb;
  }

  return null;
}

/**
 * Atomically transitions a draft's stage if it currently matches one of the expected fromStages and version.
 * Prevents concurrent double-clicks or conflicting state transitions.
 */
export async function updateDraftStageAtomic(
  draftId: string,
  fromStages: BookingDraftStage[],
  toStage: BookingDraftStage,
  expectedVersion: number
): Promise<boolean> {
  const entry = inMemoryDraftStore.get(draftId);
  if (!entry) return false;

  if (!fromStages.includes(entry.draft.stage) || entry.draft.version !== expectedVersion) {
    return false;
  }

  const updated: BookingDraft = {
    ...entry.draft,
    stage: toStage,
    version: entry.draft.version + 1,
    updatedAt: new Date().toISOString(),
  };

  await saveDraftToStorage(updated, entry.tokenHash, entry.rawSecret);
  return true;
}

/**
 * Marks a draft as confirmed in PostgreSQL and memory.
 */
export async function markDraftConfirmed(
  draftId: string,
  appointmentId: string,
  bookingReference: string,
  managementUrl?: string
): Promise<void> {
  const entry = inMemoryDraftStore.get(draftId);
  if (!entry) return;

  const updated: BookingDraft = {
    ...entry.draft,
    stage: "confirmed",
    appointmentId,
    bookingReference,
    managementUrl,
    version: entry.draft.version + 1,
    updatedAt: new Date().toISOString(),
  };

  await saveDraftToStorage(updated, entry.tokenHash, entry.rawSecret);
}

/**
 * Marks a draft as failed or slot unavailable.
 */
export async function markDraftFailed(
  draftId: string,
  stage: "failed" | "slot_unavailable"
): Promise<void> {
  const entry = inMemoryDraftStore.get(draftId);
  if (!entry) return;

  const updated: BookingDraft = {
    ...entry.draft,
    stage,
    version: entry.draft.version + 1,
    updatedAt: new Date().toISOString(),
  };

  await saveDraftToStorage(updated, entry.tokenHash, entry.rawSecret);
}

/**
 * Creates a new server-authoritative booking draft and saves it to storage.
 */
export function createDraft(
  ctx: ChannelContext,
  initialData?: Partial<BookingDraft>
): { draft: BookingDraft; draftToken: string } {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DRAFT_TTL_MINUTES * 60 * 1000);

  const draftId = crypto.randomUUID();
  const rawSecret = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashDraftSecret(rawSecret);
  const idempotencyKey = crypto.randomUUID();

  const draft: BookingDraft = {
    id: draftId,
    businessId: ctx.businessId,
    businessSlug: ctx.businessSlug,
    conversationId: ctx.conversationId,
    channel: ctx.channel,
    staffPreference: initialData?.staffPreference || "any",
    stage: initialData?.stage || "idle",
    version: 1,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    idempotencyKey,
    tokenHash,
    ...initialData,
  };

  const draftToken = sealDraftToken(draftId, rawSecret);
  // Persist asynchronously
  saveDraftToStorage(draft, tokenHash, rawSecret).catch((err) => {
    console.error("[createDraft] Storage persistence warning:", err);
  });

  return { draft, draftToken };
}

/**
 * Updates an existing draft, bumps version, and saves to storage.
 */
export function updateDraft(
  currentDraft: BookingDraft,
  updates: Partial<BookingDraft>
): { draft: BookingDraft; draftToken: string } {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DRAFT_TTL_MINUTES * 60 * 1000);

  const entry = inMemoryDraftStore.get(currentDraft.id);
  const rawSecret = entry?.rawSecret || crypto.randomBytes(32).toString("hex");
  const tokenHash = entry?.tokenHash || hashDraftSecret(rawSecret);

  const updated: BookingDraft = {
    ...currentDraft,
    ...updates,
    version: (currentDraft.version || 1) + 1,
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    tokenHash,
  };

  const draftToken = sealDraftToken(updated.id, rawSecret);
  saveDraftToStorage(updated, tokenHash, rawSecret).catch((err) => {
    console.error("[updateDraft] Storage persistence warning:", err);
  });

  return { draft: updated, draftToken };
}

/**
 * Validates draft integrity, expiration, and tenant ownership.
 */
export async function verifyAndLoadDraft(
  draftId: string,
  draftToken: string,
  expectedBusinessSlug: string
): Promise<{ valid: boolean; draft?: BookingDraft; error?: string; code?: string }> {
  const parsed = parseDraftToken(draftToken);
  if (!parsed) {
    return {
      valid: false,
      error: "Invalid or forged booking draft token.",
      code: "INVALID_DRAFT_TOKEN",
    };
  }

  if (parsed.draftId !== draftId) {
    return {
      valid: false,
      error: "Draft identifier mismatch.",
      code: "DRAFT_ID_MISMATCH",
    };
  }

  const draft = await loadDraftFromStorage(draftId, parsed.rawSecret === "legacy-token" ? undefined : parsed.tokenHash);
  if (!draft) {
    // If not found in storage, check unsealDraft for legacy tokens
    const legacyDraft = unsealDraft(draftToken);
    if (!legacyDraft || legacyDraft.id !== draftId) {
      return {
        valid: false,
        error: "Booking draft not found or session expired.",
        code: "DRAFT_NOT_FOUND",
      };
    }
    return checkDraftTenantAndExpiry(legacyDraft, expectedBusinessSlug);
  }

  return checkDraftTenantAndExpiry(draft, expectedBusinessSlug);
}

function checkDraftTenantAndExpiry(
  draft: BookingDraft,
  expectedBusinessSlug: string
): { valid: boolean; draft?: BookingDraft; error?: string; code?: string } {
  // Cross-tenant verification
  if (
    draft.businessSlug.toLowerCase() !== expectedBusinessSlug.toLowerCase()
  ) {
    return {
      valid: false,
      error: "Tenant ownership violation: Draft does not belong to this salon.",
      code: "CROSS_TENANT_VIOLATION",
    };
  }

  // Expiration check
  if (new Date(draft.expiresAt).getTime() <= Date.now()) {
    return {
      valid: false,
      error: "Your booking draft has expired. Please select a fresh slot to continue.",
      code: "DRAFT_EXPIRED",
    };
  }

  return { valid: true, draft };
}

/**
 * Invokes the database function public.cleanup_expired_conversational_drafts()
 * using service-role access.
 * Returns the number of deleted expired drafts.
 * Zero customer PII is accessed, modified, or logged.
 */
export async function cleanupExpiredConversationalDrafts(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    const now = Date.now();
    let memoryPurged = 0;
    for (const [id, entry] of inMemoryDraftStore.entries()) {
      if (new Date(entry.draft.expiresAt).getTime() < now - 3600000) {
        inMemoryDraftStore.delete(id);
        memoryPurged++;
      }
    }
    return {
      success: true,
      deletedCount: memoryPurged,
    };
  }

  const { data, error } = await serviceClient.rpc(
    "cleanup_expired_conversational_drafts"
  );

  if (error) {
    console.error(
      "[cleanupExpiredConversationalDrafts] RPC invocation error:",
      error.message
    );
    return {
      success: false,
      deletedCount: 0,
      error: error.message,
    };
  }

  const count = typeof data === "number" ? data : 0;
  return {
    success: true,
    deletedCount: count,
  };
}
