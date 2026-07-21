const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
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

/** Prefer platform client IP headers (Netlify / Cloudflare). Do not trust raw x-forwarded-for alone. */
export function getClientKey(request: Request): string {
  const candidates = [
    request.headers.get("x-nf-client-connection-ip")?.trim(),
    request.headers.get("cf-connecting-ip")?.trim(),
    request.headers.get("x-real-ip")?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate && isLikelyIp(candidate)) {
      return `ip:${candidate}`;
    }
  }

  // Last resort: first XFF hop only when a platform IP header was absent.
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff && isLikelyIp(xff)) {
    return `xff:${xff}`;
  }

  const ua = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return `ua:${ua}`;
}
