import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { buildListCacheKey, getListCache, isFresh, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"
import { getUserErrorMessage } from "@/lib/errorMessages"

type ListStatus = "idle" | "warmup" | "loading" | "ready" | "refreshing" | "error"

interface ListPipelineOptions<TItem, TFilters, TResponse> {
  cacheKey: string
  ttlMs: number
  pageSize: number
  initialFilters: TFilters
  skipRefreshIfCached?: boolean
  onCacheHit?: (payload: {
    items: TItem[]
    pagination: { hasMore: boolean; nextOffset: number }
    total?: number
  }) => void
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
  const {
    cacheKey,
    ttlMs,
    pageSize,
    initialFilters,
    fetcher,
    mapResponse,
    skipRefreshIfCached = false,
    onCacheHit,
  } = options
  const fetcherRef = useRef(fetcher)
  const mapResponseRef = useRef(mapResponse)
  const [filters, setFilters] = useState<TFilters>(initialFilters)
  const [items, setItems] = useState<TItem[]>([])
  const [status, setStatus] = useState<ListStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextOffset, setNextOffset] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const requestIdRef = useRef(0)
  const itemsCountRef = useRef(0)
  const itemsRef = useRef<TItem[]>([])
  const isMountedRef = useRef(true)

  const filterHash = useMemo(() => stableStringify(filters), [filters])
  const storageKey = useMemo(
    () => buildListCacheKey(cacheKey, filterHash),
    [cacheKey, filterHash]
  )

  const applyCache = useCallback(() => {
    const cached = getListCache<{
      items: TItem[]
      pagination: { hasMore: boolean; nextOffset: number }
      total?: number
    }>(storageKey)
    if (cached && isFresh(cached, ttlMs)) {
      setItems(cached.data.items)
      setHasMore(Boolean(cached.data.pagination?.hasMore))
      setNextOffset(cached.data.pagination?.nextOffset ?? cached.data.items.length)
      onCacheHit?.(cached.data)
      return true
    }
    return false
  }, [storageKey, ttlMs, onCacheHit])

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  useEffect(() => {
    mapResponseRef.current = mapResponse
  }, [mapResponse])

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    const hasItems = itemsCountRef.current > 0
    setStatus(hasItems ? "refreshing" : "loading")
    setError(null)
    try {
      const response = await fetcherRef.current({ filters, offset: 0, limit: pageSize })
      if (!isMountedRef.current || requestId !== requestIdRef.current) return
      const mapped = mapResponseRef.current(response)
      if (!isMountedRef.current) return
      setItems(mapped.items)
      setHasMore(Boolean(mapped.pagination?.hasMore))
      setNextOffset(mapped.pagination?.nextOffset ?? mapped.items.length)
      setStatus("ready")
      setListCache(storageKey, {
        data: { items: mapped.items, pagination: mapped.pagination, total: mapped.total },
        timestamp: Date.now(),
        filters,
      })
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return
      setStatus("error")
      setError(getUserErrorMessage(err, "\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5"))
    }
  }, [filters, pageSize, storageKey])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const response = await fetcherRef.current({ filters, offset: nextOffset, limit: pageSize })
      const mapped = mapResponseRef.current(response)
      const merged = itemsRef.current.concat(mapped.items)
      if (!isMountedRef.current) return
      setItems(merged)
      itemsRef.current = merged
      setHasMore(Boolean(mapped.pagination?.hasMore))
      setNextOffset(mapped.pagination?.nextOffset ?? merged.length)
      setListCache(storageKey, {
        data: { items: merged, pagination: mapped.pagination, total: mapped.total },
        timestamp: Date.now(),
        filters,
      })
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false)
      }
    }
  }, [filters, hasMore, isLoadingMore, nextOffset, pageSize, storageKey])

  useEffect(() => {
    itemsCountRef.current = items.length
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    setStatus("warmup")
    const usedCache = applyCache()
    if (usedCache && skipRefreshIfCached) {
      setStatus("ready")
      return
    }
    refresh().catch(() => {})
    if (usedCache) {
      setStatus("refreshing")
    }
  }, [applyCache, refresh, skipRefreshIfCached, storageKey])

  useEffect(() => {
    isMountedRef.current = true
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
