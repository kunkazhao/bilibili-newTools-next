import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import CommissionPageView from "@/components/commission/CommissionPageView"
import CommissionDialogs from "@/components/commission/CommissionDialogs"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { getUserErrorMessage } from "@/lib/errorMessages"
import { fetchCategories } from "@/components/archive/archiveApi"
import {
  COMMISSION_SOURCE_LABEL_KEY,
  getCommissionSourceDisplay,
  getCommissionSourceLink,
} from "@/components/commission/commissionSource"
import {
  getCommissionExportHeaders,
  getCommissionExportColumns,
  getCommissionRowValues,
} from "@/components/commission/commissionExport"
import { buildCommissionArchiveSpec } from "@/components/commission/commissionArchive"
import {
  BiliApiError,
  extractLinksFromComment,
  getPinnedComments,
  isBilibiliInput,
} from "@/lib/bilibili"
import {
  createAsyncQueue,
  retryWithBackoff,
  runQueueWithConcurrency,
  runWithConcurrency,
} from "@/lib/asyncPool"

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
  promoLink: "_promo_link",
  archived: "_archived",
}

const TEMP_STORAGE_KEY = "commission_temp_items_v1"
const CATEGORY_CACHE_KEY = "sourcing_category_cache_v1"
const CATEGORY_CACHE_TTL = 5 * 60 * 1000
const BENCHMARK_PICK_CACHE_KEY = "benchmark_pick_cache_v1"
const BENCHMARK_PICK_CACHE_TTL = 5 * 60 * 1000
const VIDEO_CONCURRENCY = 4
const PRODUCT_CONCURRENCY = 8
const BILI_RETRYABLE_CODES = new Set([
  "-403",
  "-412",
  "-509",
  "-352",
  "-1202",
  "-1209",
])

interface ArchiveCategory {
  id: string
  name: string
  parentId: string | null
  parentName: string
  sortOrder: number
  parentSortOrder: number
}

interface CategoryCacheItem {
  id: string
  name: string
  sortOrder: number
  parentId: string | null
  hasParentField: boolean
}

interface BenchmarkCategory {
  id: string
  name: string
}

interface BenchmarkVideo {
  id: string
  title?: string | null
  link?: string | null
  bvid?: string | null
  category_id?: string | null
  category?: string | null
  author?: string | null
}

type CommissionProduct = Awaited<ReturnType<typeof fetchCommissionProduct>>

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

const normalizeCategoryCacheItem = (value: unknown): CategoryCacheItem | null => {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const id = typeof raw.id === "string" ? raw.id.trim() : ""
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  if (!id || !name) return null

  const sortValue = raw.sortOrder ?? raw.sort_order ?? 0
  const parsedSortOrder = Number(sortValue)
  const hasParentField =
    Object.prototype.hasOwnProperty.call(raw, "parentId") ||
    Object.prototype.hasOwnProperty.call(raw, "parent_id")
  const parentValue = raw.parentId ?? raw.parent_id ?? null
  const parentId =
    typeof parentValue === "string" && parentValue.trim().length > 0
      ? parentValue.trim()
      : null

  return {
    id,
    name,
    sortOrder: Number.isFinite(parsedSortOrder) ? parsedSortOrder : 0,
    parentId,
    hasParentField,
  }
}

const normalizeCategoryCache = (value: unknown): CategoryCacheItem[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeCategoryCacheItem(item))
    .filter((item): item is CategoryCacheItem => Boolean(item))
}

