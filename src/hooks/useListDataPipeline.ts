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
  const itemsCountRef = useRef(0)
  const isMountedRef = useRef(true)

  const filterHash = useMemo(() => stableStringify(filters), [filters])
  const storageKey = useMemo(
    () => buildListCacheKey(cacheKey, filterHash),
    [cacheKey, filterHash]
  )

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
    const hasItems = itemsCountRef.current > 0
    setStatus(hasItems ? "refreshing" : "loading")
    setError(null)
    try {
      const response = await fetcher({ filters, offset: 0, limit: pageSize })
      if (!isMountedRef.current || requestId !== requestIdRef.current) return
      const mapped = mapResponse(response)
      if (!isMountedRef.current) return
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
      if (!isMountedRef.current || requestId !== requestIdRef.current) return
      setStatus("error")
      setError(err instanceof Error ? err.message : "Load failed")
    }
  }, [filters, pageSize, fetcher, mapResponse, storageKey])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const response = await fetcher({ filters, offset: nextOffset, limit: pageSize })
      const mapped = mapResponse(response)
      const merged = items.concat(mapped.items)
      if (!isMountedRef.current) return
      setItems(merged)
      setHasMore(Boolean(mapped.pagination?.hasMore))
      setNextOffset(mapped.pagination?.nextOffset ?? merged.length)
      setListCache(storageKey, {
        data: { items: merged, pagination: mapped.pagination },
        timestamp: Date.now(),
        filters,
      })
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false)
      }
    }
  }, [fetcher, filters, hasMore, isLoadingMore, items, mapResponse, nextOffset, pageSize, storageKey])

  useEffect(() => {
    itemsCountRef.current = items.length
  }, [items.length])

  useEffect(() => {
    setStatus("warmup")
    const usedCache = applyCache()
    refresh().catch(() => {})
    if (usedCache) {
      setStatus("refreshing")
    }
  }, [applyCache, refresh, storageKey])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      requestIdRef.current += 1
    }
  }, [])

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
