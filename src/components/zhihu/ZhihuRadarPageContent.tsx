import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/Toast"
import type { CategoryItem } from "@/components/archive/types"
import { useListDataPipeline } from "@/hooks/useListDataPipeline"
import ZhihuRadarPageView from "./ZhihuRadarPageView"
import {
  createZhihuKeyword,
  createZhihuQuestion,
  deleteZhihuQuestion,
  deleteZhihuKeyword,
  fetchZhihuKeywordCounts,
  fetchZhihuKeywords,
  fetchZhihuQuestionStats,
  fetchZhihuQuestions,
  fetchZhihuScrapeStatus,
  runZhihuScrape,
  updateZhihuKeyword,
  type ZhihuKeyword,
  type ZhihuQuestionItem,
} from "./zhihuApi"

const buildCategoryItems = (
  keywords: ZhihuKeyword[],
  counts: Record<string, number> | null
): CategoryItem[] =>
  keywords.map((keyword, index) => ({
    id: keyword.id,
    name: keyword.name,
    sortOrder: (index + 1) * 10,
    count: counts?.[keyword.id] ?? 0,
  }))

const CACHE_KEYS = {
  keywords: "zhihu_keywords_cache_v1",
  counts: "zhihu_keyword_counts_cache_v1",
}

const CACHE_TTL = {
  keywords: 5 * 60 * 1000,
  counts: 3 * 60 * 1000,
}

type CachePayload<T> = { timestamp: number; data: T }

const getCache = <T,>(key: string) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as CachePayload<T>
  } catch {
    return null
  }
}

const setCache = <T,>(key: string, payload: T) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ timestamp: Date.now(), data: payload })
    )
  } catch {
    // ignore
  }
}

const isFresh = (cache: CachePayload<unknown> | null, ttl: number) => {
  if (!cache?.timestamp) return false
  return Date.now() - cache.timestamp < ttl
}

