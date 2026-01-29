import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import CommissionPageView from "@/components/commission/CommissionPageView"
import CommissionArchiveModal from "@/components/commission/CommissionArchiveModal"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { fetchCategories } from "@/components/archive/archiveApi"

interface CommissionItem {
  id: string
  title: string
  price: number
  commissionRate: number
  image: string
  shopName: string
  source: string
  sales30: number
  comments: string
  isFocused: boolean
  spec: Record<string, string>
}

const META_KEYS = {
  sales30: "_s_30",
  comments: "_comments",
  shopName: "_shop_name",
  sourceLink: "_source_link",
  sourceAuthor: "_source_author",
  featured: "_featured",
  promoLink: "_promo_link",
  archived: "_archived",
}

const TEMP_STORAGE_KEY = "commission_temp_items_v1"
const CATEGORY_CACHE_KEY = "sourcing_category_cache_v1"
const CATEGORY_CACHE_TTL = 5 * 60 * 1000

const demoVideos = [
  {
    id: "v1",
    title: "2026 无线降噪耳机测评｜开箱/体验/参数/音质/HIFI推荐",
    source: "B站",
    tag: "数码",
  },
  {
    id: "v2",
    title: "2026 游戏耳机横评｜耳机/麦克风/听声辨位/HIFI",
    source: "B站",
    tag: "游戏",
  },
  {
    id: "v3",
    title: "26 款键盘横评合集｜红轴/茶轴/青轴/静音轴推荐",
    source: "B站",
    tag: "外设",
  },
]

interface ArchiveCategory {
  id: string
  name: string
  sortOrder: number
}

type CachePayload<T> = { timestamp: number; data?: T; items?: T }

const getCache = <T,>(key: string): CachePayload<T> | null => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as CachePayload<T>
  } catch {
    return null
  }
}

