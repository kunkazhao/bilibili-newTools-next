import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ArchivePageView from "@/components/archive/ArchivePageView"
import { useToast } from "@/components/Toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as XLSX from "xlsx"
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  fetchCategories,
  fetchCategoryCounts,
  fetchItems,
  updateCategory,
  updateItem,
} from "@/components/archive/archiveApi"
import type { CategoryItem } from "@/components/archive/types"

interface ArchiveItem {
  id: string
  uid: string
  title: string
  price: number
  commission: number
  commissionRate: number
  image: string
  categoryId: string
  blueLink: string
  accountName: string
  remark: string
  isFocused: boolean
  spec: Record<string, string>
}

const META_KEYS = {
  blueLink: "_blue_link",
  featured: "_featured",
  sortOrder: "_sort_order",
  shopName: "_shop_name",
  sales30: "_s_30",
  comments: "_comments",
  sourceLink: "_source_link",
  promoLink: "_promo_link",
}

const padSortOrder = (value: number) => String(value).padStart(6, "0")

const CACHE_KEYS = {
  categories: "sourcing_category_cache_v1",
  items: "sourcing_items_cache_v1",
  categoryItems: "sourcing_category_items_cache_v1",
  categoryCounts: "sourcing_category_counts_cache_v1",
}

const CACHE_TTL = {
  categories: 5 * 60 * 1000,
  items: 5 * 60 * 1000,
  categoryItems: 3 * 60 * 1000,
  categoryCounts: 3 * 60 * 1000,
}

const CATEGORY_CACHE_LIMIT = 20
const CHUNK_SIZE = 50

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

const sanitizeFilename = (value: string) => {
  const base = String(value || "导出").trim() || "导出"
  return base.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60)
}

const getTimestamp = () => {
  const now = new Date()
  return (
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "_" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0")
  )
}

const buildSpecDetailText = (
  params: Record<string, string>,
  separator = " / ",
  limit = 8
) => {
  if (!params || typeof params !== "object") return ""
  return Object.entries(params)
    .filter(([key, value]) => key && value !== undefined && value !== null && value !== "")
    .slice(0, limit)
    .map(([key, value]) => `${key}: ${value}`)
    .join(separator)
}

const extractDigitsFromLink = (link: string) => {
  if (!link) return ""
  const cleaned = link.trim()
  const exactMatch = cleaned.match(/item\.jd\.com\/(\d+)\.html/i)
  if (exactMatch) return exactMatch[1]
  const paramMatch = cleaned.match(/(?:skuId|sku|productId|wareId|id)[=\/](\d{6,})/i)
  if (paramMatch) return paramMatch[1]
  const htmlMatch = cleaned.match(/\/(\d{6,})\.html/i)
  if (htmlMatch) return htmlMatch[1]
  const allDigits = cleaned.match(/(\d{6,})/g)
  if (allDigits && allDigits.length > 0) {
    return allDigits.sort((a, b) => b.length - a.length)[0]
  }
  return ""
}

