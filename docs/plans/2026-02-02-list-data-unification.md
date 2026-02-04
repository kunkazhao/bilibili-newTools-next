# List Data Pipeline Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify list data loading (cache, TTL, skeleton, dedupe, error handling, pagination) across all list pages with one shared pipeline and no feature flags.

**Architecture:** Introduce a shared list pipeline hook backed by a stable filter hash and a two-layer cache (memory + localStorage). All list pages configure the pipeline with a fetcher and a mapper and consume a unified status model.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, localStorage

---

### Task 1: Add stable filter hashing utility

**Files:**
- Create: `src/lib/stableStringify.ts`
- Test: `src/lib/stableStringify.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { stableStringify } from "./stableStringify"

describe("stableStringify", () => {
  it("sorts object keys deterministically", () => {
    const a = stableStringify({ b: 2, a: 1 })
    const b = stableStringify({ a: 1, b: 2 })
    expect(a).toBe(b)
  })

  it("handles nested objects and arrays", () => {
    const value = stableStringify({ b: [2, 1], a: { d: 4, c: 3 } })
    expect(value).toBe("{\"a\":{\"c\":3,\"d\":4},\"b\":[2,1]}")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- stableStringify.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```ts
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- stableStringify.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stableStringify.ts src/lib/stableStringify.test.ts
git commit -m "test: add stable stringify helper"
```

---

### Task 2: Add unified list cache (memory + localStorage)

**Files:**
- Create: `src/lib/listCache.ts`
- Test: `src/lib/listCache.test.ts`

**Step 1: Write the failing test**

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- listCache.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```ts
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- listCache.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/listCache.ts src/lib/listCache.test.ts
git commit -m "test: add shared list cache"
```

---

### Task 3: Add unified list pipeline hook

**Files:**
- Create: `src/hooks/useListDataPipeline.ts`
- Test: `src/hooks/useListDataPipeline.test.tsx`

**Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react-dom/test-utils"
import { useListDataPipeline } from "./useListDataPipeline"
import { buildListCacheKey, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"

function DemoList({ filters }: { filters: { q: string } }) {
  const { items, status } = useListDataPipeline({
    cacheKey: "demo",
    ttlMs: 3000,
    pageSize: 2,
    initialFilters: filters,
    fetcher: async () => ({ items: ["new"], hasMore: false, nextOffset: 1 }),
    mapResponse: (response) => ({
      items: response.items,
      pagination: { hasMore: response.hasMore, nextOffset: response.nextOffset },
    }),
  })
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="items">{items.join(",")}</div>
    </div>
  )
}

describe("useListDataPipeline", () => {
  it("renders cached items immediately then refreshes", async () => {
    const filterHash = stableStringify({ q: "a" })
    const key = buildListCacheKey("demo", filterHash)
    setListCache(key, {
      data: { items: ["cached"], pagination: { hasMore: false, nextOffset: 1 } },
      timestamp: Date.now(),
      filters: { q: "a" },
    })

    render(<DemoList filters={{ q: "a" }} />)

    expect(screen.getByTestId("items").textContent).toBe("cached")
    expect(screen.getByTestId("status").textContent).toBe("refreshing")

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByTestId("items").textContent).toBe("new")
    expect(screen.getByTestId("status").textContent).toBe("ready")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- useListDataPipeline.test.tsx`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { buildListCacheKey, getListCache, isFresh, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"

type ListStatus = "idle" | "warmup" | "loading" | "ready" | "refreshing" | "error"

interface ListPipelineOptions<TItem, TFilters, TResponse> {
  cacheKey: string
  ttlMs: number
  pageSize: number
  initialFilters: TFilters
  fetcher: (args: { filters: TFilters; offset: number; limit: number }) => Promise<TResponse>
  mapResponse: (response: TResponse) => {
    items: TItem[]
    pagination: { hasMore: boolean; nextOffset: number }
    total?: number
  }
}

interface ListPipelineResult<TItem, TFilters> {
  items: TItem[]
  status: ListStatus
  error: string | null
  filters: TFilters
  setFilters: (next: TFilters) => void
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  isLoadingMore: boolean
  setItems: (next: TItem[]) => void
}

export function useListDataPipeline<TItem, TFilters, TResponse>(
  options: ListPipelineOptions<TItem, TFilters, TResponse>
): ListPipelineResult<TItem, TFilters> {
  const { cacheKey, ttlMs, pageSize, initialFilters, fetcher, mapResponse } = options
  const [filters, setFilters] = useState<TFilters>(initialFilters)
  const [items, setItems] = useState<TItem[]>([])
  const [status, setStatus] = useState<ListStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextOffset, setNextOffset] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const requestIdRef = useRef(0)

  const filterHash = useMemo(() => stableStringify(filters), [filters])
  const storageKey = useMemo(() => buildListCacheKey(cacheKey, filterHash), [cacheKey, filterHash])

  const applyCache = useCallback(() => {
    const cached = getListCache<{ items: TItem[]; pagination: { hasMore: boolean; nextOffset: number } }>(storageKey)
    if (cached && isFresh(cached, ttlMs)) {
      setItems(cached.data.items)
      setHasMore(Boolean(cached.data.pagination?.hasMore))
      setNextOffset(cached.data.pagination?.nextOffset ?? cached.data.items.length)
      return true
    }
    return false
  }, [storageKey, ttlMs])

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setStatus(items.length ? "refreshing" : "loading")
    setError(null)
    try {
      const response = await fetcher({ filters, offset: 0, limit: pageSize })
      if (requestId !== requestIdRef.current) return
      const mapped = mapResponse(response)
      setItems(mapped.items)
      setHasMore(Boolean(mapped.pagination?.hasMore))
      setNextOffset(mapped.pagination?.nextOffset ?? mapped.items.length)
      setStatus("ready")
      setListCache(storageKey, {
        data: { items: mapped.items, pagination: mapped.pagination },
        timestamp: Date.now(),
        filters,
      })
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setStatus("error")
      setError(err instanceof Error ? err.message : "Load failed")
    }
  }, [filters, pageSize, fetcher, mapResponse, storageKey, items.length])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const response = await fetcher({ filters, offset: nextOffset, limit: pageSize })
      const mapped = mapResponse(response)
      const merged = items.concat(mapped.items)
      setItems(merged)
      setHasMore(Boolean(mapped.pagination?.hasMore))
      setNextOffset(mapped.pagination?.nextOffset ?? merged.length)
      setListCache(storageKey, {
        data: { items: merged, pagination: mapped.pagination },
        timestamp: Date.now(),
        filters,
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [fetcher, filters, hasMore, isLoadingMore, items, mapResponse, nextOffset, pageSize, storageKey])

  useEffect(() => {
    setStatus("warmup")
    const usedCache = applyCache()
    refresh().catch(() => {})
    if (usedCache) {
      setStatus("refreshing")
    }
  }, [applyCache, refresh, storageKey])

  return {
    items,
    status,
    error,
    filters,
    setFilters,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
    setItems,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- useListDataPipeline.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useListDataPipeline.ts src/hooks/useListDataPipeline.test.tsx
git commit -m "feat: add unified list data pipeline"
```

---

### Task 4: Migrate Archive list to use pipeline

**Files:**
- Modify: `src/components/archive/ArchivePageContent.tsx`
- Modify: `src/components/archive/ArchivePageView.tsx` (wire status -> skeleton/empty)
- Test: `src/components/archive/ArchivePageContent.categorySwitch.test.tsx` (extend if needed)

**Step 1: Write failing test**

Add a test to assert that `status` drives list skeleton when switching categories (no empty flash):

```ts
expect(lastViewProps.isListLoading).toBe(true)
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ArchivePageContent.categorySwitch.test.tsx`
Expected: FAIL (no unified status yet)

**Step 3: Implement minimal migration**

Replace list loading logic with the pipeline:

```ts
const {
  items,
  status,
  error,
  setFilters,
  loadMore,
  hasMore,
  isLoadingMore,
  setItems,
} = useListDataPipeline<ArchiveItem, { categoryId: string; keyword: string; sort: string }, ItemsResponse>({
  cacheKey: "archive-items",
  ttlMs: 3 * 60 * 1000,
  pageSize: 50,
  initialFilters: { categoryId: "all", keyword: "", sort: "manual" },
  fetcher: ({ filters, offset, limit }) =>
    fetchItems({
      categoryId: filters.categoryId === "all" ? undefined : filters.categoryId,
      limit,
      offset,
      keyword: filters.keyword || undefined,
      sort: filters.sort === "manual" ? "manual" : undefined,
    }),
  mapResponse: (response) => ({
    items: (response.items ?? []).map((item) => normalizeArchiveItem(item as ItemResponse)),
    pagination: {
      hasMore: response.has_more ?? false,
      nextOffset: response.next_offset ?? (response.items?.length ?? 0),
    },
  }),
})

useEffect(() => {
  setFilters({ categoryId: categoryValue, keyword: searchValue, sort: sortValue })
}, [categoryValue, searchValue, sortValue, setFilters])
```

Then map pipeline `status` to view props:

```ts
const isListLoading = status === "loading" || status === "warmup" || status === "refreshing"
const errorMessage = status === "error" ? error ?? "" : undefined
```

**Step 4: Run test to verify it passes**

Run: `npm test -- ArchivePageContent.categorySwitch.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageContent.tsx src/components/archive/ArchivePageView.tsx src/components/archive/ArchivePageContent.categorySwitch.test.tsx
git commit -m "refactor: use list pipeline in archive page"
```

---

### Task 5: Commission list (keep local storage)

**Decision:** Keep commission items sourced from localStorage (no pipeline), per requirement.

**Work:** No code changes required unless later requested to unify UI-only loading states.

---

### Task 6: Migrate Blue Link Map list to use pipeline

**Files:**
- Modify: `src/components/blue-link-map/BlueLinkMapPageContent.tsx`

**Step 1: Write failing test**

Add a test that expects cached blue link entries to appear while refresh is in-flight.

**Step 2: Run test to verify it fails**

Run: `npm test -- BlueLinkMapPageContent.test.tsx`
Expected: FAIL

**Step 3: Implement minimal migration**

```ts
const pipeline = useListDataPipeline<BlueLinkEntry, BlueLinkFilters, BlueLinkResponse>({
  cacheKey: "blue-link-map",
  ttlMs: 3 * 60 * 1000,
  pageSize: 50,
  initialFilters: { categoryId: selectedCategoryId, accountId: selectedAccountId },
  fetcher: ({ filters }) => fetchBlueLinkMapState({ categoryId: filters.categoryId, accountId: filters.accountId }),
  mapResponse: (response) => ({
    items: response.entries ?? [],
    pagination: { hasMore: false, nextOffset: response.entries?.length ?? 0 },
  }),
})
```

**Step 4: Run test to verify it passes**

Run: `npm test -- BlueLinkMapPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/blue-link-map/BlueLinkMapPageContent.tsx
git commit -m "refactor: use list pipeline in blue link map"
```

---

### Task 7: Migrate Comment Blue Link list to use pipeline

**Files:**
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageContent.tsx`

**Step 1: Write failing test**

Add a test that expects cached comment entries to render first.

**Step 2: Run test to verify it fails**

Run: `npm test -- CommentBlueLinkPageContent.test.tsx`
Expected: FAIL

**Step 3: Implement minimal migration**

```ts
const pipeline = useListDataPipeline<CommentEntry, CommentFilters, CommentResponse>({
  cacheKey: "comment-blue-link",
  ttlMs: 3 * 60 * 1000,
  pageSize: 50,
  initialFilters: { accountId: selectedAccountId },
  fetcher: ({ filters }) => fetchCommentBlueLinks({ accountId: filters.accountId }),
  mapResponse: (response) => ({
    items: response.items ?? [],
    pagination: { hasMore: false, nextOffset: response.items?.length ?? 0 },
  }),
})
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CommentBlueLinkPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/comment-blue-link/CommentBlueLinkPageContent.tsx
git commit -m "refactor: use list pipeline in comment blue link"
```

---

### Task 8: Migrate Schemes list and Scheme Detail list

**Files:**
- Modify: `src/components/schemes/SchemesPageContent.tsx`
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`

**Step 1: Write failing test**

Add a test that expects cached schemes to render then refresh.

**Step 2: Run test to verify it fails**

Run: `npm test -- SchemesPageContent.test.tsx`
Expected: FAIL

**Step 3: Implement minimal migration**

```ts
const pipeline = useListDataPipeline<Scheme, SchemeFilters, SchemesResponse>({
  cacheKey: "schemes",
  ttlMs: 3 * 60 * 1000,
  pageSize: 50,
  initialFilters: { categoryId: selectedCategoryId },
  fetcher: ({ filters }) => fetchSchemes({ categoryId: filters.categoryId }),
  mapResponse: (response) => ({
    items: response.schemes ?? [],
    pagination: { hasMore: false, nextOffset: response.schemes?.length ?? 0 },
  }),
})
```

**Step 4: Run test to verify it passes**

Run: `npm test -- SchemesPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/schemes/SchemesPageContent.tsx src/components/schemes/SchemeDetailPageContent.tsx
git commit -m "refactor: use list pipeline in schemes pages"
```

---

### Task 9: Audit remaining list pages and migrate

**Files:**
- Modify: `src/components/benchmark/*`
- Modify: `src/components/recognize/RecognizePageContent.tsx`
- Modify: any list page in `src/components/pages/*`

**Step 1: Locate list usage**

Run: `rg -n "items|list|rows|table" src/components`

**Step 2: Apply pipeline pattern**

Replace local cache + fetch with `useListDataPipeline` using the same shape from Tasks 4-8.

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/benchmark src/components/recognize src/components/pages
git commit -m "refactor: use list pipeline across remaining list pages"
```

---

Plan complete.
