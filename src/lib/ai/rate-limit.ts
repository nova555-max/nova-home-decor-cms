const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_BUCKETS = 5_000;

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

function pruneExpiredBuckets(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;

  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
    if (buckets.size <= MAX_BUCKETS * 0.8) break;
  }

  // Still over limit — drop oldest entries (approximate LRU via insertion order).
  while (buckets.size > MAX_BUCKETS) {
    const first = buckets.keys().next().value;
    if (first === undefined) break;
    buckets.delete(first);
  }
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  pruneExpiredBuckets(now);

  let entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, entry);
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true };
}

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

function isLikelyIp(value: string): boolean {
  return IPV4_RE.test(value) || (value.includes(":") && IPV6_RE.test(value));
}

/** Prefer Cloudflare-provided client IP; fall back to forwarded headers. */
export function getClientKey(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp && isLikelyIp(cfIp)) {
    return `ip:${cfIp}`;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const candidate = forwarded.split(",")[0]?.trim();
    if (candidate && isLikelyIp(candidate)) {
      return `ip:${candidate}`;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isLikelyIp(realIp)) {
    return `ip:${realIp}`;
  }

  return "anonymous";
}