const getCacheData = <T,>(cache: CachePayload<T> | null) => {
  if (!cache) return null
  return (cache.data ?? cache.items ?? null) as T | null
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

const getLocalItems = () => {
  try {
    const raw = localStorage.getItem(TEMP_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as CommissionItem[]
  } catch {
    return []
  }
}

const saveLocalItems = (next: CommissionItem[]) => {
  try {
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

const isBiliLink = (link: string) => /bilibili\.com|b23\.tv/i.test(link)

const getSourceDisplay = (spec: Record<string, string>) => {
  const link = spec[META_KEYS.sourceLink] || ""
  const author =
    spec[META_KEYS.sourceAuthor] ||
    spec["_bili_author"] ||
    spec["_author"] ||
    spec["_up_name"] ||
    spec["author"] ||
    ""
  if (!link) return "手动添加"
  if (isBiliLink(link)) {
    return author ? author : "未知作者"
  }
  return link
}

const isItemArchived = (item: CommissionItem) => {
  const value = item.spec?.[META_KEYS.archived]
  return value === "true" || value === "1" || value === "yes" || value === "已归档"
}

const fetchBiliAuthor = async (link: string) => {
  if (!API_BASE) return ""
  const response = await fetch(`${API_BASE}/api/bilibili/video-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: link }),
  })
  if (!response.ok) return ""
  const data = await response.json()
  const owner = data?.owner || data?.data?.owner || data?.info?.owner
  const author = owner?.name || owner?.uname || data?.author || ""
  return author ? String(author).trim() : ""
}

export default function CommissionPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<CommissionItem[]>([])
  const [categories, setCategories] = useState<ArchiveCategory[]>([])
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [filters, setFilters] = useState({
    keyword: "",
    priceMin: "",
    priceMax: "",
    rateMin: "",
    rateMax: "",
    salesMin: "",
    salesMax: "",
    sort: "price_asc",
  })
  const [processingOpen, setProcessingOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [selectVideoOpen, setSelectVideoOpen] = useState(false)
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveCategoryId, setArchiveCategoryId] = useState("")
  const [archiveTargetIds, setArchiveTargetIds] = useState<string[]>([])
  const [archiveSubmitting, setArchiveSubmitting] = useState(false)
  const authorRequestedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const localItems = getLocalItems()
    setItems(localItems)
  }, [])

  const loadCategories = useCallback(async () => {
    const cache = getCache<ArchiveCategory[]>(CATEGORY_CACHE_KEY)
    const cached = getCacheData(cache) ?? []
    if (cached.length) {
      setCategories(cached)
    }
    if (isFresh(cache, CATEGORY_CACHE_TTL)) {
      setIsCategoryLoading(false)
      return
    }
    if (!cached.length) {
      setIsCategoryLoading(true)
    }
    try {
      const response = await fetchCategories({ includeCounts: false })
      const normalized = (response.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order ?? 0,
      }))
      setCategories(normalized)
      setCache(CATEGORY_CACHE_KEY, normalized)
    } catch {
      // ignore
    } finally {
      setIsCategoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (!categories.length) return
    setArchiveCategoryId((prev) => {
      if (prev && categories.some((item) => item.id === prev)) return prev
      return categories[0].id
    })
  }, [categories])

  useEffect(() => {
    if (!items.length) return
    const pending = items.filter((item) => {
      const link = item.spec[META_KEYS.sourceLink] || ""
      const author = item.spec[META_KEYS.sourceAuthor] || ""
      return link && isBiliLink(link) && !author && !authorRequestedRef.current.has(item.id)
    })
    if (!pending.length) return

    pending.forEach(async (item) => {
      authorRequestedRef.current.add(item.id)
      const link = item.spec[META_KEYS.sourceLink] || ""
      const author = await fetchBiliAuthor(link)
      if (!author) return
      setItems((prev) => {
        const next = prev.map((entry) => {
          if (entry.id !== item.id) return entry
          const spec = { ...entry.spec, [META_KEYS.sourceAuthor]: author }
          return { ...entry, spec }
        })
        saveLocalItems(next)
        return next
      })
    })
  }, [items])

  const filteredItems = useMemo(() => {
    const keyword = filters.keyword.trim()
    const priceMin = Number(filters.priceMin || 0)
    const priceMax = Number(filters.priceMax || Number.MAX_SAFE_INTEGER)
    const rateMin = Number(filters.rateMin || 0)
    const rateMax = Number(filters.rateMax || Number.MAX_SAFE_INTEGER)
    const salesMin = Number(filters.salesMin || 0)
    const salesMax = Number(filters.salesMax || Number.MAX_SAFE_INTEGER)

    const list = items.filter((item) => {
      const matchesKeyword = !keyword || item.title.includes(keyword)
      const matchesPrice = item.price >= priceMin && item.price <= priceMax
      const matchesRate =
        item.commissionRate >= rateMin && item.commissionRate <= rateMax
      const matchesSales = item.sales30 >= salesMin && item.sales30 <= salesMax
      return matchesKeyword && matchesPrice && matchesRate && matchesSales
    })

    return list.sort((a, b) => {
      if (filters.sort === "price_desc") return b.price - a.price
      return a.price - b.price
    })
  }, [items, filters])

  const itemsView = filteredItems.map((item, index) => {
    const commission = (item.price * item.commissionRate) / 100
    return {
      id: item.id,
      index: index + 1,
      title: item.title,
      price: item.price,
      commissionRate: item.commissionRate,
      commission,
      sales30: item.sales30,
      comments: item.comments,
      image: item.image,
      shopName: item.shopName,
      source: getSourceDisplay(item.spec),
      isFocused: item.isFocused,
      isArchived: isItemArchived(item),
    }
  })

  const editTarget = items.find((item) => item.id === editTargetId)

  const updateLocalItems = useCallback((updater: (prev: CommissionItem[]) => CommissionItem[]) => {
    setItems((prev) => {
      const next = updater(prev)
      saveLocalItems(next)
      return next
    })
  }, [])

  const buildArchiveSpec = useCallback((item: CommissionItem) => {
    const spec: Record<string, string> = { ...(item.spec || {}) }
    if (item.isFocused) {
      spec[META_KEYS.featured] = "true"
    } else if (spec[META_KEYS.featured]) {
      spec[META_KEYS.featured] = "false"
    }
    if (item.shopName) spec[META_KEYS.shopName] = item.shopName
    if (item.sales30 !== undefined && item.sales30 !== null) {
      spec[META_KEYS.sales30] = String(item.sales30)
    }
    if (item.comments !== undefined && item.comments !== null) {
      spec[META_KEYS.comments] = String(item.comments)
    }
    if (!spec[META_KEYS.promoLink]) {
      const fallbackLink = spec[META_KEYS.sourceLink] || ""
      if (fallbackLink) {
        spec[META_KEYS.promoLink] = fallbackLink
      }
    }
    if (!spec["_temp_id"]) {
      spec["_temp_id"] = item.id
    }
    return spec
  }, [])

  const buildArchivePayload = useCallback(
    (item: CommissionItem) => {
      const spec = buildArchiveSpec(item)
      const sourceLink = spec[META_KEYS.sourceLink] || ""
      const sourceAuthor = spec[META_KEYS.sourceAuthor] || ""
      const sourceType = sourceLink ? "video" : "manual"
      const sourceRef = sourceAuthor || sourceLink || item.title || ""
      const price = Number(item.price || 0)
      const rate = Number(item.commissionRate || 0)
      const commission =
        Number.isFinite(price) && Number.isFinite(rate) ? (price * rate) / 100 : 0
      const link = spec[META_KEYS.promoLink] || spec[META_KEYS.sourceLink] || ""
      return {
        title: item.title || "未命名商品",
        link: link || null,
        price,
        commission,
        commission_rate: rate,
        source_type: sourceType,
        source_ref: sourceRef || null,
        cover_url: item.image || null,
        remark: null,
        spec,
      }
    },
    [buildArchiveSpec]
  )

  const openArchive = (ids: string[]) => {
    if (!ids.length) {
      showToast("暂无可归档商品", "info")
      return
    }
    setArchiveTargetIds(ids)
    setArchiveOpen(true)
  }

  const handleArchiveConfirm = async () => {
    if (!archiveCategoryId) {
      showToast("请选择归档分类", "error")
      return
    }
    const idSet = new Set(archiveTargetIds)
    const targetItems = items.filter((item) => idSet.has(item.id))
    const pending = targetItems.filter((item) => !isItemArchived(item))
    if (!pending.length) {
      showToast("已归档的商品将被跳过", "info")
      setArchiveOpen(false)
      return
    }
    setArchiveSubmitting(true)
    try {
      const payload = pending.map(buildArchivePayload)
      await apiRequest("/api/sourcing/items/batch", {
        method: "POST",
        body: JSON.stringify({ category_id: archiveCategoryId, items: payload }),
      })
      const archivedIds = new Set(pending.map((item) => item.id))
      updateLocalItems((prev) =>
        prev.map((item) => {
          if (!archivedIds.has(item.id)) return item
          const spec = { ...(item.spec || {}), [META_KEYS.archived]: "true" }
          return { ...item, spec }
        })
      )
      showToast(`归档成功（${pending.length} 条）`, "success")
      setArchiveOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "归档失败"
      showToast(message, "error")
    } finally {
      setArchiveSubmitting(false)
    }
  }

  const archiveCount = useMemo(() => {
    if (!archiveTargetIds.length) return 0
    const targetSet = new Set(archiveTargetIds)
    return items.filter((item) => targetSet.has(item.id) && !isItemArchived(item)).length
  }, [archiveTargetIds, items])

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  )

  return (
    <>
      <CommissionPageView
      inputValue={inputValue}
      onInputChange={setInputValue}
      items={itemsView}
      isProcessing={processingOpen}
      progress={{ current: 0, total: 1 }}
      resultOpen={resultOpen}
      resultItems={[
        { label: "总商品", value: "41 条" },
        { label: "成功", value: "37 条" },
        { label: "失败", value: "4 条" },
        { label: "跳过", value: "0 条" },
        { label: "无效", value: "0 条" },
      ]}
      resultHighlight={{ label: "成功", value: "37 条" }}
      selectVideoOpen={selectVideoOpen}
      videoItems={demoVideos}
      selectedVideos={selectedVideos}
      editTarget={
        editTarget
          ? {
              id: editTarget.id,
              title: editTarget.title,
              price: editTarget.price,
              commissionRate: editTarget.commissionRate,
            }
          : undefined
      }
      filters={filters}
      onFilterChange={(key, value) =>
        setFilters((prev) => ({ ...prev, [key]: value }))
      }
      onToggleFocus={(id) =>
        updateLocalItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  isFocused: !item.isFocused,
                  spec: {
                    ...(item.spec || {}),
                    [META_KEYS.featured]: (!item.isFocused).toString(),
                  },
                }
              : item
          )
        )
      }
      onEdit={(id) => setEditTargetId(id)}
      onArchive={(id) => openArchive([id])}
      onDelete={(id) => {
        updateLocalItems((prev) => prev.filter((item) => item.id !== id))
        showToast("删除成功", "success")
      }}
      onParseBili={() => {
        if (!inputValue.trim()) {
          showToast("请输入链接", "info")
          return
        }
        setProcessingOpen(true)
      }}
      onParsePromo={() => {
        if (!inputValue.trim()) {
          showToast("请输入链接", "info")
          return
        }
        setProcessingOpen(true)
      }}
      onParseBenchmark={() => setSelectVideoOpen(true)}
      onCloseProgress={() => setProcessingOpen(false)}
      onCloseResult={() => setResultOpen(false)}
      onSortAll={() => {
        setResultOpen(false)
        showToast("已将全部商品置顶", "success")
      }}
      onSortNew={() => {
        setResultOpen(false)
        showToast("已将新增商品置顶", "success")
      }}
      onToggleVideo={(id) =>
        setSelectedVideos((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
      }
      onStartExtract={() => {
        setSelectVideoOpen(false)
        setProcessingOpen(true)
      }}
      onCloseSelectVideo={() => setSelectVideoOpen(false)}
      onSaveEdit={(payload) => {
        if (!editTarget) return
        updateLocalItems((prev) =>
          prev.map((item) =>
            item.id === editTarget.id
              ? {
                  ...item,
                  title: payload.title,
                  price: payload.price,
                  commissionRate: payload.commissionRate,
                }
              : item
          )
        )
        showToast("保存成功", "success")
      }}
      onCloseEdit={() => setEditTargetId(null)}
      onArchiveAll={() => openArchive(filteredItems.map((item) => item.id))}
    />
      <CommissionArchiveModal
        isOpen={archiveOpen}
        categories={sortedCategories}
        selectedCategoryId={archiveCategoryId}
        itemCount={archiveCount}
        isSubmitting={archiveSubmitting}
        isLoading={isCategoryLoading}
        onCategoryChange={setArchiveCategoryId}
        onConfirm={handleArchiveConfirm}
        onClose={() => {
          setArchiveOpen(false)
          setArchiveTargetIds([])
        }}
      />
    </>
  )
}