export default function ArchivePage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<ArchiveItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number> | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isCategoryLoading, setIsCategoryLoading] = useState(true)
  const [isListLoading, setIsListLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextOffset, setNextOffset] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [searchValue, setSearchValue] = useState("")
  const [categoryValue, setCategoryValue] = useState("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [manualOrder, setManualOrder] = useState<string[]>([])
  const [sortValue, setSortValue] = useState("manual")
  const [dragId, setDragId] = useState<string | null>(null)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [isPresetFieldsOpen, setIsPresetFieldsOpen] = useState(false)
  const [isProductFormOpen, setIsProductFormOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [isClearOpen, setIsClearOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importState, setImportState] = useState({
    status: "idle" as "idle" | "running" | "done",
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    failures: [] as { link: string; title: string; reason: string }[],
  })
  const [usingCache, setUsingCache] = useState(false)
  const [visibleItems, setVisibleItems] = useState<ArchiveItem[]>([])
  const hasHydratedCategoriesRef = useRef(false)
  const lastItemsCacheKeyRef = useRef<string | null>(null)
  const chunkTimerRef = useRef<number | null>(null)

  const applyCountsToCategories = useCallback(
    (nextCategories: CategoryItem[], counts: Record<string, number> | null) => {
      if (!counts) return nextCategories
      return nextCategories.map((category) => {
        const nextCount = counts[category.id]
        if (typeof nextCount !== "number") return category
        return { ...category, count: nextCount }
      })
    },
    []
  )

  const orderedItems = useMemo(() => {
    if (sortValue === "manual" && manualOrder.length > 0) {
      const orderMap = new Map(manualOrder.map((id, index) => [id, index]))
      return [...items].sort((a, b) => {
        const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
        const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
        return aIndex - bIndex
      })
    }
    return [...items].sort((a, b) => a.price - b.price)
  }, [items, manualOrder, sortValue])

  const priceBounds = useMemo<[number, number]>(() => {
    if (items.length === 0) return [0, 0]
    const values = items.map((item) => item.price).filter((value) => Number.isFinite(value))
    if (!values.length) return [0, 0]
    return [Math.min(...values), Math.max(...values)]
  }, [items])

  const safePriceRange = useMemo<[number, number]>(() => {
    const minBound = Math.min(priceBounds[0], priceBounds[1])
    const maxBound = Math.max(priceBounds[0], priceBounds[1])
    const nextMin = Math.min(Math.max(priceRange[0], minBound), maxBound)
    const nextMax = Math.min(Math.max(priceRange[1], minBound), maxBound)
    if (nextMin <= nextMax) return [nextMin, nextMax]
    return [nextMax, nextMin]
  }, [priceBounds, priceRange])

  const filteredItems = useMemo(() => {
    return orderedItems.filter((item) => {
      const matchesSearch =
        searchValue.trim() === "" ||
        item.title.toLowerCase().includes(searchValue.toLowerCase())
      const matchesCategory =
        categoryValue === "all" || item.categoryId === categoryValue
      const matchesMin = item.price >= safePriceRange[0]
      const matchesMax = item.price <= safePriceRange[1]

      return matchesSearch && matchesCategory && matchesMin && matchesMax
    })
  }, [orderedItems, searchValue, categoryValue, safePriceRange])

  const selectedCategoryName = useMemo(() => {
    if (categoryValue === "all") return "全部"
    const category = categories.find((item) => item.id === categoryValue)
    return category?.name || "分类"
  }, [categoryValue, categories])

  useEffect(() => {
    if (chunkTimerRef.current) {
      window.clearTimeout(chunkTimerRef.current)
      chunkTimerRef.current = null
    }
    if (!filteredItems.length) {
      setVisibleItems([])
      return
    }
    let index = 0
    const next = () => {
      index += CHUNK_SIZE
      setVisibleItems(filteredItems.slice(0, index))
      if (index < filteredItems.length) {
        chunkTimerRef.current = window.setTimeout(next, 16)
      }
    }
    setVisibleItems(filteredItems.slice(0, CHUNK_SIZE))
    if (filteredItems.length > CHUNK_SIZE) {
      chunkTimerRef.current = window.setTimeout(next, 16)
    }
  }, [filteredItems])

  useEffect(() => {
    if (priceBounds[0] === 0 && priceBounds[1] === 0) return
    setPriceRange((prev) => {
      if (prev[0] === 0 && prev[1] === 0) {
        const next: [number, number] = [priceBounds[0], priceBounds[1]]
        if (prev[0] === next[0] && prev[1] === next[1]) return prev
        return next
      }
      const next: [number, number] = [
        Math.max(priceBounds[0], prev[0]),
        Math.min(priceBounds[1], prev[1]),
      ]
      if (prev[0] === next[0] && prev[1] === next[1]) return prev
      return next
    })
  }, [priceBounds])

  const handlePriceRangeChange = (next: [number, number]) => {
    setPriceRange((prev) => {
      if (prev[0] === next[0] && prev[1] === next[1]) return prev
      return next
    })
  }

  const hydrateCategoriesFromCache = useCallback(() => {
    if (hasHydratedCategoriesRef.current) return false
    hasHydratedCategoriesRef.current = true
    let didUseCache = false
    const categoryCache = getCache<CategoryItem[]>(CACHE_KEYS.categories)
    if (categoryCache && isFresh(categoryCache, CACHE_TTL.categories)) {
      const cachedCategories = Array.isArray(categoryCache.data)
        ? categoryCache.data
        : []
      setCategories(applyCountsToCategories(cachedCategories, categoryCounts))
      setIsCategoryLoading(false)
      didUseCache = true
    }

    const countsCache = getCache<Record<string, number>>(CACHE_KEYS.categoryCounts)
    if (countsCache && isFresh(countsCache, CACHE_TTL.categoryCounts)) {
      setCategoryCounts(countsCache.data)
      setCategories((prev) => applyCountsToCategories(prev, countsCache.data))
    }
    return didUseCache
  }, [applyCountsToCategories, categoryCounts])

  const hydrateItemsFromCache = useCallback(() => {
    const cacheKey = `${categoryValue}:${searchValue}`
    if (lastItemsCacheKeyRef.current === cacheKey) return false
    lastItemsCacheKeyRef.current = cacheKey

    let didUseCache = false
    if (searchValue.trim() === "" && categoryValue === "all") {
      const itemsCache = getCache<{
        items: ArchiveItem[]
        pagination: { offset: number; limit: number; hasMore: boolean }
        manualOrder?: string[]
      }>(CACHE_KEYS.items)
      if (itemsCache && isFresh(itemsCache, CACHE_TTL.items)) {
        setItems(itemsCache.data.items)
        setHasMore(Boolean(itemsCache.data.pagination?.hasMore))
        setNextOffset(itemsCache.data.pagination?.offset ?? 0)
        if (itemsCache.data.manualOrder?.length) {
          setManualOrder(itemsCache.data.manualOrder)
          setSortValue("manual")
        }
        setIsListLoading(false)
        didUseCache = true
      }
    }

    if (categoryValue !== "all") {
      const categoryItemsCache = getCache<Record<string, { items: ArchiveItem[]; pagination: { offset: number; limit: number; hasMore: boolean } }>>(CACHE_KEYS.categoryItems)
      if (categoryItemsCache && isFresh(categoryItemsCache, CACHE_TTL.categoryItems)) {
        const payload = categoryItemsCache.data?.[categoryValue]
        if (payload?.items?.length) {
          setItems(payload.items)
          setHasMore(Boolean(payload.pagination?.hasMore))
          setNextOffset(payload.pagination?.offset ?? 0)
          setIsListLoading(false)
          didUseCache = true
        }
      }
    }

    setUsingCache(didUseCache)
    if (didUseCache) {
      setIsLoading(false)
    }
    return didUseCache
  }, [categoryValue, searchValue])

  const loadCategories = useCallback(async () => {
    setIsCategoryLoading(true)
    try {
      const response = await fetchCategories({ includeCounts: false })
      const normalized = (response.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order ?? 0,
        specFields: category.spec_fields ?? [],
        count: category.item_count ?? 0,
      }))
      setCategories(applyCountsToCategories(normalized, categoryCounts))
      setCache(CACHE_KEYS.categories, normalized)
    } catch {
      // ignore
    } finally {
      setIsCategoryLoading(false)
    }
  }, [applyCountsToCategories, categoryCounts])

  const loadCategoryCounts = useCallback(async () => {
    try {
      const response = await fetchCategoryCounts()
      if (!response?.counts) return
      setCategoryCounts(response.counts)
      setCategories((prev) => applyCountsToCategories(prev, response.counts))
      setCache(CACHE_KEYS.categoryCounts, response.counts)
    } catch {
      // ignore
    }
  }, [applyCountsToCategories])

  const saveItemsCache = useCallback((payload: {
    items: ArchiveItem[]
    pagination: { offset: number; limit: number; hasMore: boolean }
    manualOrder?: string[]
    categoryId: string
  }) => {
    if (payload.categoryId === "all") {
      setCache(CACHE_KEYS.items, {
        items: payload.items,
        pagination: payload.pagination,
        manualOrder: payload.manualOrder,
      })
      return
    }
    const existing = getCache<Record<string, { items: ArchiveItem[]; pagination: { offset: number; limit: number; hasMore: boolean } }>>(CACHE_KEYS.categoryItems)
    const next: Record<string, { items: ArchiveItem[]; pagination: { offset: number; limit: number; hasMore: boolean } }> = {
      ...(existing?.data ?? {}),
      [payload.categoryId]: {
        items: payload.items,
        pagination: payload.pagination,
      },
    }
    const entries = Object.entries(next)
      .sort((a, b) => (b[1].pagination.offset ?? 0) - (a[1].pagination.offset ?? 0))
      .slice(0, CATEGORY_CACHE_LIMIT)
    const trimmed = Object.fromEntries(entries)
    setCache(CACHE_KEYS.categoryItems, trimmed)
  }, [])

  const loadItems = useCallback(
    async ({ preserve }: { preserve?: boolean } = {}) => {
      if (preserve) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
        setIsListLoading(true)
        setErrorMessage(undefined)
        setHasMore(true)
        setNextOffset(0)
      }
      try {
        const response = await fetchItems({
          categoryId: categoryValue === "all" ? undefined : categoryValue,
          limit: 50,
          offset: 0,
          keyword: searchValue || undefined,
          sort: sortValue === "manual" ? "manual" : undefined,
        })
        const normalizedItems: ArchiveItem[] = (response.items ?? []).map((item) => {
          const spec = item.spec ?? {}
          const rawPrice = Number(item.price ?? 0)
          const rawCommission = Number(item.commission ?? 0)
          const rawCommissionRate = Number(item.commission_rate ?? 0)
          return {
            id: item.id,
            uid: (item as any).uid ?? "",
            title: item.title ?? "",
            price: Number.isFinite(rawPrice) ? rawPrice : 0,
            commission: Number.isFinite(rawCommission) ? rawCommission : 0,
            commissionRate: Number.isFinite(rawCommissionRate)
              ? rawCommissionRate
              : 0,
            image: item.cover_url ?? "",
            categoryId: item.category_id,
            blueLink: spec[META_KEYS.blueLink] || item.link || "",
            accountName: spec[META_KEYS.shopName] || "",
            remark: item.remark ?? "",
            isFocused: Boolean(spec[META_KEYS.featured]),
            spec,
          }
        })
        const manualIds = normalizedItems
          .filter((item) => item.spec[META_KEYS.sortOrder])
          .sort((a, b) => {
            const aOrder = Number(a.spec[META_KEYS.sortOrder] || 0)
            const bOrder = Number(b.spec[META_KEYS.sortOrder] || 0)
            return aOrder - bOrder
          })
          .map((item) => item.id)
        setItems(normalizedItems)
        if (manualIds.length > 0) {
          setManualOrder(manualIds)
          setSortValue("manual")
        }
        setHasMore(response.has_more ?? false)
        setNextOffset(response.next_offset ?? normalizedItems.length)

        saveItemsCache({
          items: normalizedItems,
          pagination: {
            offset: response.next_offset ?? normalizedItems.length,
            limit: 50,
            hasMore: response.has_more ?? false,
          },
          manualOrder: manualIds,
          categoryId: categoryValue,
        })
      } catch (error) {
        if (!preserve) {
          setErrorMessage(error instanceof Error ? error.message : "加载失败")
        }
      } finally {
        if (preserve) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
          setIsListLoading(false)
        }
      }
    },
    [categoryValue, searchValue, sortValue, saveItemsCache]
  )

  useEffect(() => {
    hydrateCategoriesFromCache()
    loadCategories()
    if ("requestIdleCallback" in window) {
      ;(window as any).requestIdleCallback(
        () => loadCategoryCounts(),
        { timeout: 1500 }
      )
    } else {
      setTimeout(() => loadCategoryCounts(), 400)
    }
  }, [hydrateCategoriesFromCache, loadCategories, loadCategoryCounts])

  useEffect(() => {
    const usedCache = hydrateItemsFromCache()
    if (usedCache && "requestIdleCallback" in window) {
      ;(window as any).requestIdleCallback(
        () => loadItems({ preserve: true }),
        { timeout: 1500 }
      )
    } else {
      loadItems({ preserve: usedCache })
    }
  }, [categoryValue, searchValue, sortValue, hydrateItemsFromCache, loadItems])

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const response = await fetchItems({
        categoryId: categoryValue === "all" ? undefined : categoryValue,
        limit: 50,
        offset: nextOffset,
        keyword: searchValue || undefined,
        sort: sortValue === "manual" ? "manual" : undefined,
      })
      const normalizedItems: ArchiveItem[] = (response.items ?? []).map((item) => {
        const spec = item.spec ?? {}
        const rawPrice = Number(item.price ?? 0)
        const rawCommission = Number(item.commission ?? 0)
        const rawCommissionRate = Number(item.commission_rate ?? 0)
        return {
          id: item.id,
          uid: (item as any).uid ?? "",
          title: item.title ?? "",
          price: Number.isFinite(rawPrice) ? rawPrice : 0,
          commission: Number.isFinite(rawCommission) ? rawCommission : 0,
          commissionRate: Number.isFinite(rawCommissionRate) ? rawCommissionRate : 0,
          image: item.cover_url ?? "",
          categoryId: item.category_id,
          blueLink: spec[META_KEYS.blueLink] || item.link || "",
          accountName: spec[META_KEYS.shopName] || "",
          remark: item.remark ?? "",
          isFocused: Boolean(spec[META_KEYS.featured]),
          spec,
        }
      })
      const merged = [...items, ...normalizedItems]
      setItems(merged)
      const manualIds = merged
        .filter((item) => item.spec[META_KEYS.sortOrder])
        .sort((a, b) => {
          const aOrder = Number(a.spec[META_KEYS.sortOrder] || 0)
          const bOrder = Number(b.spec[META_KEYS.sortOrder] || 0)
          return aOrder - bOrder
        })
        .map((item) => item.id)
      if (manualIds.length > 0) {
        setManualOrder(manualIds)
      }
      setHasMore(response.has_more ?? false)
      const next = response.next_offset ?? nextOffset + normalizedItems.length
      setNextOffset(next)
      saveItemsCache({
        items: merged,
        pagination: {
          offset: next,
          limit: 50,
          hasMore: response.has_more ?? false,
        },
        manualOrder: manualIds,
        categoryId: categoryValue,
      })
    } catch {
      showToast("加载失败", "error")
    } finally {
      setIsLoadingMore(false)
    }
  }, [categoryValue, searchValue, sortValue, nextOffset, hasMore, isLoading, isLoadingMore, items, showToast, saveItemsCache])

  const handleCopyLink = (id: string) => {
    const target = items.find((item) => item.id === id)
    if (!target) return
    navigator.clipboard
      .writeText(target.blueLink || target.spec[META_KEYS.blueLink] || "")
      .then(() => showToast("复制成功", "success"))
      .catch(() => showToast("复制失败", "error"))
  }

  const handleToggleFocus = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFocused: !item.isFocused } : item
      )
    )
    const target = items.find((item) => item.id === id)
    if (!target) return
    const nextSpec = {
      ...target.spec,
      [META_KEYS.featured]: (!target.isFocused).toString(),
    }
    updateItem(id, { spec: nextSpec }).catch(() =>
      showToast("重点标记更新失败", "error")
    )
  }

  const handleDragStart = (id: string) => {
    setDragId(id)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const nextOrder = [...orderedItems.map((item) => item.id)]
    const fromIndex = nextOrder.indexOf(dragId)
    const toIndex = nextOrder.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const [moved] = nextOrder.splice(fromIndex, 1)
    nextOrder.splice(toIndex, 0, moved)
    setManualOrder(nextOrder)
    setSortValue("manual")
    showToast("排序已更新", "success")
    nextOrder.forEach((itemId, index) => {
      const target = items.find((item) => item.id === itemId)
      if (!target) return
      const nextSpec = {
        ...target.spec,
        [META_KEYS.sortOrder]: padSortOrder((index + 1) * 10),
      }
      updateItem(itemId, { spec: nextSpec }).catch(() => {
        showToast("排序保存失败", "error")
      })
    })
  }

  const handleClearList = async () => {
    if (!filteredItems.length) {
      showToast("当前没有可清空的商品", "info")
      return
    }
    if (isClearing) return
    setIsClearing(true)
    const deleteIds = new Set(filteredItems.map((item) => item.id))
    const snapshotItems = items
    const snapshotOrder = manualOrder
    setItems((prev) => prev.filter((item) => !deleteIds.has(item.id)))
    setManualOrder((prev) => prev.filter((id) => !deleteIds.has(id)))
    try {
      const results = await Promise.allSettled(
        Array.from(deleteIds).map((id) => deleteItem(id))
      )
      const failures = results.filter((result) => result.status === "rejected")
      if (failures.length) {
        showToast(`清空完成，失败 ${failures.length} 条`, "error")
        loadItems()
      } else {
        showToast(`已清空 ${deleteIds.size} 个商品`, "success")
      }
    } catch {
      setItems(snapshotItems)
      setManualOrder(snapshotOrder)
      showToast("清空失败", "error")
    } finally {
      setIsClearing(false)
      setIsClearOpen(false)
    }
  }

  const handleExport = () => {
    if (!filteredItems.length) {
      showToast("没有可导出的商品", "info")
      return
    }
    try {
      const formatPrice = (value: number | string) => {
        if (value === null || value === undefined || value === "") return ""
        const num = Number(value)
        if (Number.isNaN(num)) return String(value)
        return num.toFixed(2)
      }
      const formatPercent = (value: number | string) => {
        if (value === null || value === undefined || value === "") return ""
        const num = Number(value)
        if (Number.isNaN(num)) return String(value)
        return num % 1 === 0 ? `${num}%` : `${num.toFixed(2)}%`
      }

      const headers = [
        "重点标记",
        "商品内部编号",
        "产品ID",
        "商品名称",
        "价格(元)",
        "佣金(元)",
        "佣金比例",
        "30天销量",
        "店铺名称",
        "商品链接",
        "评价数",
        "参数摘要",
        "参数详情",
      ]

      const rows = filteredItems.map((item) => {
        const specParams = Object.fromEntries(
          Object.entries(item.spec || {}).filter(([key]) => !key.startsWith("_"))
        )
        const link =
          item.spec[META_KEYS.promoLink] ||
          item.blueLink ||
          item.spec[META_KEYS.sourceLink] ||
          ""
        const productId = extractDigitsFromLink(link) || item.uid || item.id
        return [
          item.isFocused ? "是" : "",
          item.uid || item.id || "",
          productId,
          item.title || "",
          formatPrice(item.price),
          formatPrice(item.commission),
          formatPercent(item.commissionRate),
          item.spec[META_KEYS.sales30] || "",
          item.spec[META_KEYS.shopName] || "",
          link,
          item.spec[META_KEYS.comments] || "",
          buildSpecDetailText(specParams, " / ", 3),
          buildSpecDetailText(specParams, "\n"),
        ]
      })

      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      worksheet["!cols"] = [
        { wch: 10 },
        { wch: 16 },
        { wch: 18 },
        { wch: 48 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
        { wch: 64 },
        { wch: 12 },
        { wch: 28 },
        { wch: 40 },
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, "商品列表")
      const filename = `${sanitizeFilename(selectedCategoryName)}-${getTimestamp()}.xlsx`
      XLSX.writeFile(workbook, filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败"
      showToast(message, "error")
    }
  }

  const openEdit = (id: string) => {
    setEditingItemId(id)
    setIsProductFormOpen(true)
  }

  const productFormInitialValues = useMemo(() => {
    if (!editingItemId) return undefined
    const target = items.find((item) => item.id === editingItemId)
    if (!target) return undefined
    return {
      promoLink: target.spec[META_KEYS.promoLink] || "",
      title: target.title,
      price: String(target.price),
      commission: String(target.commission),
      commissionRate: target.commissionRate ? String(target.commissionRate) : "",
      sales30: target.spec[META_KEYS.sales30] || "",
      comments: target.spec[META_KEYS.comments] || "",
      image: target.image,
      blueLink: target.blueLink,
      categoryId: target.categoryId,
      accountName: target.accountName,
      shopName: target.spec[META_KEYS.shopName] || "",
      remark: target.remark,
      params: Object.fromEntries(
        Object.entries(target.spec).filter(([key]) => !key.startsWith("_"))
      ),
    }
  }, [editingItemId, items])

  const handleSubmitProductForm = (values: {
    promoLink: string
    title: string
    price: string
    commission: string
    commissionRate: string
    sales30: string
    comments: string
    image: string
    blueLink: string
    categoryId: string
    accountName: string
    shopName: string
    remark: string
    params: Record<string, string>
  }) => {
    const priceValue = Number(values.price)
    const commissionRateValue = Number(values.commissionRate || 0)
    const commissionValue =
      Number.isFinite(priceValue) && Number.isFinite(commissionRateValue)
        ? (priceValue * commissionRateValue) / 100
        : 0
    if (editingItemId) {
      const target = items.find((item) => item.id === editingItemId)
      if (!target) return
      const nextSpec = {
        ...target.spec,
        [META_KEYS.blueLink]: values.blueLink,
        [META_KEYS.shopName]: values.shopName || values.accountName,
        [META_KEYS.promoLink]: values.promoLink,
        [META_KEYS.sales30]: values.sales30,
        [META_KEYS.comments]: values.comments,
        ...values.params,
      }
      updateItem(editingItemId, {
        title: values.title,
        price: priceValue,
        commission: commissionValue,
        commission_rate: commissionRateValue,
        cover_url: values.image,
        link: values.blueLink,
        remark: values.remark,
        spec: nextSpec,
      })
        .then(() => {
          showToast("商品已更新", "success")
          loadItems()
        })
        .catch(() => showToast("更新失败", "error"))
    } else {
      const specPayload = {
        [META_KEYS.blueLink]: values.blueLink,
        [META_KEYS.shopName]: values.shopName || values.accountName,
        [META_KEYS.promoLink]: values.promoLink,
        [META_KEYS.sales30]: values.sales30,
        [META_KEYS.comments]: values.comments,
        ...values.params,
      }
      createItem({
        category_id: values.categoryId,
        title: values.title,
        price: priceValue,
        commission: commissionValue,
        commission_rate: commissionRateValue,
        cover_url: values.image,
        link: values.blueLink,
        remark: values.remark,
        spec: specPayload,
      })
        .then(() => {
          showToast("商品已新增", "success")
          loadItems()
        })
        .catch(() => showToast("新增失败", "error"))
    }
    setEditingItemId(null)
  }

  const handleSaveCategories = (next: CategoryItem[]) => {
    const existingIds = new Set(categories.map((item) => item.id))
    const nextIds = new Set(next.map((item) => item.id))
    const updates = next.map((item, index) => ({
      ...item,
      sortOrder: (index + 1) * 10,
    }))
    const tasks: Promise<unknown>[] = []
    updates.forEach((item) => {
      if (existingIds.has(item.id)) {
        tasks.push(
          updateCategory(item.id, {
            name: item.name,
            sort_order: item.sortOrder,
          })
        )
      } else {
        tasks.push(createCategory({ name: item.name, sort_order: item.sortOrder }))
      }
    })
    categories.forEach((item) => {
      if (!nextIds.has(item.id)) {
        tasks.push(deleteCategory(item.id))
      }
    })
    Promise.all(tasks)
      .then(() => {
        showToast("分类已保存", "success")
        loadItems()
      })
      .catch(() => showToast("分类保存失败", "error"))
  }

  const handleSavePresetFields = (
    categoryId: string,
    fields: { key: string }[]
  ) => {
    updateCategory(categoryId, { spec_fields: fields })
      .then(() => {
        showToast("预设参数已保存", "success")
        loadItems()
      })
      .catch(() => showToast("预设参数保存失败", "error"))
  }

  const handleCancelImport = () => {
    setImportState((prev) => ({ ...prev, status: "done" }))
    showToast("已取消导入", "info")
  }

  const getMissingTips = (item: ArchiveItem) => {
    const category = categories.find((entry) => entry.id === item.categoryId)
    const preset = category?.specFields?.map((field) => field.key) ?? []
    if (preset.length === 0) return ["未设置预设参数"]
    return preset.filter((key) => !item.spec[key])
  }

  const itemsView = visibleItems.map((item) => {
    const category = categories.find((entry) => entry.id === item.categoryId)
    const categoryName = category?.name ?? "未分类"
    const preset = category?.specFields?.map((field) => field.key) ?? []
    const params = preset.map((key) => ({
      key,
      value: item.spec[key] ?? "",
    }))
    return {
      ...item,
      price: item.price ? String(item.price) : "--",
      commission: item.commission ? String(item.commission) : "--",
      commissionRate: item.commissionRate
        ? `${item.commissionRate.toFixed(2)}%`
        : "--",
      sales30: item.spec[META_KEYS.sales30] || "--",
      comments: item.spec[META_KEYS.comments] || "--",
      categoryName,
      params,
      missingTips: getMissingTips(item),
      shopName: item.spec[META_KEYS.shopName] || "",
      uid: item.uid || item.id,
      source: item.spec[META_KEYS.sourceLink] || "",
    }
  })

  return (
    <>
      <ArchivePageView
      items={itemsView}
      categories={categories}
      isCategoryLoading={isCategoryLoading}
      isListLoading={isListLoading}
      isRefreshing={isRefreshing}
      isUsingCache={usingCache}
      errorMessage={errorMessage}
      selectedCategory={categoryValue}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      priceRange={safePriceRange}
      priceBounds={priceBounds}
      onPriceRangeChange={handlePriceRangeChange}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMore}
      sortValue={sortValue}
      onSortChange={setSortValue}
      onCreate={() => {
        setEditingItemId(null)
        setIsProductFormOpen(true)
      }}
      onEdit={openEdit}
      onCopyLink={handleCopyLink}
      onDelete={(id) => {
        deleteItem(id)
          .then(() => {
            showToast("删除成功", "success")
            loadItems()
          })
          .catch(() => showToast("删除失败", "error"))
      }}
      onToggleFocus={handleToggleFocus}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onSelectCategory={(id) => setCategoryValue(id)}
      onClearList={() => {
        if (!filteredItems.length) {
          showToast("当前没有可清空的商品", "info")
          return
        }
        setIsClearOpen(true)
      }}
      onDownloadImages={() => showToast("下载图片待实现", "info")}
      onExport={handleExport}
      onSyncFeishu={() => showToast("写入飞书待实现", "info")}
      onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
      onCloseCategoryManager={() => setIsCategoryManagerOpen(false)}
      onSaveCategories={handleSaveCategories}
      isCategoryManagerOpen={isCategoryManagerOpen}
      isPresetFieldsOpen={isPresetFieldsOpen}
      onOpenPresetFields={() => setIsPresetFieldsOpen(true)}
      onClosePresetFields={() => setIsPresetFieldsOpen(false)}
      onSavePresetFields={handleSavePresetFields}
      isProductFormOpen={isProductFormOpen}
      onCloseProductForm={() => setIsProductFormOpen(false)}
      onSubmitProductForm={handleSubmitProductForm}
      productFormInitialValues={productFormInitialValues}
      presetFields={
        categories.find((item) => item.id === categoryValue)?.specFields ??
        categories[0]?.specFields ??
        []
      }
      importProgressState={importState}
      isImportOpen={isImportOpen}
      onCloseImport={() => {
        setIsImportOpen(false)
        showToast("导入功能待实现", "info")
      }}
      onCancelImport={handleCancelImport}
    />
      <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空列表</AlertDialogTitle>
            <AlertDialogDescription>
              确认清空当前筛选条件下的 {filteredItems.length} 个商品吗？该操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsClearOpen(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleClearList} disabled={isClearing}>
              {isClearing ? "清空中..." : "确认清空"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
