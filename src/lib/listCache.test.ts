import { describe, expect, it } from "vitest"

import { buildListCacheKey, getListCache, isFresh, setListCache } from "./listCache"

interface DemoPayload {
  items: string[]
  pagination: { nextOffset: number; hasMore: boolean }
}

describe("listCache", () => {
  it("writes and reads from localStorage", () => {
    const key = buildListCacheKey("demo", "filters")
    const payload: DemoPayload = { items: ["a"], pagination: { nextOffset: 1, hasMore: false } }
    setListCache(key, { data: payload, timestamp: Date.now(), filters: { q: "a" } })
    const cached = getListCache<DemoPayload>(key)
    expect(cached?.data.items[0]).toBe("a")
  })

  it("detects freshness", () => {
    const fresh = isFresh({ timestamp: Date.now() - 1000 }, 3000)
    const stale = isFresh({ timestamp: Date.now() - 5000 }, 3000)
    expect(fresh).toBe(true)
    expect(stale).toBe(false)
  })
})
