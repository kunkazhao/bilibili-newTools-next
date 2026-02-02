export interface CachePayload<T> {
  data: T
  timestamp: number
  filters: unknown
  pagination?: unknown
  total?: number
}

const memoryCache = new Map<string, CachePayload<unknown>>()

export function buildListCacheKey(baseKey: string, filterHash: string) {
  return `list:${baseKey}:${filterHash}`
}

export function getListCache<T>(key: string): CachePayload<T> | null {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as CachePayload<T>
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload<T>
    memoryCache.set(key, parsed as CachePayload<unknown>)
    return parsed
  } catch {
    return null
  }
}

export function setListCache<T>(key: string, payload: CachePayload<T>) {
  memoryCache.set(key, payload as CachePayload<unknown>)
  try {
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // ignore storage quota errors
  }
}

export function isFresh(cache: { timestamp?: number } | null, ttlMs: number) {
  if (!cache?.timestamp) return false
  return Date.now() - cache.timestamp < ttlMs
}