const buildArchiveCategories = (categories: CategoryCacheItem[]): ArchiveCategory[] => {
  if (!categories.length) return []

  const hasHierarchyData = categories.some((category) => category.hasParentField)
  const parentMap = new Map<string, CategoryCacheItem>()
  categories.forEach((category) => {
    if (!category.parentId) {
      parentMap.set(category.id, category)
    }
  })

  const leafCategories = hasHierarchyData
    ? categories.filter((category) => Boolean(category.parentId))
    : categories

  return leafCategories
    .map((category) => {
      const parent = category.parentId ? parentMap.get(category.parentId) : null
      return {
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        parentName: parent?.name ?? "",
        sortOrder: category.sortOrder,
        parentSortOrder: parent?.sortOrder ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((a, b) => {
      if (a.parentSortOrder !== b.parentSortOrder) {
        return a.parentSortOrder - b.parentSortOrder
      }
      if (a.parentName !== b.parentName) {
        return a.parentName.localeCompare(b.parentName, "zh-CN")
      }
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }
      return a.name.localeCompare(b.name, "zh-CN")
    })
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

const isBiliLink = (link: string) =>
  /bilibili\.com|b23\.tv|^BV[a-zA-Z0-9]+$|^av\d+$/i.test(link)

const isBiliShortLink = (link: string) =>
  /(?:b23\.tv|bili22\.cn|bili33\.cn|bili2233\.cn)/i.test(link)

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

const isJdLink = (link: string) =>
  /jd\.com|jingfen\.jd|union-click\.jd|jdc\.jd/i.test(link)

const isTaobaoLink = (link: string) =>
  /taobao\.com|tmall\.com|tmall\.hk|click\.taobao|uland\.taobao/i.test(link)

const JD_PROMO_LINK_REQUIRED_MESSAGE =
  "京东普通商品链接暂不支持，请使用京东联盟推广链接（union-click/jdc/jingfen）"

const normalizeExtractionError = (reason: string) => {
  const message = String(reason || "").trim()
  if (!message) return "链接解析失败，请检查后重试"
  if (/sceneId|SKUID/i.test(message)) {
    return JD_PROMO_LINK_REQUIRED_MESSAGE
  }
  return message.length > 120 ? `${message.slice(0, 120)}...` : message
}

const parseLines = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

const extractDigitsFromLink = (link: string) => {
  if (!link) return ""
  const cleaned = link.trim()
  const exactMatch = cleaned.match(/item\.jd\.com\/(\d+)\.html/i)
  if (exactMatch) return exactMatch[1]
  const paramMatch = cleaned.match(/(?:skuId|sku|productId|wareId|id)[=/](\d{6,})/i)
  if (paramMatch) return paramMatch[1]
  const htmlMatch = cleaned.match(/\/(\d{6,})\.html/i)
  if (htmlMatch) return htmlMatch[1]
  const allDigits = cleaned.match(/(\d{6,})/g)
  if (allDigits?.length) {
    return allDigits.sort((a, b) => b.length - a.length)[0]
  }
  return ""
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `comm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const parseMaybeJson = (value: unknown) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown
    } catch {
      return null
    }
  }
  return value ?? null
}

const extractQueryResult = (payload: Record<string, any>) => {
  const direct = parseMaybeJson(payload?.queryResult)
  if (direct) return direct as Record<string, any>
  const msgPayload = parseMaybeJson(payload?.msg) as Record<string, any> | null
  const nested = msgPayload?.jd_union_open_goods_query_responce as Record<string, any> | undefined
  const queryResult = nested?.queryResult ?? msgPayload?.queryResult
  return parseMaybeJson(queryResult) as Record<string, any> | null
}

const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const normalizePercent = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  const raw = String(value).trim()
  if (!raw) return undefined
  const numeric = Number(raw.replace("%", ""))
  return Number.isFinite(numeric) ? numeric : undefined
}

const ensureHttp = (value: string) => {
  if (!value) return ""
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return `https://${value}`
}

const pickImageUrl = (product: Record<string, any>) => {
  const imageInfo = product?.imageInfo
  const list = imageInfo?.imageList ?? product?.imageList ?? product?.imageUrls ?? []
  if (Array.isArray(list) && list.length > 0) {
    const first = list[0]
    if (typeof first === "string") return first
    if (first?.url) return first.url as string
  }
  if (typeof product?.image === "string") return product.image as string
  if (typeof product?.imgUrl === "string") return product.imgUrl as string
  return ""
}

const extractJdKeyword = (url: string) => {
  if (!url) return ""
  if (url.includes("union-click.jd.com") || url.includes("jdc.jd.com")) return url
  if (url.includes("jingfen.jd.com")) return url
  const itemMatch = url.match(/item\.jd\.com\/(\d+)\.html/i)
  if (itemMatch) return itemMatch[1]
  const productMatch = url.match(/product\/(\d+)/i)
  if (productMatch) return productMatch[1]
  const paramMatch = url.match(/[?&](?:skuId|sku|productId|wareId|id)=(\d{6,})/i)
  if (paramMatch) return paramMatch[1]
  return url
}

const resolveJdUrl = async (url: string) => {
  if (!url || url.includes("item.jd.com")) return url
  try {
    const data = await apiRequest<{ resolvedUrl?: string }>("/api/jd/resolve", {
      method: "POST",
      body: JSON.stringify({ url }),
    })
    return data.resolvedUrl || url
  } catch {
    return url
  }
}

const resolveBiliShortLink = async (url: string) => {
  if (!url || !isBiliShortLink(url)) return url
  try {
    const data = await apiRequest<{ resolvedUrl?: string }>(
      `/api/bilibili/resolve?url=${encodeURIComponent(url)}`
    )
    return String(data?.resolvedUrl || url).trim() || url
  } catch {
    return url
  }
}

const resolveTaobaoLink = async (url: string) => {
  const data = await apiRequest<{ itemId?: string; openIid?: string; resolvedUrl?: string }>(
    "/api/taobao/resolve",
    {
      method: "POST",
      body: JSON.stringify({ url }),
    }
  )
  return {
    itemId: data.itemId || "",
    openIid: data.openIid || "",
    resolvedUrl: data.resolvedUrl || "",
  }
}

const fetchJdProduct = async (keyword: string, originalLink: string) => {
  const data = await apiRequest<Record<string, any>>("/api/jd/product", {
    method: "POST",
    body: JSON.stringify({ keyword }),
  })
  const queryResult = extractQueryResult(data as Record<string, any>)
  const product = queryResult?.data?.[0] as Record<string, any> | undefined
  const queryMessage =
    typeof queryResult?.message === "string" ? queryResult.message.trim() : ""
  if (!product) {
    if (/sceneId|SKUID/i.test(queryMessage)) {
      throw new Error(JD_PROMO_LINK_REQUIRED_MESSAGE)
    }
    if (queryMessage) {
      throw new Error(queryMessage)
    }
    throw new Error("未获取到商品信息")
  }
  const materialUrl = ensureHttp(product?.materialUrl || originalLink)
  return {
    title: (product?.skuName as string) || "未知商品",
    price: normalizeNumber(product?.priceInfo?.price),
    commission: normalizeNumber(product?.commissionInfo?.commission),
    commissionRate: normalizeNumber(product?.commissionInfo?.commissionShare),
    sales30Days: normalizeNumber(product?.inOrderCount30Days),
    comments: normalizeNumber(product?.comments),
    image: pickImageUrl(product),
    shopName: (product?.shopInfo?.shopName as string) || "",
    materialUrl,
  }
}

const fetchTaobaoProduct = async (itemId: string, openIid?: string, sourceUrl?: string) => {
  const data = await apiRequest<Record<string, any>>("/api/taobao/product", {
    method: "POST",
    body: JSON.stringify({
      item_id: itemId || undefined,
      open_iid: openIid || undefined,
      source_url: sourceUrl || undefined,
    }),
  })
  return {
    title: String(data?.title || ""),
    price: normalizeNumber(data?.price),
    commissionRate: normalizePercent(data?.commissionRate),
    image: String(data?.cover || ""),
    shopName: String(data?.shopName || ""),
    materialUrl: String(data?.materialUrl || ""),
  }
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

const formatPrice = (value: number) => {
  if (!Number.isFinite(value)) return ""
  return value.toFixed(2)
}

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return ""
  return value % 1 === 0 ? `${value}%` : `${value.toFixed(2)}%`
}

const fetchCommissionProduct = async (link: string) => {
  const resolvedInput = await resolveBiliShortLink(link)
  const parsedLink = ensureHttp(resolvedInput || link)

  if (isTaobaoLink(parsedLink)) {
    const resolved = await resolveTaobaoLink(parsedLink)
    const landingUrl = ensureHttp(resolved.resolvedUrl || parsedLink || link)
    const buildTaobaoPlaceholder = () => ({
      title: "\u6DD8\u5B9D\u5546\u54C1\uFF08\u5F85\u8865\u5168\uFF09",
      price: 0,
      commissionRate: 0,
      image: "",
      shopName: "",
      sales30Days: 0,
      comments: 0,
      materialUrl: landingUrl,
      standardUrl: landingUrl,
      originalLink: link,
    })

    const itemId = resolved.itemId || resolved.openIid
    if (!itemId) {
      return buildTaobaoPlaceholder()
    }

    try {
      const product = await fetchTaobaoProduct(itemId, resolved.openIid, parsedLink || link)
      const materialUrl = product.materialUrl || landingUrl || parsedLink
      return {
        ...product,
        materialUrl,
        standardUrl: materialUrl,
        originalLink: link,
      }
    } catch {
      return buildTaobaoPlaceholder()
    }
  }

  const keyword = extractJdKeyword(parsedLink)
  const product = await fetchJdProduct(keyword, parsedLink)
  const materialUrl = product.materialUrl || parsedLink || link
  const standardUrl = materialUrl.includes("item.jd.com")
    ? materialUrl
    : await resolveJdUrl(materialUrl)
  return {
    ...product,
    materialUrl,
    standardUrl,
    originalLink: link,
  }
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
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [progressMessage, setProgressMessage] = useState("正在解析链接...")
  const [resultOpen, setResultOpen] = useState(false)
  const [resultItems, setResultItems] = useState<{ label: string; value: string }[]>([])
  const [resultHighlight, setResultHighlight] = useState({ label: "成功", value: "0 条" })
  const [selectVideoOpen, setSelectVideoOpen] = useState(false)
  const [benchmarkVideos, setBenchmarkVideos] = useState<BenchmarkVideo[]>([])
  const [benchmarkCategories, setBenchmarkCategories] = useState<BenchmarkCategory[]>([])
  const [benchmarkFilter, setBenchmarkFilter] = useState("all")
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveCategoryId, setArchiveCategoryId] = useState("")
  const [archiveTargetIds, setArchiveTargetIds] = useState<string[]>([])
  const [archiveSubmitting, setArchiveSubmitting] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [lastExtractedIds, setLastExtractedIds] = useState<string[]>([])
  const [lastNewIds, setLastNewIds] = useState<string[]>([])
  const authorRequestedRef = useRef<Set<string>>(new Set())
  const processingRef = useRef(false)
  const archiveInitFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const localItems = getLocalItems()
    setItems(localItems)
  }, [])

  const loadCategories = useCallback(async () => {
    const cache = getCache<unknown>(CATEGORY_CACHE_KEY)
    const cachedRaw = getCacheData(cache)
    const cachedCategories = normalizeCategoryCache(cachedRaw)
    const cachedArchiveCategories = buildArchiveCategories(cachedCategories)
    if (cachedArchiveCategories.length) {
      setCategories(cachedArchiveCategories)
    }

    const hasHierarchyMetadata = cachedCategories.some((category) => category.hasParentField)
    const shouldReuseFreshCache =
      isFresh(cache, CATEGORY_CACHE_TTL) && hasHierarchyMetadata && cachedArchiveCategories.length > 0

    if (shouldReuseFreshCache) {
      setIsCategoryLoading(false)
      return
    }

    if (!cachedArchiveCategories.length) {
      setIsCategoryLoading(true)
    }

    try {
      const response = await fetchCategories({ includeCounts: false })
      const cachePayload = (response.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order ?? 0,
        parentId: category.parent_id ?? null,
        count: category.item_count ?? 0,
        specFields: category.spec_fields ?? [],
      }))
      const normalized = buildArchiveCategories(normalizeCategoryCache(cachePayload))
      setCategories(normalized)
      setCache(CATEGORY_CACHE_KEY, cachePayload)
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

  const cancelArchiveInitFrame = useCallback(() => {
    if (archiveInitFrameRef.current === null) return
    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(archiveInitFrameRef.current)
    }
    archiveInitFrameRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      cancelArchiveInitFrame()
    }
  }, [cancelArchiveInitFrame])

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
      source: getCommissionSourceDisplay(item.spec),
      sourceLink: getCommissionSourceLink(item.spec),
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

  const getDedupeKey = useCallback((link: string, title: string) => {
    const digits = extractDigitsFromLink(link)
    if (digits) return digits
    if (link) return link.trim().toLowerCase()
    return title.trim().toLowerCase()
  }, [])

  const buildCommissionItem = useCallback(
    (
      product: CommissionProduct,
      context: { sourceLink?: string; sourceAuthor?: string; sourceLabel?: string }
    ) => {
      const promoLink = product.standardUrl || product.materialUrl || product.originalLink || ""
      const spec: Record<string, string> = {}
      if (promoLink) spec[META_KEYS.promoLink] = promoLink
      if (context.sourceLink) spec[META_KEYS.sourceLink] = context.sourceLink
      if (context.sourceAuthor) spec[META_KEYS.sourceAuthor] = context.sourceAuthor
      if (context.sourceLabel) spec[COMMISSION_SOURCE_LABEL_KEY] = context.sourceLabel
      if (product.shopName) spec[META_KEYS.shopName] = product.shopName
      if (product.sales30Days !== undefined && product.sales30Days !== null) {
        spec[META_KEYS.sales30] = String(product.sales30Days)
      }
      if (product.comments !== undefined && product.comments !== null) {
        spec[META_KEYS.comments] = String(product.comments)
      }

      return {
        id: createId(),
        title: product.title || "未命名商品",
        price: Number(product.price || 0),
        commissionRate: Number(product.commissionRate || 0),
        image: product.image || "",
        shopName: product.shopName || "",
        source: context.sourceLink || "",
        sales30: Number(product.sales30Days || 0),
        comments: Number(product.comments || 0),
        isFocused: false,
        spec,
      } as CommissionItem
    },
    []
  )

  const loadBenchmarkPickList = useCallback(
    async (force = false) => {
      const cache = getCache<{ categories: BenchmarkCategory[]; videos: BenchmarkVideo[] }>(
        BENCHMARK_PICK_CACHE_KEY
      )
      const cached = getCacheData(cache)
      if (cached?.videos?.length) {
        setBenchmarkCategories(cached.categories || [])
        setBenchmarkVideos(cached.videos || [])
        if (!force && isFresh(cache, BENCHMARK_PICK_CACHE_TTL)) {
          return cached.videos || []
        }
      }
      try {
        const data = await apiRequest<{ categories: BenchmarkCategory[]; entries: BenchmarkVideo[] }>(
          "/api/benchmark/state?mode=pick"
        )
        const categoryList = Array.isArray(data.categories) ? data.categories : []
        const entryList = Array.isArray(data.entries) ? data.entries : []
        const categoryMap = new Map(categoryList.map((item) => [String(item.id), item.name]))
        const videos = entryList.map((entry) => ({
          ...entry,
          category: categoryMap.get(String(entry.category_id || "")) || "未分类",
        }))
        setBenchmarkCategories(categoryList)
        setBenchmarkVideos(videos)
        setCache(BENCHMARK_PICK_CACHE_KEY, { categories: categoryList, videos })
        return videos
      } catch (error) {
        showToast(getUserErrorMessage(error, "加载对标视频失败"), "error")
        return cached?.videos || []
      }
    },
    [showToast]
  )

  const buildArchiveSpec = useCallback((item: CommissionItem) => {
    return buildCommissionArchiveSpec({
      id: item.id,
      spec: item.spec,
      shopName: item.shopName,
      sales30: item.sales30,
      comments: item.comments,
    })
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

  const startProcessing = (message: string) => {
    processingRef.current = true
    setProcessingOpen(true)
    setProgress({ current: 0, total: 0 })
    setProgressMessage(message)
    setResultOpen(false)
  }

  const finishProcessing = () => {
    processingRef.current = false
    setProcessingOpen(false)
  }

  const applyExtractionResult = (
    summary: {
      totalLinks: number
      jdLinks: number
      taobaoLinks: number
      newCount: number
      duplicateCount: number
      failedLinks: { link: string; reason: string }[]
    },
    addedItems: CommissionItem[],
    duplicateIds: string[]
  ) => {
    if (addedItems.length) {
      updateLocalItems((prev) => [...addedItems, ...prev])
    }
    setLastNewIds(addedItems.map((item) => item.id))
    setLastExtractedIds(
      Array.from(new Set([...duplicateIds, ...addedItems.map((item) => item.id)]))
    )
    setResultItems([
      { label: "总链接", value: `${summary.totalLinks} 条` },
      { label: "京东链接", value: `${summary.jdLinks} 条` },
      { label: "淘宝链接", value: `${summary.taobaoLinks} 条` },
      { label: "重复", value: `${summary.duplicateCount} 条` },
      { label: "失败", value: `${summary.failedLinks.length} 条` },
    ])
    if (summary.failedLinks.length > 0) {
      const firstFailureReason = normalizeExtractionError(summary.failedLinks[0]?.reason || "")
      if (summary.newCount === 0) {
        showToast(firstFailureReason, "error")
      } else {
        showToast(`部分链接解析失败：${firstFailureReason}`, "info")
      }
    }
    setResultHighlight({ label: "新增商品", value: `${summary.newCount} 条` })
    setResultOpen(true)
  }

  const extractFromBiliLinks = async (videoLinks: string[]) => {
    const uniqueVideos = Array.from(new Set(videoLinks.map((link) => link.trim()).filter(Boolean)))
    if (!uniqueVideos.length) {
      showToast("请输入有效的B站链接", "info")
      return
    }
    if (processingRef.current) {
      showToast("正在解析中，请稍后", "info")
      return
    }
    startProcessing("正在获取视频评论...")
    const summary = {
      totalLinks: 0,
      jdLinks: 0,
      taobaoLinks: 0,
      newCount: 0,
      duplicateCount: 0,
      failedLinks: [] as { link: string; reason: string }[],
    }
    const addedItems: CommissionItem[] = []
    const duplicateIds: string[] = []
    const dedupeMap = new Map<string, CommissionItem>()
    items.forEach((item) => {
      const key = getDedupeKey(
        item.spec?.[META_KEYS.promoLink] || item.spec?.[META_KEYS.sourceLink] || "",
        item.title
      )
      if (key) dedupeMap.set(key, item)
    })
    const commentTracker = { total: uniqueVideos.length, started: 0 }
    const productTracker = { total: 0, processed: 0 }
    const productQueue = createAsyncQueue<{
      link: string
      context: { sourceLink?: string; sourceAuthor?: string }
    }>()
    const productRunner = runQueueWithConcurrency(
      productQueue,
      PRODUCT_CONCURRENCY,
      async ({ link, context }) => {
        try {
          const product = await fetchCommissionProduct(link)
          const promoLink = product.standardUrl || product.materialUrl || product.originalLink || link
          const key = getDedupeKey(promoLink, product.title || "")
          const existing = key ? dedupeMap.get(key) : undefined
          if (existing) {
            summary.duplicateCount += 1
            duplicateIds.push(existing.id)
          } else {
            const item = buildCommissionItem(
              { ...product, standardUrl: promoLink, originalLink: link },
              context
            )
            if (key) {
              dedupeMap.set(key, item)
            }
            addedItems.push(item)
            summary.newCount += 1
          }
        } catch (error) {
          summary.failedLinks.push({ link, reason: getUserErrorMessage(error, "解析失败") })
        } finally {
          productTracker.processed += 1
          setProgress({ current: productTracker.processed, total: productTracker.total })
        }
      }
    )

    const enqueueProductLinks = (
      links: string[],
      context: { sourceLink?: string; sourceAuthor?: string }
    ) => {
      if (!links.length) return
      productTracker.total += links.length
      setProgress({ current: productTracker.processed, total: productTracker.total })
      links.forEach((link) => productQueue.push({ link, context }))
    }

    const isRetryableBiliError = (error: unknown) => {
      if (error instanceof BiliApiError) {
        return BILI_RETRYABLE_CODES.has(String(error.code))
      }
      if (error instanceof Error && /HTTP 429/i.test(error.message)) {
        return true
      }
      return false
    }

    await runWithConcurrency(uniqueVideos, VIDEO_CONCURRENCY, async (link) => {
      commentTracker.started += 1
      setProgressMessage(`正在获取评论 (${commentTracker.started}/${commentTracker.total})`)
      try {
        const commentData = await retryWithBackoff(() => getPinnedComments(link), {
          retries: 2,
          shouldRetry: isRetryableBiliError,
          baseDelayMs: 500,
        })
        const sourceAuthor = commentData.videoInfo?.author || ""
        const linkObjects: string[] = []
        commentData.pinnedComments.forEach((comment) => {
          const items = extractLinksFromComment(comment, {
            allowUnionClick: true,
            allowTaobaoPromo: true,
          })
          items.forEach((item) => linkObjects.push(item.url))
        })
        commentData.subReplies.forEach((comment) => {
          const items = extractLinksFromComment(comment, {
            allowUnionClick: true,
            allowTaobaoPromo: true,
          })
          items.forEach((item) => linkObjects.push(item.url))
        })
        const uniqueLinks = Array.from(new Set(linkObjects))
        summary.totalLinks += uniqueLinks.length
        const jdLinks = uniqueLinks.filter((item) => isJdLink(item))
        const taobaoLinks = uniqueLinks.filter((item) => isTaobaoLink(item))
        const shortLinks = uniqueLinks.filter((item) => isBiliShortLink(item))
        summary.jdLinks += jdLinks.length
        summary.taobaoLinks += taobaoLinks.length
        enqueueProductLinks([...jdLinks, ...taobaoLinks, ...shortLinks], {
          sourceLink: link,
          sourceAuthor,
        })
      } catch (error) {
        summary.failedLinks.push({ link, reason: getUserErrorMessage(error, "解析视频失败") })
      }
    })

    productQueue.close()
    setProgressMessage("正在获取商品信息...")
    await productRunner

    finishProcessing()
    if (summary.totalLinks === 0) {
      showToast("未解析到可用商品链接", "info")
      return
    }
    applyExtractionResult(summary, addedItems, duplicateIds)
  }

  const handleParsePromo = async () => {
    if (processingRef.current) {
      showToast("正在解析中，请稍后", "info")
      return
    }
    const lines = parseLines(inputValue)
    const jdLinks = lines.filter((line) => isJdLink(line))
    const taobaoLinks = lines.filter((line) => isTaobaoLink(line))
    const shortLinks = lines.filter((line) => isBiliShortLink(line))
    const uniqueLinks = Array.from(new Set([...jdLinks, ...taobaoLinks, ...shortLinks]))
    if (!uniqueLinks.length) {
      showToast("请粘贴有效的推广链接", "error")
      return
    }
    startProcessing("正在解析推广链接...")
    setProgressMessage("正在获取商品信息...")
    const summary = {
      totalLinks: uniqueLinks.length,
      jdLinks: jdLinks.length,
      taobaoLinks: taobaoLinks.length,
      newCount: 0,
      duplicateCount: 0,
      failedLinks: [] as { link: string; reason: string }[],
    }
    const addedItems: CommissionItem[] = []
    const duplicateIds: string[] = []
    const dedupeMap = new Map<string, CommissionItem>()
    items.forEach((item) => {
      const key = getDedupeKey(
        item.spec?.[META_KEYS.promoLink] || item.spec?.[META_KEYS.sourceLink] || "",
        item.title
      )
      if (key) dedupeMap.set(key, item)
    })
    const tracker = { total: uniqueLinks.length, processed: 0 }
    setProgress({ current: 0, total: tracker.total })
    for (const link of uniqueLinks) {
      try {
        const product = await fetchCommissionProduct(link)
        const promoLink = product.standardUrl || product.materialUrl || product.originalLink || link
        const key = getDedupeKey(promoLink, product.title || "")
        const existing = key ? dedupeMap.get(key) : undefined
        if (existing) {
          summary.duplicateCount += 1
          duplicateIds.push(existing.id)
        } else {
          const item = buildCommissionItem(
            { ...product, standardUrl: promoLink, originalLink: link },
            { sourceLink: link, sourceLabel: "链接提取" }
          )
          if (key) dedupeMap.set(key, item)
          addedItems.push(item)
          summary.newCount += 1
        }
      } catch (error) {
        summary.failedLinks.push({ link, reason: getUserErrorMessage(error, "解析失败") })
      } finally {
        tracker.processed += 1
        setProgress({ current: tracker.processed, total: tracker.total })
      }
    }
    finishProcessing()
    applyExtractionResult(summary, addedItems, duplicateIds)
  }

  const handleClearAll = () => {
    if (!items.length) {
      showToast("暂无可清空的商品", "info")
      return
    }
    setClearOpen(true)
  }

  const handleExport = () => {
    if (!filteredItems.length) {
      showToast("没有可导出的商品数据", "info")
      return
    }
    const headers = getCommissionExportHeaders()
    const rows = filteredItems.map((item) => {
      const promoLink = item.spec?.[META_KEYS.promoLink] || item.spec?.[META_KEYS.sourceLink] || ""
      const commission = (item.price * item.commissionRate) / 100
      return getCommissionRowValues({
        title: item.title || "",
        price: formatPrice(item.price),
        commission: formatPrice(commission),
        commissionRate: formatPercent(item.commissionRate),
        sales30: item.sales30 || "",
        comments: item.comments || "",
        shopName: item.shopName || "",
        promoLink,
        source: getCommissionSourceDisplay(item.spec),
      })
    })
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    worksheet["!cols"] = getCommissionExportColumns()
    XLSX.utils.book_append_sheet(workbook, worksheet, "商品佣金")
    const filename = `带货商品_${getTimestamp()}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  const handleOpenBenchmark = async () => {
    const videos = await loadBenchmarkPickList()
    if (!videos.length) {
      showToast("还没有可用的对标视频记录", "info")
      return
    }
    setBenchmarkFilter("all")
    setSelectedVideos([])
    setSelectVideoOpen(true)
  }

  const handleBenchmarkExtract = async () => {
    const selected = benchmarkVideos.filter((item) => selectedVideos.includes(item.id))
    if (!selected.length) {
      showToast("请选择对标视频", "info")
      return
    }
    const links = selected
      .map((entry) => entry.link || (entry.bvid ? `https://www.bilibili.com/video/${entry.bvid}` : ""))
      .filter(Boolean)
    if (!links.length) {
      showToast("所选视频无可用链接", "error")
      return
    }
    setSelectVideoOpen(false)
    await extractFromBiliLinks(links)
  }

  const openArchive = (ids: string[]) => {
    if (!ids.length) {
      showToast("暂无可归档商品", "info")
      return
    }
    cancelArchiveInitFrame()
    setArchiveTargetIds(ids)
    setArchiveOpen(true)
  }

  const openArchiveAll = useCallback(() => {
    if (!filteredItems.length) {
      showToast("暂无可归档商品", "info")
      return
    }

    cancelArchiveInitFrame()
    setArchiveTargetIds([])
    setArchiveOpen(true)

    const nextIds = filteredItems.map((item) => item.id)
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      archiveInitFrameRef.current = window.requestAnimationFrame(() => {
        archiveInitFrameRef.current = null
        setArchiveTargetIds(nextIds)
      })
      return
    }

    setTimeout(() => {
      setArchiveTargetIds(nextIds)
    }, 0)
  }, [cancelArchiveInitFrame, filteredItems, showToast])

  const handleCloseArchive = useCallback(() => {
    cancelArchiveInitFrame()
    setArchiveOpen(false)
    setArchiveTargetIds([])
  }, [cancelArchiveInitFrame])

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
      showToast(getUserErrorMessage(error, "归档失败"), "error")
    } finally {
      setArchiveSubmitting(false)
    }
  }

  const archiveCount = useMemo(() => {
    if (!archiveTargetIds.length) return 0
    const targetSet = new Set(archiveTargetIds)
    return items.filter((item) => targetSet.has(item.id) && !isItemArchived(item)).length
  }, [archiveTargetIds, items])

  const moveItemsToTop = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      const idSet = new Set(ids)
      updateLocalItems((prev) => {
        const top = prev.filter((item) => idSet.has(item.id))
        const rest = prev.filter((item) => !idSet.has(item.id))
        return [...top, ...rest]
      })
    },
    [updateLocalItems]
  )

  const sortedCategories = useMemo(() => categories, [categories])

  const filteredBenchmarkVideos = useMemo(() => {
    if (benchmarkFilter === "all") return benchmarkVideos
    return benchmarkVideos.filter(
      (item) => String(item.category_id || "") === benchmarkFilter
    )
  }, [benchmarkFilter, benchmarkVideos])

  const benchmarkVideoItems = useMemo(
    () =>
      filteredBenchmarkVideos.map((item) => ({
        id: item.id,
        title: item.title || "未命名视频",
        source: "B站",
        tag: item.category || "未分类",
      })),
    [filteredBenchmarkVideos]
  )

  const handleCardClick = (id: string) => {
    const target = items.find((item) => item.id === id)
    if (!target) return
    const link = String(
      target.spec?.[META_KEYS.promoLink] || target.spec?.[META_KEYS.sourceLink] || ""
    ).trim()
    if (!link) return
    window.open(link, "_blank")
  }

  return (
    <>
      <CommissionPageView
        inputValue={inputValue}
        onInputChange={setInputValue}
        items={itemsView}
        isProcessing={processingOpen}
        progress={progress}
        progressMessage={progressMessage}
        resultOpen={resultOpen}
        resultItems={resultItems}
        resultHighlight={resultHighlight}
        selectVideoOpen={selectVideoOpen}
        videoItems={benchmarkVideoItems}
        videoCategories={benchmarkCategories}
        videoCategoryFilter={benchmarkFilter}
        onVideoCategoryChange={setBenchmarkFilter}
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
        onEdit={(id) => setEditTargetId(id)}
        onArchive={(id) => openArchive([id])}
        onDelete={(id) => {
          updateLocalItems((prev) => prev.filter((item) => item.id !== id))
          showToast("删除成功", "success")
        }}
        onCardClick={handleCardClick}
        onClearAll={handleClearAll}
        onExport={handleExport}
        onParseBili={() => {
          const urls = parseLines(inputValue).filter((line) => isBilibiliInput(line))
          void extractFromBiliLinks(urls)
        }}
        onParsePromo={() => {
          void handleParsePromo()
        }}
        onParseBenchmark={() => {
          void handleOpenBenchmark()
        }}
        onCloseProgress={() => setProcessingOpen(false)}
        onCloseResult={() => setResultOpen(false)}
        onSortAll={() => {
          if (!lastExtractedIds.length) {
            showToast("暂无可置顶的商品", "info")
            return
          }
          moveItemsToTop(lastExtractedIds)
          setResultOpen(false)
          showToast("已将提取商品置顶", "success")
        }}
        onSortNew={() => {
          if (!lastNewIds.length) {
            showToast("暂无新增商品", "info")
            return
          }
          moveItemsToTop(lastNewIds)
          setResultOpen(false)
          showToast("已将新增商品置顶", "success")
        }}
        onToggleVideo={(id) =>
          setSelectedVideos((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
          )
        }
        onStartExtract={() => {
          void handleBenchmarkExtract()
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
        onArchiveAll={openArchiveAll}
      />
      <CommissionDialogs
        clearOpen={clearOpen}
        onClearOpenChange={setClearOpen}
        onConfirmClear={() => {
          updateLocalItems(() => [])
          setClearOpen(false)
          setLastExtractedIds([])
          setLastNewIds([])
          showToast("已清空列表", "success")
        }}
        archiveOpen={archiveOpen}
        categories={sortedCategories}
        selectedCategoryId={archiveCategoryId}
        itemCount={archiveCount}
        isSubmitting={archiveSubmitting}
        isLoading={isCategoryLoading}
        onCategoryChange={setArchiveCategoryId}
        onConfirmArchive={handleArchiveConfirm}
        onCloseArchive={handleCloseArchive}
      />
    </>
  )
}
