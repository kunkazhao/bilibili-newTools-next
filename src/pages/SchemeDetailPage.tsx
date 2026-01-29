import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { apiRequest } from "@/lib/api"
import { useToast } from "@/components/Toast"
import Empty from "@/components/Empty"
import JSZip from "jszip"
import html2canvas from "html2canvas"
import * as XLSX from "xlsx"

const PLACEHOLDER_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='120' viewBox='0 0 160 120'%3E%3Crect width='160' height='120' rx='12' fill='%23F3F5FA'/%3E%3Cpath d='M80 36v48M56 60h48' stroke='%239AA6BF' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E"

const PROMPT_DEFAULTS = {
  title: "你是电商标题策划，请基于选品信息生成 5 条短标题，突出卖点与价格优势，避免夸张与重复。",
  intro: "你是电商视频文案助手，请基于选品信息生成一段视频简介，信息完整、结构清晰，控制在 120 字以内。",
  vote: "你是电商投票策划，请基于选品信息生成投票文案，包含简短背景、候选项要点与引导语。",
  image: "你是电商视觉策划，结合选品参数生成商品图的文案与标题。",
  comment_reply:
    "你是电商评论运营助手，请基于选品信息生成 {{count}} 组评论与回复。要求语气真实、互动自然，并包含购买引导。{{prompt}}输出格式示例：\n评论：...\n回复：...",
} as const

const META_SPEC_KEYS = {
  promoLink: "_promo_link",
  shopName: "_shop_name",
  sales30: "_sales_30",
  comments: "_comments",
  sourceLink: "_source_link",
  blueLink: "_blue_link",
} as const

const IMAGE_TEMPLATE_CACHE_KEY = "image_template_cache_v1"
const BLUE_LINK_STATE_CACHE_PREFIX = "scheme_blue_link_state_v1"
const CACHE_TTL = 5 * 60 * 1000

interface SchemeItem {
  id: string
  uid?: string
  source_id?: string
  title?: string
  price?: number
  commission?: number
  commission_rate?: number
  cover_url?: string
  cover?: string
  image?: string
  coverUrl?: string
  link?: string
  remark?: string
  spec?: Record<string, string>
}

interface Scheme {
  id: string
  name: string
  category_id: string
  category_name?: string
  remark?: string
  created_at?: string
  items?: SchemeItem[]
}

interface BlueLinkAccount {
  id: string
  name: string
}

interface BlueLinkEntry {
  id: string
  account_id?: string
  product_id?: string
  source_link?: string
}

interface ImageTemplate {
  id: string
  name?: string
  category?: string
  html?: string
}

interface BlueLinkGroup {
  label: string
  lines: string[]
}

interface SchemeDetailPageProps {
  schemeId: string
  onBack: () => void
}

function formatDate(value?: string) {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function formatNumber(value?: number) {
  if (value === null || value === undefined) return "--"
  const num = Number(value)
  if (Number.isNaN(num)) return "--"
  return num % 1 === 0 ? `${num}` : num.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
}

function formatCurrencyText(value?: number) {
  const formatted = formatNumber(value)
  if (!formatted || formatted === "--") return "--"
  return `${formatted}元`
}

function formatRate(value?: number) {
  if (value === null || value === undefined) return "--"
  const num = Number(value)
  if (Number.isNaN(num)) return "--"
  return num % 1 === 0 ? `${num}%` : `${num.toFixed(1)}%`
}

function getMeta(spec?: Record<string, string>) {
  if (!spec) return { promoLink: "", shopName: "", sales30: "", comments: "", sourceLink: "", blueLink: "" }
  return {
    promoLink: spec[META_SPEC_KEYS.promoLink] ?? "",
    shopName: spec[META_SPEC_KEYS.shopName] ?? "",
    sales30: spec[META_SPEC_KEYS.sales30] ?? "",
    comments: spec[META_SPEC_KEYS.comments] ?? "",
    sourceLink: spec[META_SPEC_KEYS.sourceLink] ?? "",
    blueLink: spec[META_SPEC_KEYS.blueLink] ?? "",
  }
}

function stripMetaSpec(spec?: Record<string, string>) {
  if (!spec) return {}
  return Object.fromEntries(Object.entries(spec).filter(([key]) => !String(key || "").startsWith("_")))
}

function sanitizeFilename(value: string) {
  const base = String(value || "image").trim() || "image"
  return base.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60)
}

function getDisplayCover(item: SchemeItem) {
  return item.cover_url || item.coverUrl || item.cover || item.image || PLACEHOLDER_COVER
}

function normalizePresetFields(fields: Array<string | { key?: string; name?: string }> = []) {
  const seen = new Set()
  const normalized: string[] = []
  fields.forEach((field) => {
    let key = ""
    if (typeof field === "string" || typeof field === "number") {
      key = String(field).trim()
    } else if (field && typeof field === "object") {
      key = String(field.key || field.name || "").trim()
    }
    if (!key || seen.has(key)) return
    seen.add(key)
    normalized.push(key)
  })
  return normalized
}

function buildSpecDetailText(params: Record<string, string>, separator = " / ", limit = 8) {
  if (!params || typeof params !== "object") return ""
  return Object.entries(params)
    .filter(([key, value]) => key && value !== undefined && value !== null && value !== "")
    .slice(0, limit)
    .map(([key, value]) => `${key}: ${value}`)
    .join(separator)
}

