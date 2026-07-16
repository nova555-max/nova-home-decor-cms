const TTL_MS = 60_000;
const MAX_ENTRIES = 200;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

function prune() {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  if (store.size > MAX_ENTRIES) {
    const keys = [...store.keys()].slice(0, store.size - MAX_ENTRIES);
    for (const key of keys) store.delete(key);
  }
}

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  prune();
}

export function buildCacheKey(parts: Record<string, unknown>): string {
  return JSON.stringify(parts);
}
