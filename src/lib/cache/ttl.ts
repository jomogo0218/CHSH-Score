/**
 * 短 TTL 記憶體快取，降低短時間重複重整造成的 Firestore 讀取。
 * 預設 45 秒內相同 key 不重打遠端。
 */

const DEFAULT_TTL_MS = 45_000;

type Entry<T> = { value: T; expiresAt: number };

const memory = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const hit = memory.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    memory.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setCached<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function withTtlCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<{ data: T; fromCache: boolean }> {
  const cached = getCached<T>(key);
  if (cached !== undefined) {
    return { data: cached, fromCache: true };
  }
  const data = await loader();
  setCached(key, data, ttlMs);
  return { data, fromCache: false };
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memory.clear();
    return;
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

export const FETCH_TTL_MS = DEFAULT_TTL_MS;