export default function ZhihuRadarPageContent() {
  const { showToast } = useToast()
  const [keywords, setKeywords] = useState<ZhihuKeyword[]>([])
  const [keywordCounts, setKeywordCounts] = useState<Record<string, number> | null>(null)
  const [keywordTotal, setKeywordTotal] = useState(0)
  const [isKeywordLoading, setIsKeywordLoading] = useState(false)
  const [isCountLoading, setIsCountLoading] = useState(false)
  const [activeKeywordId, setActiveKeywordId] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [listTotal, setListTotal] = useState(0)
  const [keywordManagerOpen, setKeywordManagerOpen] = useState(false)
  const [trendState, setTrendState] = useState({
    open: false,
    title: "",
    stats: [],
    loading: false,
  })
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [updateKeywordId, setUpdateKeywordId] = useState("all")
  const [updateSubmitting, setUpdateSubmitting] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addQuestionUrl, setAddQuestionUrl] = useState("")
  const [addKeywordId, setAddKeywordId] = useState("")
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [progressState, setProgressState] = useState({
    open: false,
    status: "running" as "running" | "done" | "error",
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
  })
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const lastFetchOffsetRef = useRef(0)
  const pollingRef = useRef<number | null>(null)
  const hasDeferredCountLoadedRef = useRef(false)

  const loadKeywords = useCallback(async () => {
    setIsKeywordLoading(true)
    try {
      const data = await fetchZhihuKeywords()
      const list = Array.isArray(data?.keywords) ? data.keywords : []
      setKeywords(list)
      setCache(CACHE_KEYS.keywords, list)
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载关键词失败"
      showToast(message, "error")
    } finally {
      setIsKeywordLoading(false)
    }
  }, [showToast])

  const loadCounts = useCallback(async () => {
    setIsCountLoading(true)
    try {
      const data = await fetchZhihuKeywordCounts()
      const counts = data?.counts ?? {}
      const total = typeof data?.total === "number" ? data.total : 0
      setKeywordCounts(counts)
      setKeywordTotal(total)
      setCache(CACHE_KEYS.counts, { counts, total })
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载关键词数量失败"
      showToast(message, "error")
    } finally {
      setIsCountLoading(false)
    }
  }, [showToast])

  const {
    items,
    status: listStatus,
    error: listError,
    setFilters,
    setItems,
    refresh: refreshQuestions,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useListDataPipeline<
    ZhihuQuestionItem,
    { keywordId: string; keyword: string },
    {
      items: ZhihuQuestionItem[]
      total?: number
      pagination?: {
        offset: number
        limit: number
        has_more: boolean
        next_offset: number
        total: number
      }
    }
  >({
    cacheKey: "zhihu-questions",
    ttlMs: 3 * 60 * 1000,
    pageSize: 50,
    initialFilters: { keywordId: "all", keyword: "" },
    skipRefreshIfCached: true,
    onCacheHit: (cached) => {
      const total =
        typeof cached.total === "number" ? cached.total : cached.items.length
      setListTotal(total)
    },
    fetcher: async ({ filters, offset, limit }) => {
      lastFetchOffsetRef.current = offset
      return fetchZhihuQuestions({
        keywordId: filters.keywordId === "all" ? undefined : filters.keywordId,
        q: filters.keyword || undefined,
        limit,
        offset,
      })
    },
    mapResponse: (response) => {
      const list = Array.isArray(response?.items) ? response.items : []
      const pagination = response?.pagination
      const total = pagination?.total ?? response?.total ?? list.length
      setListTotal(total)
      const nextOffset =
        pagination?.next_offset ?? lastFetchOffsetRef.current + list.length
      const hasMore = pagination?.has_more ?? nextOffset < total
      return {
        items: list,
        pagination: { hasMore, nextOffset },
        total,
      }
    },
  })

  useEffect(() => {
    const cached = getCache<ZhihuKeyword[]>(CACHE_KEYS.keywords)
    if (isFresh(cached, CACHE_TTL.keywords)) {
      setKeywords(cached.data)
    }
    loadKeywords()
  }, [loadKeywords])

  useEffect(() => {
    const cached = getCache<{ counts: Record<string, number>; total: number }>(
      CACHE_KEYS.counts
    )
    if (isFresh(cached, CACHE_TTL.counts)) {
      setKeywordCounts(cached.data.counts)
      setKeywordTotal(cached.data.total)
    }
  }, [])

  useEffect(() => {
    if (hasDeferredCountLoadedRef.current) return
    const shouldLoadCounts =
      listStatus === "ready" ||
      listStatus === "error" ||
      (listStatus === "refreshing" && items.length > 0)
    if (!shouldLoadCounts) return
    hasDeferredCountLoadedRef.current = true
    loadCounts()
  }, [items.length, listStatus, loadCounts])

  useEffect(() => {
    setFilters({ keywordId: activeKeywordId, keyword: searchValue.trim() })
  }, [activeKeywordId, searchValue, setFilters])

  useEffect(() => {
    if (!listError) return
    showToast(listError, "error")
  }, [listError, showToast])

  useEffect(() => {
    if (activeKeywordId === "all") return
    if (!keywords.some((keyword) => keyword.id === activeKeywordId)) {
      setActiveKeywordId("all")
    }
  }, [activeKeywordId, keywords])

  const categoryItems = useMemo(
    () => buildCategoryItems(keywords, keywordCounts),
    [keywords, keywordCounts]
  )

  const handleSaveKeywords = useCallback(
    async (nextCategories: CategoryItem[]) => {
      const existingMap = new Map(keywords.map((item) => [item.id, item]))
      const nextMap = new Map(nextCategories.map((item) => [item.id, item]))
      const toCreate = nextCategories.filter((item) => !existingMap.has(item.id))
      const toUpdate = nextCategories.filter((item) => {
        const current = existingMap.get(item.id)
        return current && current.name !== item.name
      })
      const toDelete = keywords.filter((item) => !nextMap.has(item.id))

      try {
        for (const item of toCreate) {
          await createZhihuKeyword(item.name.trim())
        }
        for (const item of toUpdate) {
          await updateZhihuKeyword(item.id, item.name.trim())
        }
        for (const item of toDelete) {
          await deleteZhihuKeyword(item.id)
        }
        await loadKeywords()
        await loadCounts()
        await refreshQuestions()
        if (activeKeywordId !== "all" && !nextMap.has(activeKeywordId)) {
          setActiveKeywordId("all")
        }
        showToast("关键词已更新", "success")
      } catch (error) {
        const message = error instanceof Error ? error.message : "更新关键词失败"
        showToast(message, "error")
      }
    },
    [activeKeywordId, keywords, loadCounts, loadKeywords, refreshQuestions, showToast]
  )

  const handleOpenTrend = useCallback(
    async (item: ZhihuQuestionItem) => {
      const title = item.title || "趋势分析"
      setTrendState({ open: true, title, stats: [], loading: true })
      try {
        const data = await fetchZhihuQuestionStats(item.id)
        setTrendState((prev) => ({
          ...prev,
          stats: Array.isArray(data?.stats) ? data.stats : [],
          loading: false,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载趋势失败"
        showToast(message, "error")
        setTrendState((prev) => ({ ...prev, loading: false }))
      }
    },
    [showToast]
  )

  const handleDeleteQuestion = useCallback(
    async (item: ZhihuQuestionItem) => {
      if (!item?.id || deletingId) return
      setDeletingId(item.id)
      try {
        await deleteZhihuQuestion(item.id)
        const nextItems = items.filter((row) => row.id !== item.id)
        setItems(nextItems)
        setListTotal((prev) => Math.max(0, prev - 1))
        await loadCounts()
        await refreshQuestions()
        showToast("已删除问题", "success")
      } catch (error) {
        const message = error instanceof Error ? error.message : "删除失败"
        showToast(message, "error")
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId, items, loadCounts, refreshQuestions, setItems, showToast]
  )

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const updateOptions = useMemo(
    () => [{ id: "all", name: "??" }, ...keywords.map((item) => ({ id: item.id, name: item.name }))],
    [keywords]
  )

  const addOptions = useMemo(
    () => keywords.map((item) => ({ id: item.id, name: item.name })),
    [keywords]
  )

  useEffect(() => {
    if (updateKeywordId === "all") return
    if (!updateOptions.some((item) => item.id === updateKeywordId)) {
      setUpdateKeywordId("all")
    }
  }, [updateKeywordId, updateOptions])

  useEffect(() => {
    if (!addKeywordId) return
    if (!addOptions.some((item) => item.id === addKeywordId)) {
      setAddKeywordId("")
    }
  }, [addKeywordId, addOptions])

  const handleOpenAddDialog = useCallback(() => {
    const fallbackKeywordId =
      activeKeywordId !== "all" && addOptions.some((item) => item.id === activeKeywordId)
        ? activeKeywordId
        : addOptions[0]?.id ?? ""
    setAddKeywordId((prev) =>
      prev && addOptions.some((item) => item.id === prev) ? prev : fallbackKeywordId
    )
    setAddDialogOpen(true)
  }, [activeKeywordId, addOptions])

  const handleRunUpdate = useCallback(async () => {
    if (updateSubmitting) return
    setUpdateSubmitting(true)
    try {
      const keywordId = updateKeywordId === "all" ? undefined : updateKeywordId
      const data = await runZhihuScrape({ keywordId })
      const jobId = data?.job_id
      if (!jobId) {
        throw new Error("No job ID returned")
      }
      setActiveJobId(jobId)
      setProgressState({
        open: true,
        status: "running",
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
      })
      setUpdateDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed"
      showToast(message, "error")
    } finally {
      setUpdateSubmitting(false)
    }
  }, [showToast, updateKeywordId, updateSubmitting])

  const handleAddQuestion = useCallback(async () => {
    if (addSubmitting) return

    const questionUrl = addQuestionUrl.trim()
    if (!questionUrl) {
      showToast("Please enter question URL", "error")
      return
    }

    if (!addKeywordId) {
      showToast("Please select a keyword category", "error")
      return
    }

    setAddSubmitting(true)
    try {
      const data = await createZhihuQuestion({
        questionUrl,
        keywordId: addKeywordId,
      })
      const nextItem = data?.item
      if (!nextItem?.id) {
        throw new Error("No question data returned")
      }

      const keywordName =
        nextItem.first_keyword ||
        addOptions.find((item) => item.id === addKeywordId)?.name ||
        ""
      const normalizedItem: ZhihuQuestionItem = {
        ...nextItem,
        first_keyword: keywordName,
      }

      const allowsCurrentFilter =
        activeKeywordId === "all" || activeKeywordId === addKeywordId
      const searchText = searchValue.trim().toLowerCase()
      const matchesSearch =
        !searchText || String(normalizedItem.title || "").toLowerCase().includes(searchText)

      const existsInCurrentList = items.some((item) => item.id === normalizedItem.id)
      if (allowsCurrentFilter && matchesSearch) {
        const nextItems = [
          normalizedItem,
          ...items.filter((item) => item.id !== normalizedItem.id),
        ]
        setItems(nextItems)
      }

      if (data?.is_new && !existsInCurrentList) {
        setListTotal((prev) => prev + 1)
      }

      setAddDialogOpen(false)
      setAddQuestionUrl("")
      await loadCounts()
      showToast("Question added and stats fetched", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Add question failed"
      showToast(message, "error")
    } finally {
      setAddSubmitting(false)
    }
  }, [
    activeKeywordId,
    addKeywordId,
    addOptions,
    addQuestionUrl,
    addSubmitting,
    items,
    loadCounts,
    searchValue,
    setItems,
    showToast,
  ])

  useEffect(() => {
    if (!activeJobId) return
    let cancelled = false
    const poll = async () => {
      try {
        const data = await fetchZhihuScrapeStatus(activeJobId)
        if (cancelled) return
        setProgressState((prev) => ({
          ...prev,
          open: true,
          status: data.status === "error" ? "error" : data.status === "done" ? "done" : "running",
          total: data.total ?? prev.total,
          processed: data.processed ?? prev.processed,
          success: data.success ?? prev.success,
          failed: data.failed ?? prev.failed,
        }))
        if (data.status === "done") {
          stopPolling()
          setActiveJobId(null)
          await refreshQuestions()
          await loadCounts()
          showToast("数据更新完成", "success")
        } else if (data.status === "error") {
          stopPolling()
          setActiveJobId(null)
          showToast(data.error || "数据更新失败", "error")
        }
      } catch (error) {
        if (cancelled) return
        stopPolling()
        setActiveJobId(null)
        const message = error instanceof Error ? error.message : "数据更新失败"
        showToast(message, "error")
      }
    }

    poll()
    pollingRef.current = window.setInterval(poll, 2000)
    return () => {
      cancelled = true
      stopPolling()
    }
  }, [activeJobId, loadCounts, refreshQuestions, showToast, stopPolling])

  const isListLoading = listStatus === "loading" || listStatus === "warmup"
  const isRefreshing = listStatus === "refreshing"
  const isUsingCache = listStatus === "refreshing"

  return (
    <ZhihuRadarPageView
      keywords={categoryItems}
      activeKeywordId={activeKeywordId}
      items={items}
      isKeywordLoading={isKeywordLoading}
      listLoading={isListLoading}
      isRefreshing={isRefreshing}
      isUsingCache={isUsingCache}
      listTotal={listTotal}
      allCount={keywordTotal || listTotal}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMore}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onSelectKeyword={setActiveKeywordId}
      onOpenKeywordManager={() => setKeywordManagerOpen(true)}
      onOpenAddQuestion={handleOpenAddDialog}
      isKeywordManagerOpen={keywordManagerOpen}
      onCloseKeywordManager={() => setKeywordManagerOpen(false)}
      onSaveKeywords={handleSaveKeywords}
      onOpenTrend={handleOpenTrend}
      onDeleteQuestion={handleDeleteQuestion}
      deletingId={deletingId}
      trendDialog={{
        ...trendState,
        onOpenChange: (open) =>
          setTrendState((prev) => ({
            ...prev,
            open,
            loading: open ? prev.loading : false,
            stats: open ? prev.stats : [],
            title: open ? prev.title : "",
          })),
      }}
      updateDialog={{
        open: updateDialogOpen,
        keywordId: updateKeywordId,
        options: updateOptions,
        submitting: updateSubmitting,
        onOpenChange: setUpdateDialogOpen,
        onKeywordChange: setUpdateKeywordId,
        onConfirm: handleRunUpdate,
      }}
      addQuestionDialog={{
        open: addDialogOpen,
        questionUrl: addQuestionUrl,
        keywordId: addKeywordId,
        options: addOptions,
        submitting: addSubmitting,
        onOpenChange: setAddDialogOpen,
        onQuestionUrlChange: setAddQuestionUrl,
        onKeywordChange: setAddKeywordId,
        onConfirm: handleAddQuestion,
      }}
      progressDialog={{
        open: progressState.open,
        status: progressState.status,
        total: progressState.total,
        processed: progressState.processed,
        success: progressState.success,
        failed: progressState.failed,
        onOpenChange: (open) => {
          if (progressState.status === "running") return
          setProgressState((prev) => ({ ...prev, open }))
        },
      }}
    />
  )
}
