import "server-only";

/**
 * Attempt limiting for the login form.
 *
 * In memory on purpose: this runs as one small instance, and a restart clearing
 * the counters is an acceptable trade for not adding a store. It raises the cost
 * of guessing from unlimited to a handful of tries a minute, which is the whole
 * point behind a URL nobody is meant to find.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function sweep(now: number): void {
  // The map is only ever as large as the attackers in the last window, but
  // sweep anyway so a long uptime cannot grow it without bound.
  if (buckets.size < 1000) return;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export type RateLimit = { allowed: boolean; retryAfterSeconds: number };

export function checkLoginAttempt(key: string): RateLimit {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** A success clears the count, so normal use never trips the limit. */
export function clearLoginAttempts(key: string): void {
  buckets.delete(key);
}