export default function SchemeDetailPage({ schemeId, onBack }: SchemeDetailPageProps) {
  const { showToast } = useToast()
  const imageRenderRef = useRef<HTMLDivElement | null>(null)
  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [items, setItems] = useState<SchemeItem[]>([])
  const [sourceItems, setSourceItems] = useState<SchemeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [sortValue, setSortValue] = useState("price-asc")

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerKeyword, setPickerKeyword] = useState("")
  const [pickerItems, setPickerItems] = useState<SchemeItem[]>([])
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set())
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerHasMore, setPickerHasMore] = useState(false)
  const [pickerOffset, setPickerOffset] = useState(0)

  const [promptTemplates, setPromptTemplates] = useState<Record<string, string>>({ ...PROMPT_DEFAULTS })
  const [promptEditOpen, setPromptEditOpen] = useState(false)
  const [promptEditType, setPromptEditType] = useState<keyof typeof PROMPT_DEFAULTS | null>(null)
  const [promptEditValue, setPromptEditValue] = useState("")

  const [titleOutput, setTitleOutput] = useState("")
  const [introOutput, setIntroOutput] = useState("")
  const [voteOutput, setVoteOutput] = useState("")
  const [commentReplyOutput, setCommentReplyOutput] = useState("")
  const [commentReplyPrompt, setCommentReplyPrompt] = useState("")
  const [commentReplyCount, setCommentReplyCount] = useState(5)

  const [blueRanges, setBlueRanges] = useState<Array<{ min: number | null; max: number | null }>>([
    { min: 0, max: 100 },
    { min: 100, max: 300 },
    { min: 300, max: 500 },
    { min: 500, max: null },
  ])
  const [blueLinkAccounts, setBlueLinkAccounts] = useState<BlueLinkAccount[]>([])
  const [blueLinkEntries, setBlueLinkEntries] = useState<BlueLinkEntry[]>([])
  const [blueLinkGroups, setBlueLinkGroups] = useState<BlueLinkGroup[]>([])
  const [blueLinkMissing, setBlueLinkMissing] = useState("")
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [blueLinkKey, setBlueLinkKey] = useState("")

  const [presetFields, setPresetFields] = useState<string[]>([])
  const [imageTemplates, setImageTemplates] = useState<ImageTemplate[]>([])
  const [templateCategories, setTemplateCategories] = useState<string[]>([])
  const [activeTemplateCategory, setActiveTemplateCategory] = useState("")
  const [activeTemplateId, setActiveTemplateId] = useState("")
  const [templateMissing, setTemplateMissing] = useState("")
  const [imageStatus, setImageStatus] = useState<{ message: string; type: "info" | "error" | "success" } | null>(
    null
  )

  const [feishuOpen, setFeishuOpen] = useState(false)
  const [feishuProductLink, setFeishuProductLink] = useState("")
  const [feishuProductMode, setFeishuProductMode] = useState("append")
  const [feishuSpecEnabled, setFeishuSpecEnabled] = useState(false)
  const [feishuSpecLink, setFeishuSpecLink] = useState("")
  const [feishuSpecMode, setFeishuSpecMode] = useState("append")
  const [feishuSubmitting, setFeishuSubmitting] = useState(false)

  const filteredItems = useMemo(() => {
    const min = priceMin.trim() ? Number(priceMin) : null
    const max = priceMax.trim() ? Number(priceMax) : null
    let list = items.slice()
    if (min !== null && !Number.isNaN(min)) {
      list = list.filter((item) => (item.price ?? 0) >= min)
    }
    if (max !== null && !Number.isNaN(max)) {
      list = list.filter((item) => (item.price ?? 0) <= max)
    }
    if (sortValue === "manual") {
      return list
    }
    if (sortValue === "price-asc") {
      list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    } else if (sortValue === "price-desc") {
      list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    } else if (sortValue === "commission-desc") {
      list.sort((a, b) => (b.commission_rate ?? 0) - (a.commission_rate ?? 0))
    } else if (sortValue === "sales-desc") {
      list.sort((a, b) => {
        const aSales = Number(getMeta(a.spec).sales30) || 0
        const bSales = Number(getMeta(b.spec).sales30) || 0
        return bSales - aSales
      })
    }
    return list
  }, [items, priceMin, priceMax, sortValue])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await apiRequest<{ scheme: Scheme }>(`/api/schemes/${schemeId}`)
        const loaded = data.scheme
        setScheme(loaded)
        setItems(Array.isArray(loaded?.items) ? loaded.items : [])
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载方案失败"
        showToast(message, "error")
      } finally {
        setLoading(false)
      }
    }

    load().catch(() => {})
  }, [schemeId, showToast])

  useEffect(() => {
    const loadPromptTemplates = async () => {
      const keys = ["title", "intro", "vote", "image", "comment_reply"]
      try {
        const data = await apiRequest<{ templates: Record<string, string> }>(
          `/api/prompts?keys=${keys.join(",")}`
        )
        setPromptTemplates({ ...PROMPT_DEFAULTS, ...(data.templates || {}) })
      } catch {
        setPromptTemplates({ ...PROMPT_DEFAULTS })
      }
    }
    loadPromptTemplates().catch(() => {})
  }, [])

  useEffect(() => {
    const loadPreset = async () => {
      if (!scheme?.category_id) return
      try {
        const data = await apiRequest<{ categories: Array<{ id: string; spec_fields?: string[] }> }>(
          "/api/sourcing/categories?include_counts=false"
        )
        const categories = Array.isArray(data.categories) ? data.categories : []
        const category = categories.find((item) => String(item.id) === String(scheme.category_id))
        setPresetFields(normalizePresetFields(category?.spec_fields || []))
      } catch {
        setPresetFields([])
      }
    }
    loadPreset().catch(() => {})
  }, [scheme?.category_id])

  useEffect(() => {
    const loadSourceItems = async () => {
      if (!scheme?.category_id) return
      try {
        const params = new URLSearchParams()
        params.set("limit", "50")
        params.set("offset", "0")
        params.set("fields", "list")
        params.set("category_id", scheme.category_id)
        const data = await apiRequest<{ items: SchemeItem[] }>(`/api/sourcing/items?${params.toString()}`)
        setSourceItems(Array.isArray(data.items) ? data.items : [])
      } catch {
        setSourceItems([])
      }
    }
    loadSourceItems().catch(() => {})
  }, [scheme?.category_id])

  useEffect(() => {
    if (!items.length) return
    void loadBlueLinkMappingState(true)
  }, [items])

  useEffect(() => {
    void loadImageTemplates()
  }, [])

  const persistItems = async (nextItems: SchemeItem[], message?: string) => {
    try {
      const response = await apiRequest<{ scheme: Scheme }>(`/api/schemes/${schemeId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ items: nextItems }),
        }
      )
      setScheme(response.scheme)
      setItems(Array.isArray(response.scheme.items) ? response.scheme.items : [])
      if (message) showToast(message, "success")
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存失败"
      showToast(text, "error")
    }
  }

  const removeItem = async (id: string) => {
    const nextItems = items.filter((item) => item.id !== id)
    await persistItems(nextItems, "已移除商品")
  }

  const handleClearFiltered = async () => {
    if (!filteredItems.length) {
      showToast("当前没有可清空的商品", "info")
      return
    }
    const confirmed = window.confirm(`确认移除当前筛选下的 ${filteredItems.length} 个商品吗？该操作无法撤销。`)
    if (!confirmed) return
    const removeIds = new Set(filteredItems.map((item) => item.id))
    const nextItems = items.filter((item) => !removeIds.has(item.id))
    await persistItems(nextItems, "已移除筛选商品")
  }

  const openPicker = () => {
    setPickerOpen(true)
    setPickerSelected(new Set())
    setPickerOffset(0)
    setPickerKeyword("")
    void loadPickerItems(true)
  }

  const loadPickerItems = async (reset = false) => {
    if (pickerLoading) return
    if (!scheme?.category_id) return
    setPickerLoading(true)
    const limit = 50
    const offset = reset ? 0 : pickerOffset
    const params = new URLSearchParams()
    params.set("limit", String(limit))
    params.set("offset", String(offset))
    params.set("fields", "list")
    params.set("category_id", scheme.category_id)
    if (pickerKeyword.trim()) params.set("q", pickerKeyword.trim())
    try {
      const data = await apiRequest<{ items: SchemeItem[]; has_more?: boolean; next_offset?: number }>(
        `/api/sourcing/items?${params.toString()}`
      )
      const list = Array.isArray(data.items) ? data.items : []
      setPickerItems((prev) => (reset ? list : prev.concat(list)))
      setPickerHasMore(Boolean(data.has_more))
      setPickerOffset(data.next_offset ?? offset + list.length)
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载选品失败"
      showToast(message, "error")
    } finally {
      setPickerLoading(false)
    }
  }

  const addSelectedItems = async () => {
    if (!pickerSelected.size) {
      showToast("请先选择商品", "info")
      return
    }
    const selected = pickerItems.filter((item) => pickerSelected.has(item.id))
    const existingIds = new Set(items.map((item) => item.id))
    const nextItems = items.concat(selected.filter((item) => !existingIds.has(item.id)))
    await persistItems(nextItems, "已添加到方案")
    setPickerOpen(false)
  }

  const handleDragStart = (id: string) => {
    ;(window as Window & { __schemeDragId?: string }).__schemeDragId = id
  }

  const handleDrop = async (id: string) => {
    const dragId = (window as Window & { __schemeDragId?: string }).__schemeDragId
    if (!dragId || dragId === id) return
    const current = [...items]
    const fromIndex = current.findIndex((item) => item.id === dragId)
    const toIndex = current.findIndex((item) => item.id === id)
    if (fromIndex === -1 || toIndex === -1) return
    const [moved] = current.splice(fromIndex, 1)
    current.splice(toIndex, 0, moved)
    setSortValue("manual")
    await persistItems(current)
  }

  const buildPromptItems = () =>
    items.map((item) => {
      const meta = getMeta(item.spec)
      return {
        title: item.title || "",
        price: formatCurrencyText(item.price),
        commission: formatCurrencyText(item.commission),
        commissionRate: formatRate(item.commission_rate),
        sales30Days: meta.sales30 ?? "",
        comments: meta.comments ?? "",
        shopName: meta.shopName || "",
        link: item.link || meta.promoLink || "",
        blueLink: meta.blueLink || "",
        params: stripMetaSpec(item.spec || {}),
      }
    })

  const openPromptEditor = (type: keyof typeof PROMPT_DEFAULTS) => {
    setPromptEditType(type)
    setPromptEditValue(promptTemplates[type] || "")
    setPromptEditOpen(true)
  }

  const savePromptTemplate = async () => {
    if (!promptEditType) return
    const content = promptEditValue.trim()
    try {
      await apiRequest(`/api/prompts/${promptEditType}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      })
      setPromptTemplates((prev) => ({
        ...prev,
        [promptEditType]: content || PROMPT_DEFAULTS[promptEditType],
      }))
      showToast("提示词已保存", "success")
      setPromptEditOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "提示词保存失败"
      showToast(message, "error")
    }
  }

  const generateText = async (
    type: "title" | "intro" | "vote",
    setOutput: (value: string) => void
  ) => {
    if (!items.length) {
      showToast("暂无选品可生成", "error")
      return
    }
    try {
      const response = await apiRequest<{ output: string }>("/api/scheme/generate-text", {
        method: "POST",
        body: JSON.stringify({
          type,
          prompt: promptTemplates[type] || PROMPT_DEFAULTS[type],
          items: buildPromptItems(),
        }),
      })
      setOutput(response.output || "")
      showToast("生成完成", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败"
      showToast(message, "error")
    }
  }

  const getCommentReplyCount = () => {
    const count = Number(commentReplyCount)
    if (!Number.isFinite(count) || count <= 0) return 5
    return Math.min(Math.max(Math.floor(count), 1), 20)
  }

  const buildCommentReplyPrompt = () => {
    const count = getCommentReplyCount()
    const extra = commentReplyPrompt.trim() ? `补充要求：${commentReplyPrompt.trim()}\n` : ""
    const template = promptTemplates.comment_reply || PROMPT_DEFAULTS.comment_reply
    return template.replace("{{count}}", String(count)).replace("{{prompt}}", extra)
  }

  const generateCommentReply = async () => {
    if (!items.length) {
      showToast("暂无选品可生成", "error")
      return
    }
    try {
      const response = await apiRequest<{ output: string }>("/api/scheme/generate-text", {
        method: "POST",
        body: JSON.stringify({
          type: "comment_reply",
          prompt: buildCommentReplyPrompt(),
          items: buildPromptItems(),
        }),
      })
      setCommentReplyOutput(response.output || "")
      showToast("生成完成", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败"
      showToast(message, "error")
    }
  }

  const copyText = async (text: string, message: string) => {
    const content = String(text || "").trim()
    if (!content) {
      showToast("暂无可复制内容", "info")
      return
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = content
        textarea.style.position = "fixed"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      showToast(message, "success")
    } catch {
      showToast("复制失败，请手动复制", "error")
    }
  }

  const getBlueLinkAccountCacheKey = () => `scheme_blue_link_accounts_${schemeId}`

  const persistBlueLinkAccountSelection = (selection: Set<string>) => {
    try {
      localStorage.setItem(getBlueLinkAccountCacheKey(), JSON.stringify(Array.from(selection)))
    } catch {
      // ignore
    }
  }

  const restoreBlueLinkAccountSelection = (accounts: BlueLinkAccount[]) => {
    const validIds = new Set(accounts.map((account) => account.id))
    const selected = new Set<string>()
    try {
      const raw = localStorage.getItem(getBlueLinkAccountCacheKey())
      if (raw) {
        const stored = JSON.parse(raw)
        if (Array.isArray(stored)) {
          stored.forEach((id) => {
            if (validIds.has(id)) selected.add(id)
          })
        }
      }
    } catch {
      // ignore
    }
    if (!selected.size) {
      accounts.forEach((account) => selected.add(account.id))
    }
    setSelectedAccountIds(selected)
  }

  const getBlueLinkProductIds = () =>
    Array.from(new Set(items.map((item) => String(item.source_id || item.id)).filter(Boolean)))

  const loadBlueLinkMappingState = async (force = false) => {
    const productIds = getBlueLinkProductIds()
    const key = productIds.join(",")
    if (!force && key && key === blueLinkKey && blueLinkAccounts.length) return
    const cacheKey = `${BLUE_LINK_STATE_CACHE_PREFIX}_${schemeId}_${key}`
    if (!force) {
      try {
        const raw = localStorage.getItem(cacheKey)
        if (raw) {
          const cache = JSON.parse(raw) as { timestamp: number; accounts: BlueLinkAccount[]; entries: BlueLinkEntry[] }
          if (cache?.timestamp && Date.now() - cache.timestamp < CACHE_TTL) {
            setBlueLinkAccounts(Array.isArray(cache.accounts) ? cache.accounts : [])
            setBlueLinkEntries(Array.isArray(cache.entries) ? cache.entries : [])
            restoreBlueLinkAccountSelection(Array.isArray(cache.accounts) ? cache.accounts : [])
          }
        }
      } catch {
        // ignore
      }
    }
    setBlueLinkKey(key)
    const params = productIds.length ? `?product_ids=${encodeURIComponent(productIds.join(","))}` : ""
    try {
      const data = await apiRequest<{ accounts: BlueLinkAccount[]; entries: BlueLinkEntry[] }>(
        `/api/blue-link-map/state${params}`
      )
      const accounts = Array.isArray(data.accounts) ? data.accounts : []
      const entries = Array.isArray(data.entries) ? data.entries : []
      setBlueLinkAccounts(accounts)
      setBlueLinkEntries(entries)
      restoreBlueLinkAccountSelection(accounts)
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ timestamp: Date.now(), accounts, entries })
        )
      } catch {
        // ignore
      }
    } catch {
      setBlueLinkAccounts([])
      setBlueLinkEntries([])
      setSelectedAccountIds(new Set())
    }
  }

  const formatRangeLabel = (range: { min: number | null; max: number | null }) => {
    if (range.min !== null && range.max !== null) return `${range.min}-${range.max}`
    if (range.min !== null && range.max === null) return `${range.min}+`
    if (range.min === null && range.max !== null) return `≤${range.max}`
    return "不限"
  }

  const generateBlueLinks = () => {
    if (!items.length) {
      showToast("暂无选品可生成", "error")
      return
    }
    if (!blueLinkAccounts.length) {
      showToast("暂无账号可用于蓝链生成", "error")
      return
    }
    const ranges = blueRanges.filter((range) => range.min !== null || range.max !== null)
    if (!ranges.length) {
      showToast("请先设置价格区间", "error")
      return
    }
    if (!selectedAccountIds.size) {
      setBlueLinkMissing("请先选择输出账号")
      return
    }

    const entryMap = new Map<string, Map<string, BlueLinkEntry>>()
    blueLinkEntries.forEach((entry) => {
      if (!entry.account_id || !entry.product_id) return
      if (!entryMap.has(entry.account_id)) {
        entryMap.set(entry.account_id, new Map())
      }
      entryMap.get(entry.account_id)?.set(entry.product_id, entry)
    })

    const activeAccounts = blueLinkAccounts.filter((account) => selectedAccountIds.has(account.id))
    const missingSummary: string[] = []
    const groups: BlueLinkGroup[] = []
    const multiAccount = activeAccounts.length > 1

    activeAccounts.forEach((account) => {
      const map = entryMap.get(account.id) || new Map()
      const grouped = ranges.map((range) => ({
        label: formatRangeLabel(range),
        lines: [] as string[],
      }))
      const missingLinks: string[] = []

      items.forEach((item) => {
        const sourceId = item.source_id || item.id
        const latestItem = sourceItems.find((source) => source.id === sourceId) || item
        const price = Number(latestItem.price)
        const entry = map.get(sourceId)
        const link = entry?.source_link || ""
        if (!link) {
          missingLinks.push(item.title || "未命名商品")
          return
        }
        const rangeIndex = ranges.findIndex((range) => {
          const minOk = range.min === null || (Number.isFinite(price) && price >= (range.min ?? 0))
          const maxOk = range.max === null || (Number.isFinite(price) && price <= (range.max ?? 0))
          return minOk && maxOk
        })
        if (rangeIndex === -1) return
        const priceText = formatNumber(latestItem.price)
        grouped[rangeIndex].lines.push(`${link},${priceText}`)
      })

      grouped
        .filter((group) => group.lines.length)
        .forEach((group) => {
          const label = multiAccount ? `${account.name} · ${group.label}` : `价格区间：${group.label}`
          groups.push({ label, lines: group.lines })
        })

      if (missingLinks.length) {
        missingSummary.push(`${account.name}：${missingLinks.join("、")}`)
      }
    })

    setBlueLinkGroups(groups)
    setBlueLinkMissing(missingSummary.length ? `以下商品缺少蓝链：${missingSummary.join("；")}` : "")
  }

  const loadImageTemplates = async () => {
    try {
      const raw = localStorage.getItem(IMAGE_TEMPLATE_CACHE_KEY)
      if (raw) {
        const cache = JSON.parse(raw) as { timestamp: number; templates: ImageTemplate[] }
        if (cache?.timestamp && Date.now() - cache.timestamp < CACHE_TTL) {
          const templates = Array.isArray(cache.templates) ? cache.templates : []
          setImageTemplates(templates)
          const categories = Array.from(new Set(templates.map((item) => item.category || "默认模板")))
          setTemplateCategories(categories)
          setActiveTemplateCategory(categories[0] || "默认模板")
        }
      }
    } catch {
      // ignore
    }
    try {
      const data = await apiRequest<{ templates: ImageTemplate[] }>("/api/image/templates")
      const templates = Array.isArray(data.templates) ? data.templates : []
      setImageTemplates(templates)
      const categories = Array.from(new Set(templates.map((item) => item.category || "默认模板")))
      setTemplateCategories(categories)
      setActiveTemplateCategory(categories[0] || "默认模板")
      try {
        localStorage.setItem(
          IMAGE_TEMPLATE_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), templates })
        )
      } catch {
        // ignore
      }
    } catch {
      setImageTemplates([])
      setTemplateCategories([])
    }
  }

  useEffect(() => {
    if (!templateCategories.length) return
    const list = imageTemplates.filter(
      (item) => (item.category || "默认模板") === activeTemplateCategory
    )
    if (!list.length) {
      setActiveTemplateId("")
      return
    }
    if (!list.find((item) => item.id === activeTemplateId)) {
      setActiveTemplateId(list[0].id)
    }
  }, [templateCategories, imageTemplates, activeTemplateCategory, activeTemplateId])

  const getTemplateFieldIds = (html: string) => {
    if (!html) return []
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const ids = new Set<string>()
    doc.querySelectorAll("[id]").forEach((el) => {
      const id = el.getAttribute("id")
      if (id) ids.add(id)
    })
    doc.querySelectorAll("[data-field]").forEach((el) => {
      const key = el.getAttribute("data-field")
      if (key) ids.add(key)
    })
    doc.querySelectorAll("[data-param-key]").forEach((el) => {
      const key = el.getAttribute("data-param-key")
      if (key) ids.add(key)
    })
    return Array.from(ids)
  }

  const getTemplateParamSlotCount = (html: string) => {
    if (!html) return 0
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    return doc.querySelectorAll(".tpl-param").length
  }

  const buildTemplateParamSlots = (item: SchemeItem, templateHtml: string, slotCount: number) => {
    const params = stripMetaSpec(item.spec || {})
    const totalSlots = slotCount > 0 ? slotCount : getTemplateParamSlotCount(templateHtml)
    const paramOrder = presetFields.length
      ? totalSlots
        ? presetFields.slice(0, totalSlots)
        : presetFields.slice()
      : totalSlots
        ? Object.keys(params).slice(0, totalSlots)
        : Object.keys(params)
    const slotTotal = totalSlots || paramOrder.length
    const slots = [] as Array<{ label: string; value: string }>
    for (let i = 0; i < slotTotal; i += 1) {
      const key = paramOrder[i] || ""
      const value = key ? (params[key] ?? "") : ""
      slots.push({ label: key, value: String(value ?? "") })
    }
    return { slots, paramOrder }
  }

  const getItemFieldMap = (item: SchemeItem): Record<string, string> => {
    const meta = getMeta(item.spec)
    const params = stripMetaSpec(item.spec || {})
    const priceText = formatCurrencyText(item.price)
    const commissionText = formatCurrencyText(item.commission)
    const cover = getDisplayCover(item)
    const remark = item.remark || ""
    return {
      title: item.title || "",
      cover,
      price: priceText === "--" ? "" : priceText,
      commission: commissionText === "--" ? "" : commissionText,
      commission_rate: formatRate(item.commission_rate),
      sales_30: meta.sales30 ?? "",
      comments: meta.comments ?? "",
      shop_name: meta.shopName || "",
      promo_link: meta.promoLink || "",
      source_link: meta.sourceLink || "",
      blue_link: meta.blueLink || "",
      remark,
      summary: remark,
      ["总结"]: remark,
      ...params,
    } as Record<string, string>
  }

  const computeTemplateMissingText = () => {
    const template = imageTemplates.find((item) => item.id === activeTemplateId)
    if (!template?.html) return "缺失字段：暂无模板"

    const slotCount = getTemplateParamSlotCount(template.html)
    if (slotCount > 0 && presetFields.length) {
      const usedFields = presetFields.slice(0, slotCount)
      const missingCounts = new Map<string, number>()
      items.forEach((item) => {
        const params = stripMetaSpec(item.spec || {})
        usedFields.forEach((field) => {
          const value = params[field]
          if (!String(value ?? "").trim()) {
            missingCounts.set(field, (missingCounts.get(field) || 0) + 1)
          }
        })
      })
      if (!missingCounts.size) return "缺失字段：无缺失"
      const list = Array.from(missingCounts.entries())
        .map(([key, count]) => `${key}(${count})`)
        .join("、")
      return `缺失字段：${list}`
    }

    if (slotCount > 0 && !presetFields.length) {
      return "缺失字段：未设置预设参数"
    }

    const fieldIds = getTemplateFieldIds(template.html)
    if (!fieldIds.length) {
      return "缺失字段：模板未声明需要的字段"
    }
    const missingCounts = new Map<string, number>()
    items.forEach((item) => {
      const map = getItemFieldMap(item)
      fieldIds.forEach((id) => {
        const value = map[id]
        if (value === undefined || value === null || value === "") {
          missingCounts.set(id, (missingCounts.get(id) || 0) + 1)
        }
      })
    })
    if (!missingCounts.size) return "缺失字段：无缺失"
    const list = Array.from(missingCounts.entries())
      .map(([key, count]) => `${key}(${count})`)
      .join("、")
    return `缺失字段：${list}`
  }

  const applyTemplateFields = (
    root: HTMLElement,
    dataMap: Record<string, string>,
    paramSlots: Array<{ label: string; value: string }>
  ) => {
    const applyValue = (el: HTMLElement | null, value: string, emptyText = "--") => {
      if (!el) return
      if (el.tagName === "IMG") {
        if (value) el.setAttribute("src", value)
        return
      }
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        ;(el as HTMLInputElement).value = value || emptyText
        return
      }
      el.textContent = value || emptyText
    }

    root.querySelectorAll(".tpl-title").forEach((el) => applyValue(el as HTMLElement, dataMap.title))
    root.querySelectorAll(".tpl-price").forEach((el) => applyValue(el as HTMLElement, dataMap.price))
    root.querySelectorAll(".tpl-cover").forEach((el) => applyValue(el as HTMLElement, dataMap.cover))
    root.querySelectorAll(".tpl-param").forEach((el, index) => {
      const slot = paramSlots[index] || { label: "", value: "" }
      applyValue((el as HTMLElement).querySelector(".tpl-param-label"), slot.label, "")
      applyValue((el as HTMLElement).querySelector(".tpl-param-value"), slot.value, "")
    })

    root.querySelectorAll("[data-field]").forEach((el) => {
      const key = (el as HTMLElement).getAttribute("data-field")
      if (!key) return
      applyValue(el as HTMLElement, dataMap[key])
    })

    root.querySelectorAll("[data-param-key]").forEach((el) => {
      const key = (el as HTMLElement).getAttribute("data-param-key")
      if (!key) return
      applyValue(el as HTMLElement, dataMap[key])
    })

    root.querySelectorAll("[id]").forEach((el) => {
      const key = (el as HTMLElement).getAttribute("id")
      if (!key) return
      applyValue(el as HTMLElement, dataMap[key])
    })
  }

  const refreshTemplateMissing = () => {
    const message = computeTemplateMissingText()
    setTemplateMissing(message)
  }

  const generateImages = async () => {
    const template = imageTemplates.find((item) => item.id === activeTemplateId)
    if (!template?.html) {
      setImageStatus({ message: "请先选择模板", type: "error" })
      return
    }
    if (!items.length) {
      setImageStatus({ message: "暂无选品可生成", type: "error" })
      return
    }
    if (!imageRenderRef.current) {
      setImageStatus({ message: "图片渲染容器缺失", type: "error" })
      return
    }
    setImageStatus({ message: "正在生成图片...", type: "info" })
    refreshTemplateMissing()

    const zip = new JSZip()
    const parser = new DOMParser()
    const doc = parser.parseFromString(template.html, "text/html")
    const headStyles = Array.from(doc.querySelectorAll("style")).map((style) => style.outerHTML).join("")
    const bodyHtml = doc.body?.innerHTML || template.html
    const paramSlotCount = getTemplateParamSlotCount(template.html)

    let successCount = 0
    let failedCount = 0
    let index = 1

    try {
      for (const item of items) {
        const renderRoot = imageRenderRef.current
        renderRoot.innerHTML = ""
        const wrapper = document.createElement("div")
        wrapper.className = "template-render"
        wrapper.innerHTML = `${headStyles}${bodyHtml}`
        renderRoot.appendChild(wrapper)

        const { slots } = buildTemplateParamSlots(item, template.html, paramSlotCount)
        applyTemplateFields(wrapper, getItemFieldMap(item), slots)

        const rect = wrapper.getBoundingClientRect()
        if (!rect.width || !rect.height) {
          failedCount += 1
          index += 1
          continue
        }

        const canvas = await html2canvas(wrapper, {
          useCORS: true,
          backgroundColor: null,
          scale: 2,
        })
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1))
        if (blob) {
          const name = sanitizeFilename(item.title || `商品_${index}`)
          zip.file(`${name}.png`, blob)
          successCount += 1
        } else {
          failedCount += 1
        }
        index += 1
      }

      if (!successCount) {
        setImageStatus({ message: "生成失败：未生成任何图片", type: "error" })
        return
      }

      const output = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(output)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `方案商品图_${Date.now()}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      const message = failedCount
        ? `图片已生成并开始下载（成功 ${successCount} 张，失败 ${failedCount} 张）`
        : "图片已生成并开始下载"
      setImageStatus({ message, type: "success" })
    } catch {
      setImageStatus({ message: "生成失败，请重试", type: "error" })
    }
  }

  const buildExportProduct = (item: SchemeItem) => {
    const meta = getMeta(item.spec)
    const specParams = stripMetaSpec(item.spec || {})
    return {
      id: item.uid || item.id,
      skuId: item.uid || "",
      name: item.title || "",
      price: item.price ?? "",
      commission: item.commission ?? "",
      commissionRate: item.commission_rate ?? "",
      sales30Days: meta.sales30 ?? "",
      comments: meta.comments ?? "",
      shopName: meta.shopName || "",
      standardUrl: item.link || meta.promoLink || "",
      materialUrl: meta.promoLink || "",
      originalLink: meta.sourceLink || "",
      image: getDisplayCover(item),
      specSummary: buildSpecDetailText(specParams, " / ", 3),
      specParams,
    }
  }

  const exportExcel = () => {
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
      const getProductId = (product: ReturnType<typeof buildExportProduct>) => {
        const link = product.standardUrl || product.materialUrl || product.originalLink || ""
        const linkId = extractDigitsFromLink(link)
        if (linkId) return linkId
        return product.skuId || product.id || ""
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
        const product = buildExportProduct(item)
        return [
          "",
          product.skuId || product.id || "",
          getProductId(product),
          product.name || "",
          formatPrice(product.price),
          formatPrice(product.commission),
          formatPercent(product.commissionRate),
          product.sales30Days || "",
          product.shopName || "",
          product.standardUrl || product.materialUrl || product.originalLink || "",
          product.comments || "",
          product.specSummary || "",
          buildSpecDetailText(product.specParams, "\n"),
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

      const now = new Date()
      const timestamp =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        "_" +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0")
      const filename = `带货商品_${timestamp}.xlsx`
      XLSX.writeFile(workbook, filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败"
      showToast(message, "error")
    }
  }

  const downloadImages = async () => {
    if (!filteredItems.length) {
      showToast("没有可下载的主图", "info")
      return
    }
    const zip = new JSZip()
    let successCount = 0
    let failCount = 0
    for (const item of filteredItems) {
      const url = getDisplayCover(item)
      if (!url) {
        failCount += 1
        continue
      }
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error("download failed")
        const blob = await response.blob()
        const safeName = String(item.title || item.id || "cover")
          .slice(0, 15)
          .replace(/[\\/:*?"<>|]/g, "")
        const fileName = safeName ? `${safeName}.jpg` : `cover_${Date.now()}.jpg`
        zip.file(fileName, blob)
        successCount += 1
      } catch {
        failCount += 1
      }
    }
    if (!successCount) {
      showToast("主图下载失败，请重试", "error")
      return
    }
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `方案主图_${Date.now()}.zip`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    const message = failCount
      ? `下载完成，成功 ${successCount} 张，失败 ${failCount} 张`
      : `主图已打包下载，共 ${successCount} 张`
    showToast(message, "success")
  }

  const serializeProductForFeishu = (product: ReturnType<typeof buildExportProduct>) => ({
    id: product.id,
    skuId: product.skuId,
    itemId: product.id,
    name: product.name,
    customName: "",
    price: product.price,
    commission: product.commission,
    commissionRate: product.commissionRate,
    sales30Days: product.sales30Days,
    comments: product.comments,
    shopName: product.shopName,
    standardUrl: product.standardUrl,
    materialUrl: product.materialUrl,
    originalLink: product.originalLink,
    image: product.image,
    specSummary: product.specSummary || "",
    specParams: product.specParams || {},
    sortOrder: "",
    sourceVideo: null,
  })

  const submitFeishuExport = async () => {
    if (feishuSubmitting) {
      showToast("正在写入飞书，请稍候", "info")
      return
    }
    if (!feishuProductLink.trim()) {
      showToast("请填写商品表链接", "error")
      return
    }
    if (feishuSpecEnabled && !feishuSpecLink.trim()) {
      showToast("请填写参数表链接或关闭同步参数表", "error")
      return
    }
    if (!filteredItems.length) {
      showToast("没有可写入的商品", "error")
      return
    }
    const products = filteredItems.map(buildExportProduct)
    setFeishuSubmitting(true)
    try {
      await apiRequest("/api/feishu/bitable/export", {
        method: "POST",
        body: JSON.stringify({
          productLink: feishuProductLink.trim(),
          productMode: feishuProductMode,
          syncSpec: feishuSpecEnabled,
          specLink: feishuSpecLink.trim(),
          specMode: feishuSpecMode,
          products: products.map(serializeProductForFeishu),
        }),
      })
      setFeishuOpen(false)
      showToast("已写入飞书表格", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "写入飞书失败"
      showToast(message, "error")
    } finally {
      setFeishuSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm text-slate-500">加载中...</p>
      </div>
    )
  }

  if (!scheme) {
    return <Empty title="未找到方案" description="请返回方案列表重新选择" actionLabel="返回" onAction={onBack} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">方案：{scheme.name}</span>
          <span>分类：{scheme.category_name ?? "--"}</span>
          <span>选品数量：{items.length}</span>
          <span>创建时间：{formatDate(scheme.created_at)}</span>
        </div>
        <Button variant="outline" onClick={onBack}>
          返回方案列表
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <Field orientation="horizontal" className="items-center gap-2">
                  <FieldLabel className="w-12">价格</FieldLabel>
                  <FieldContent className="flex items-center gap-2">
                    <Input
                      className="w-20"
                      value={priceMin}
                      onChange={(event) => setPriceMin(event.target.value)}
                      placeholder="低"
                    />
                    <span className="text-slate-400">-</span>
                    <Input
                      className="w-20"
                      value={priceMax}
                      onChange={(event) => setPriceMax(event.target.value)}
                      placeholder="高"
                    />
                  </FieldContent>
                </Field>
                <Select value={sortValue} onValueChange={setSortValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="排序方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动排序</SelectItem>
                    <SelectItem value="price-asc">价格从低到高</SelectItem>
                    <SelectItem value="price-desc">价格从高到低</SelectItem>
                    <SelectItem value="commission-desc">佣金比例从高到低</SelectItem>
                    <SelectItem value="sales-desc">30天销量从高到低</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPriceMin("")
                    setPriceMax("")
                  }}
                >
                  重置筛选
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleClearFiltered}>
                  清空筛选
                </Button>
                <Button variant="outline" onClick={() => persistItems([], "已清空商品")}>清空商品</Button>
                <Button onClick={openPicker}>新增选品</Button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">已选商品</h3>
              <span className="text-xs text-slate-500">共 {filteredItems.length} 件</span>
            </div>
            {filteredItems.length === 0 ? (
              <Empty title="暂无选品" description="点击新增选品添加商品" actionLabel="新增选品" onAction={openPicker} />
            ) : (
              <div className="mt-4 space-y-4">
                {filteredItems.map((item) => {
                  const meta = getMeta(item.spec)
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(item.id)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <img
                            src={getDisplayCover(item)}
                            alt={item.title || ""}
                            className="h-24 w-24 rounded-xl object-cover"
                          />
                          <div className="space-y-2">
                            <h4 className="text-base font-semibold text-slate-900">
                              {item.title || "未命名商品"}
                            </h4>
                            <div className="text-xs text-slate-500">店铺：{meta.shopName || "--"}</div>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                              <span>30天销量：{meta.sales30 || "--"}</span>
                              <span>评价数：{meta.comments || "--"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => removeItem(item.id)}>
                            删除
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">价格</p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {formatNumber(item.price)} 元
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">佣金</p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {formatNumber(item.commission)} 元
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">佣金比例</p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {item.commission_rate ?? "--"}%
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">总结：{item.remark || ""}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="text-base font-semibold text-slate-900">文案生成</h3>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">标题</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openPromptEditor("title")}>编辑提示词</Button>
                    <Button variant="outline" size="sm" onClick={() => copyText(titleOutput, "标题已复制")}>复制</Button>
                    <Button size="sm" onClick={() => generateText("title", setTitleOutput)}>生成</Button>
                  </div>
                </div>
                <Textarea rows={4} value={titleOutput} onChange={(event) => setTitleOutput(event.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">简介</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openPromptEditor("intro")}>编辑提示词</Button>
                    <Button variant="outline" size="sm" onClick={() => copyText(introOutput, "简介已复制")}>复制</Button>
                    <Button size="sm" onClick={() => generateText("intro", setIntroOutput)}>生成</Button>
                  </div>
                </div>
                <Textarea rows={4} value={introOutput} onChange={(event) => setIntroOutput(event.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">投票文案</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openPromptEditor("vote")}>编辑提示词</Button>
                    <Button variant="outline" size="sm" onClick={() => copyText(voteOutput, "投票文案已复制")}>复制</Button>
                    <Button size="sm" onClick={() => generateText("vote", setVoteOutput)}>生成</Button>
                  </div>
                </div>
                <Textarea rows={4} value={voteOutput} onChange={(event) => setVoteOutput(event.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="text-base font-semibold text-slate-900">评论回复生成</h3>
            <div className="mt-4 space-y-3">
              <Field orientation="horizontal" className="items-center gap-2">
                <FieldLabel className="w-16">回复数量</FieldLabel>
                <FieldContent className="flex items-center gap-2">
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    max={20}
                    value={commentReplyCount}
                    onChange={(event) => setCommentReplyCount(Number(event.target.value))}
                  />
                  <Button variant="ghost" size="sm" onClick={() => openPromptEditor("comment_reply")}>编辑提示词</Button>
                </FieldContent>
              </Field>
              <Textarea
                rows={3}
                placeholder="补充要求（可选）"
                value={commentReplyPrompt}
                onChange={(event) => setCommentReplyPrompt(event.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyText(commentReplyOutput, "评论回复已复制")}>复制</Button>
                <Button size="sm" onClick={generateCommentReply}>生成</Button>
              </div>
              <Textarea rows={5} value={commentReplyOutput} onChange={(event) => setCommentReplyOutput(event.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="text-base font-semibold text-slate-900">蓝链生成</h3>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-slate-500">选择账号</p>
                {blueLinkAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400">暂无账号</p>
                ) : (
                  <div className="space-y-2">
                    {blueLinkAccounts.map((account) => (
                      <label key={account.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <Checkbox
                          checked={selectedAccountIds.has(account.id)}
                          onCheckedChange={(value) => {
                            const next = new Set(selectedAccountIds)
                            if (value) {
                              next.add(account.id)
                            } else {
                              next.delete(account.id)
                            }
                            setSelectedAccountIds(next)
                            persistBlueLinkAccountSelection(next)
                          }}
                        />
                        <span>{account.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500">价格区间</p>
                <div className="space-y-2">
                  {blueRanges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        placeholder="最低"
                        value={range.min ?? ""}
                        onChange={(event) => {
                          const value = event.target.value.trim()
                          setBlueRanges((prev) =>
                            prev.map((item, idx) =>
                              idx === index ? { ...item, min: value === "" ? null : Number(value) } : item
                            )
                          )
                        }}
                      />
                      <span className="text-slate-400">-</span>
                      <Input
                        type="number"
                        className="w-20"
                        placeholder="最高"
                        value={range.max ?? ""}
                        onChange={(event) => {
                          const value = event.target.value.trim()
                          setBlueRanges((prev) =>
                            prev.map((item, idx) =>
                              idx === index ? { ...item, max: value === "" ? null : Number(value) } : item
                            )
                          )
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBlueRanges((prev) => prev.filter((_, idx) => idx !== index))}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => setBlueRanges((prev) => [...prev, { min: null, max: null }])}>
                  添加区间
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(blueLinkGroups.map((group) => group.lines.join("\n")).join("\n\n"), "蓝链已复制")}
                >
                  复制全部
                </Button>
                <Button size="sm" onClick={generateBlueLinks}>生成蓝链</Button>
              </div>
              {blueLinkMissing ? <p className="text-xs text-rose-500">{blueLinkMissing}</p> : null}
              <div className="space-y-2">
                {blueLinkGroups.length === 0 ? (
                  <p className="text-xs text-slate-400">暂无蓝链可生成</p>
                ) : (
                  blueLinkGroups.map((group, index) => (
                    <div key={`${group.label}-${index}`} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{group.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyText(group.lines.join("\n"), "蓝链已复制")}
                        >
                          复制
                        </Button>
                      </div>
                      <div className="mt-2 whitespace-pre-line">{group.lines.join("\n")}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="text-base font-semibold text-slate-900">图片生成</h3>
            <div className="mt-4 space-y-3">
              <Select value={activeTemplateCategory} onValueChange={(value) => setActiveTemplateCategory(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模板分类" />
                </SelectTrigger>
                <SelectContent>
                  {templateCategories.length === 0 ? (
                    <SelectItem value="">暂无模板</SelectItem>
                  ) : (
                    templateCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={activeTemplateId} onValueChange={(value) => setActiveTemplateId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模板" />
                </SelectTrigger>
                <SelectContent>
                  {imageTemplates
                    .filter((item) => (item.category || "默认模板") === activeTemplateCategory)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name || "未命名模板"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="text-xs text-slate-500">{templateMissing || "缺失字段：暂无"}</div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshTemplateMissing}>
                  检查缺失
                </Button>
                <Button size="sm" onClick={generateImages}>
                  生成图片
                </Button>
              </div>
              {imageStatus ? (
                <p className={`text-xs ${imageStatus.type === "error" ? "text-rose-500" : imageStatus.type === "success" ? "text-emerald-600" : "text-slate-500"}`}>
                  {imageStatus.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="text-base font-semibold text-slate-900">导出与同步</h3>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" onClick={exportExcel}>导出表格</Button>
              <Button variant="outline" onClick={downloadImages}>下载主图</Button>
              <Button onClick={() => setFeishuOpen(true)}>写入飞书表格</Button>
            </div>
          </div>
        </aside>
      </div>

      <div ref={imageRenderRef} className="fixed left-[-9999px] top-[-9999px]" />
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>添加选品</DialogTitle>
            <DialogDescription>从当前分类中选择商品加入方案。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="flex-1"
                placeholder="输入商品名称搜索"
                value={pickerKeyword}
                onChange={(event) => {
                  setPickerKeyword(event.target.value)
                  setPickerOffset(0)
                  void loadPickerItems(true)
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const ids = pickerItems.map((item) => item.id)
                  setPickerSelected(new Set(ids))
                }}
              >
                全选
              </Button>
              <Button variant="outline" onClick={() => setPickerSelected(new Set())}>
                清空
              </Button>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
              {pickerItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {pickerLoading ? "加载中..." : "暂无选品"}
                </div>
              ) : (
                pickerItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.title || "未命名商品"}
                      </p>
                      <p className="text-xs text-slate-500">价格：{formatNumber(item.price)} 元</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={pickerSelected.has(item.id)}
                      onChange={(event) => {
                        setPickerSelected((prev) => {
                          const next = new Set(prev)
                          if (event.target.checked) {
                            next.add(item.id)
                          } else {
                            next.delete(item.id)
                          }
                          return next
                        })
                      }}
                    />
                  </label>
                ))
              )}
              {pickerHasMore ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => loadPickerItems(false)}
                  disabled={pickerLoading}
                >
                  {pickerLoading ? "加载中..." : "加载更多"}
                </Button>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              取消
            </Button>
            <Button onClick={addSelectedItems}>加入方案</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promptEditOpen} onOpenChange={setPromptEditOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>修改提示词</DialogTitle>
            <DialogDescription>可根据需求调整生成提示词。</DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={promptEditValue} onChange={(event) => setPromptEditValue(event.target.value)} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPromptEditOpen(false)}>
              取消
            </Button>
            <Button onClick={savePromptTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feishuOpen} onOpenChange={setFeishuOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>写入飞书表格</DialogTitle>
            <DialogDescription>将当前筛选结果写入飞书多维表格。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24">商品表链接</FieldLabel>
              <FieldContent>
                <Input value={feishuProductLink} onChange={(event) => setFeishuProductLink(event.target.value)} />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24">写入方式</FieldLabel>
              <FieldContent>
                <Select value={feishuProductMode} onValueChange={setFeishuProductMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择写入方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">追加</SelectItem>
                    <SelectItem value="replace">覆盖</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox checked={feishuSpecEnabled} onCheckedChange={(value) => setFeishuSpecEnabled(Boolean(value))} />
              <span>同步参数表</span>
            </div>
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24">参数表链接</FieldLabel>
              <FieldContent>
                <Input
                  value={feishuSpecLink}
                  onChange={(event) => setFeishuSpecLink(event.target.value)}
                  disabled={!feishuSpecEnabled}
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24">参数写入</FieldLabel>
              <FieldContent>
                <Select value={feishuSpecMode} onValueChange={setFeishuSpecMode} disabled={!feishuSpecEnabled}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择写入方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">追加</SelectItem>
                    <SelectItem value="replace">覆盖</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeishuOpen(false)}>
              取消
            </Button>
            <Button onClick={submitFeishuExport} disabled={feishuSubmitting}>
              {feishuSubmitting ? "写入中..." : "开始写入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
