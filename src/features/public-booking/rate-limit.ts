/**
 * BookPilot AI — Phase 1F Public Booking Rate Limiter & Abuse Guard
 * Protects public anonymous booking and availability endpoints from brute-force,
 * spam reservations, and denial-of-service attempts.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private maxEntries = 5000;

  constructor() {
    // Periodically prune stale entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      const timer = setInterval(() => {
        this.prune();
      }, 5 * 60 * 1000);
      if (timer.unref) {
        timer.unref();
      }
    }
  }

  private prune() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Checks and consumes 1 quota token for the given key within a window.
   */
  public checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetAt <= now) {
      if (this.store.size >= this.maxEntries) {
        this.prune();
      }
      const resetAt = now + windowSeconds * 1000;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: maxRequests - 1, resetAt };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetAt: record.resetAt,
    };
  }

  /**
   * Resets rate limit for a key (useful for test isolation)
   */
  public reset(key?: string) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

export const publicBookingRateLimiter = new InMemoryRateLimiter();

export interface CheckPublicRateLimitOptions {
  identifier: string; // IP or client fingerprint
  businessSlug: string;
  action: "availability" | "booking" | "management";
}

/**
 * High-level guard checking per-client and per-business rate limits.
 * Default limits:
 * - availability: 60 requests / minute per client, 300 / minute per salon
 * - booking submission: 5 requests / minute per client, 30 / minute per salon
 * - management: 10 requests / minute per client
 */
export function enforcePublicBookingRateLimit(
  options: CheckPublicRateLimitOptions
): { allowed: boolean; reason?: string; resetAt?: number } {
  const { identifier, businessSlug, action } = options;

  let clientMax = 60;
  let clientWindow = 60;
  let bizMax = 300;
  let bizWindow = 60;

  if (action === "booking") {
    clientMax = 5;
    clientWindow = 60;
    bizMax = 30;
    bizWindow = 60;
  } else if (action === "management") {
    clientMax = 10;
    clientWindow = 60;
  }

  // 1. Check per-client rate limit
  const clientKey = `rate:client:${action}:${identifier}`;
  const clientCheck = publicBookingRateLimiter.checkLimit(
    clientKey,
    clientMax,
    clientWindow
  );

  if (!clientCheck.allowed) {
    return {
      allowed: false,
      reason: "Too many requests. Please slow down and try again in a few moments.",
      resetAt: clientCheck.resetAt,
    };
  }

  // 2. Check per-business rate limit (if applicable)
  if (businessSlug && action !== "management") {
    const bizKey = `rate:biz:${action}:${businessSlug}`;
    const bizCheck = publicBookingRateLimiter.checkLimit(bizKey, bizMax, bizWindow);
    if (!bizCheck.allowed) {
      return {
        allowed: false,
        reason: "Salon booking service is receiving high traffic. Please try again shortly.",
        resetAt: bizCheck.resetAt,
      };
    }
  }

  return { allowed: true };
}
