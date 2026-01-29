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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import Empty from "@/components/Empty"

interface BlueLinkAccount {
  id: string
  name: string
}

interface BlueLinkCategory {
  id: string
  name: string
  account_id?: string
}

interface BlueLinkEntry {
  id: string
  source_link?: string
  product_id?: string | null
  product_title?: string
  product_cover?: string
  product_price?: number
  account_id?: string
  category_id?: string
  created_at?: string
  updated_at?: string
}

interface SourcingItem {
  id: string
  title?: string
  price?: number
  cover_url?: string
  link?: string
  updated_at?: string
  created_at?: string
  category_id?: string
  spec?: Record<string, string>
}

const ALL_ACCOUNTS_ID = "__all__"
const BLUE_LINK_MAP_CACHE_KEY = "blue_link_map_cache_v1"
const SOURCING_ITEMS_CACHE_KEY = "sourcing_items_cache_v1"
const BLUE_LINK_CACHE_TTL = 5 * 60 * 1000

const META_SPEC_KEYS = {
  promoLink: "_promo_link",
  sourceLink: "_source_link",
} as const

type ProgressFailure = { link: string; name: string; reason: string }

function getJsonCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isCacheFresh(cache: { timestamp?: number } | null, ttl: number) {
  if (!cache?.timestamp) return false
  return Date.now() - cache.timestamp < ttl
}

function extractMetaSpec(spec?: Record<string, string>) {
  if (!spec || typeof spec !== "object") {
    return { promoLink: "", sourceLink: "" }
  }
  return {
    promoLink: spec[META_SPEC_KEYS.promoLink] || "",
    sourceLink: spec[META_SPEC_KEYS.sourceLink] || "",
  }
}

function extractSkuFromUrl(url: string) {
  if (!url) return ""
  const itemMatch = url.match(/item\.jd\.com\/(\d+)\.html/i)
  if (itemMatch) return itemMatch[1]
  const skuParam = url.match(/[?&](?:skuId|sku|productId|wareId|id)=(\d{6,})/i)
  if (skuParam) return skuParam[1]
  const skuPath = url.match(/sku\/(\d{6,})/i)
  if (skuPath) return skuPath[1]
  return ""
}

function pickSkuFromUrl(url: string) {
  if (!url) return { sku: "", multiple: false }
  const candidates: string[] = []
  const pushAll = (regex: RegExp) => {
    let match = regex.exec(url)
    while (match) {
      candidates.push(match[1])
      match = regex.exec(url)
    }
  }
  const itemMatch = url.match(/item\.jd\.com\/(\d+)\.html/i)
  if (itemMatch) candidates.push(itemMatch[1])
  pushAll(/[?&](?:skuId|sku|productId|wareId|id)=(\d{6,})/gi)
  pushAll(/sku\/(\d{6,})/gi)
  const unique = Array.from(new Set(candidates)).filter(Boolean)
  if (unique.length > 1) return { sku: unique[0], multiple: true }
  if (unique.length === 1) return { sku: unique[0], multiple: false }
  return { sku: "", multiple: false }
}

async function resolveJdUrl(url: string) {
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

async function resolveSkuFromLink(link: string) {
  if (!link) return { sku: "", reason: "蓝链为空", resolvedUrl: "" }
  let resolvedUrl = link
  resolvedUrl = await resolveJdUrl(link)
  const resolved = pickSkuFromUrl(resolvedUrl)
  if (resolved.multiple) {
    return { sku: "", reason: "解析到多个SKU", resolvedUrl }
  }
  if (resolved.sku) {
    return { sku: resolved.sku, reason: "", resolvedUrl }
  }
  const fallback = pickSkuFromUrl(link)
  if (fallback.multiple) {
    return { sku: "", reason: "解析到多个SKU", resolvedUrl }
  }
  return { sku: fallback.sku || "", reason: fallback.sku ? "" : "未解析到SKU", resolvedUrl }
}

function getItemTimestamp(item: SourcingItem) {
  const value = item?.updated_at || item?.created_at || ""
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

export default function BlueLinkMapPage() {
  const { showToast } = useToast()
  const [accounts, setAccounts] = useState<BlueLinkAccount[]>([])
  const [categories, setCategories] = useState<BlueLinkCategory[]>([])
  const [entries, setEntries] = useState<BlueLinkEntry[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [visibleEntries, setVisibleEntries] = useState<BlueLinkEntry[]>([])
  const chunkTimerRef = useRef<number | null>(null)

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [accountNameInput, setAccountNameInput] = useState("")
  const [categoryNameInput, setCategoryNameInput] = useState("")
  const [categoryError, setCategoryError] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<BlueLinkEntry | null>(null)
  const [editLink, setEditLink] = useState("")

  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [importCancel, setImportCancel] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerKeyword, setPickerKeyword] = useState("")
  const [pickerItems, setPickerItems] = useState<SourcingItem[]>([])
  const [pickerOffset, setPickerOffset] = useState(0)
  const [pickerHasMore, setPickerHasMore] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerEntry, setPickerEntry] = useState<BlueLinkEntry | null>(null)

  const [progressOpen, setProgressOpen] = useState(false)
  const [progressLabel, setProgressLabel] = useState("映射")
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressProcessed, setProgressProcessed] = useState(0)
  const [progressSuccess, setProgressSuccess] = useState(0)
  const [progressFailures, setProgressFailures] = useState<ProgressFailure[]>([])
  const [progressCancelled, setProgressCancelled] = useState(false)
  const [progressRunning, setProgressRunning] = useState(false)

  const itemsAllRef = useRef<SourcingItem[]>([])
  const itemsByIdRef = useRef<Map<string, SourcingItem>>(new Map())
  const skuIndexAllRef = useRef<Map<string, SourcingItem>>(new Map())
  const itemsAllLoadedRef = useRef(false)

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const accountMatch =
        !activeAccountId ||
        activeAccountId === ALL_ACCOUNTS_ID ||
        entry.account_id === activeAccountId
      const categoryMatch = !activeCategoryId || entry.category_id === activeCategoryId
      if (!accountMatch || !categoryMatch) return false
      if (!searchValue.trim()) return true
      const keyword = searchValue.trim()
      return entry.product_title?.includes(keyword) || entry.source_link?.includes(keyword)
    })
  }, [entries, activeAccountId, activeCategoryId, searchValue])

  useEffect(() => {
    if (chunkTimerRef.current) {
      window.clearTimeout(chunkTimerRef.current)
      chunkTimerRef.current = null
    }
    if (!filteredEntries.length) {
      setVisibleEntries([])
      return
    }
    let index = 0
    const next = () => {
      index += 50
      setVisibleEntries(filteredEntries.slice(0, index))
      if (index < filteredEntries.length) {
        chunkTimerRef.current = window.setTimeout(next, 16)
      }
    }
    setVisibleEntries(filteredEntries.slice(0, 50))
    if (filteredEntries.length > 50) {
      chunkTimerRef.current = window.setTimeout(next, 16)
    }
  }, [filteredEntries])

  useEffect(() => {
    const cache = getJsonCache<{
      timestamp: number
      accounts: BlueLinkAccount[]
      categories: BlueLinkCategory[]
      entries: BlueLinkEntry[]
      activeAccountId?: string | null
      activeCategoryId?: string | null
    }>(BLUE_LINK_MAP_CACHE_KEY)

    const hasCache = isCacheFresh(cache, BLUE_LINK_CACHE_TTL) && Boolean(cache)
    if (hasCache && cache) {
      setAccounts(Array.isArray(cache.accounts) ? cache.accounts : [])
      setCategories(Array.isArray(cache.categories) ? cache.categories : [])
      setEntries(Array.isArray(cache.entries) ? cache.entries : [])
      setActiveAccountId(cache.activeAccountId || cache.accounts?.[0]?.id || null)
      setActiveCategoryId(cache.activeCategoryId || null)
      setLoading(false)
      setListLoading(false)
    }

    const load = async () => {
      if (!hasCache) {
        setLoading(true)
      }
      setListLoading(true)
      try {
        const data = await apiRequest<{
          accounts: BlueLinkAccount[]
          categories: BlueLinkCategory[]
          entries: BlueLinkEntry[]
        }>("/api/blue-link-map/state")
        const accountList = Array.isArray(data.accounts) ? data.accounts : []
        setAccounts(accountList)
        setCategories(Array.isArray(data.categories) ? data.categories : [])
        setEntries(Array.isArray(data.entries) ? data.entries : [])
        setActiveAccountId((prev) => prev || accountList[0]?.id || null)
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载蓝链失败"
        showToast(message, "error")
      } finally {
        setLoading(false)
        setListLoading(false)
      }
    }

    load().catch(() => {})
  }, [showToast])

  useEffect(() => {
    if (!activeAccountId || activeAccountId === ALL_ACCOUNTS_ID) {
      setActiveCategoryId(null)
      return
    }
    const cacheKey = `blue_link_map_category_${activeAccountId}`
    const cachedCategory = localStorage.getItem(cacheKey)
    const accountCategories = categories.filter((cat) => cat.account_id === activeAccountId)
    if (cachedCategory && accountCategories.some((cat) => cat.id === cachedCategory)) {
      setActiveCategoryId(cachedCategory)
      return
    }
    setActiveCategoryId(accountCategories[0]?.id || null)
  }, [activeAccountId, categories])

  useEffect(() => {
    if (!activeAccountId || activeAccountId === ALL_ACCOUNTS_ID) return
    if (!activeCategoryId) return
    const cacheKey = `blue_link_map_category_${activeAccountId}`
    localStorage.setItem(cacheKey, activeCategoryId)
  }, [activeAccountId, activeCategoryId])

  useEffect(() => {
    try {
      localStorage.setItem(
        BLUE_LINK_MAP_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          accounts,
          categories,
          entries,
          activeAccountId,
          activeCategoryId,
        })
      )
    } catch {
      // ignore
    }
  }, [accounts, categories, entries, activeAccountId, activeCategoryId])

  const refreshState = async () => {
    try {
      const data = await apiRequest<{
        accounts: BlueLinkAccount[]
        categories: BlueLinkCategory[]
        entries: BlueLinkEntry[]
      }>("/api/blue-link-map/state")
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
      setCategories(Array.isArray(data.categories) ? data.categories : [])
      setEntries(Array.isArray(data.entries) ? data.entries : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "刷新失败"
      showToast(message, "error")
    }
  }

  const handleCopy = async (entry: BlueLinkEntry) => {
    const link = entry.source_link || ""
    if (!link) {
      showToast("蓝链为空", "error")
      return
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = link
        textarea.style.position = "fixed"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      showToast("蓝链已复制", "success")
    } catch {
      showToast("复制失败", "error")
    }
  }

  const openEdit = (entry: BlueLinkEntry) => {
    setEditingEntry(entry)
    setEditLink(entry.source_link || "")
    setEditOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!editingEntry) return
    const link = editLink.trim()
    if (!link) {
      showToast("请输入蓝链", "error")
      return
    }
    try {
      await apiRequest(`/api/blue-link-map/entries/${editingEntry.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ source_link: link, product_id: null, sku_id: null }),
        }
      )
      showToast("蓝链已更新", "success")
      setEditOpen(false)
      await refreshState()
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新失败"
      showToast(message, "error")
    }
  }

  const handleDelete = async (entry: BlueLinkEntry) => {
    try {
      await apiRequest(`/api/blue-link-map/entries/${entry.id}`, {
        method: "DELETE",
      })
      showToast("已删除", "success")
      setEntries((prev) => prev.filter((item) => item.id !== entry.id))
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败"
      showToast(message, "error")
    }
  }

  const handleAccountSubmit = async () => {
    const name = accountNameInput.trim()
    if (!name) {
      showToast("请输入账号名称", "error")
      return
    }
    try {
      await apiRequest("/api/comment/accounts", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      setAccountNameInput("")
      await refreshState()
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存账号失败"
      showToast(message, "error")
    }
  }

  const updateAccountName = async (accountId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast("账号名称不能为空", "error")
      return
    }
    try {
      const data = await apiRequest<{ account: BlueLinkAccount }>(`/api/comment/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      })
      setAccounts((prev) => prev.map((item) => (item.id === accountId ? data.account : item)))
      showToast("账号已更新", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新失败"
      showToast(message, "error")
    }
  }

  const deleteAccount = async (accountId: string) => {
    const confirmed = window.confirm("确认删除该账号吗？该账号的蓝链映射都会被移除。")
    if (!confirmed) return
    try {
      await apiRequest(`/api/comment/accounts/${accountId}`, { method: "DELETE" })
      await refreshState()
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败"
      showToast(message, "error")
    }
  }

  const addCategoryByName = async () => {
    if (!activeAccountId || activeAccountId === ALL_ACCOUNTS_ID) {
      setCategoryError("请先选择账号")
      return
    }
    const trimmed = categoryNameInput.trim()
    if (!trimmed) {
      setCategoryError("请输入分类名称")
      return
    }
    const exists = categories.some((cat) => cat.account_id === activeAccountId && String(cat.name || "").trim() === trimmed)
    if (exists) {
      setCategoryError("分类已存在")
      return
    }
    try {
      const data = await apiRequest<{ category: BlueLinkCategory }>("/api/blue-link-map/categories", {
        method: "POST",
        body: JSON.stringify({ account_id: activeAccountId, name: trimmed }),
      })
      if (data.category) {
        setCategories((prev) => [data.category, ...prev])
      }
      setCategoryNameInput("")
      setCategoryError("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "新增分类失败"
      setCategoryError(message)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    const confirmed = window.confirm("确认删除该分类吗？")
    if (!confirmed) return
    try {
      await apiRequest(`/api/blue-link-map/categories/${categoryId}`, { method: "DELETE" })
      setCategories((prev) => prev.filter((item) => item.id !== categoryId))
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除分类失败"
      showToast(message, "error")
    }
  }

  const loadPickerItems = async (reset = false) => {
    if (pickerLoading) return
    setPickerLoading(true)
    const limit = 50
    const offset = reset ? 0 : pickerOffset
    const params = new URLSearchParams()
    params.set("limit", String(limit))
    params.set("offset", String(offset))
    params.set("fields", "list")
    if (pickerKeyword.trim()) params.set("q", pickerKeyword.trim())
    try {
      const data = await apiRequest<{ items: SourcingItem[]; has_more?: boolean; next_offset?: number }>(
        `/api/sourcing/items?${params.toString()}`
      )
      const list = Array.isArray(data.items) ? data.items : []
      setPickerItems((prev) => (reset ? list : prev.concat(list)))
      setPickerHasMore(Boolean(data.has_more))
      setPickerOffset(data.next_offset ?? offset + list.length)
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载商品失败"
      showToast(message, "error")
    } finally {
      setPickerLoading(false)
    }
  }

  const openProductPicker = (entry: BlueLinkEntry) => {
    setPickerEntry(entry)
    setPickerKeyword("")
    setPickerItems([])
    setPickerOffset(0)
    setPickerHasMore(false)
    setPickerOpen(true)
    void loadPickerItems(true)
  }

  const patchEntryMapping = async (entryId: string, productId: string | null, skuId: string | null) => {
    await apiRequest(`/api/blue-link-map/entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify({ product_id: productId, sku_id: skuId || null }),
    })
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, product_id: productId || null, updated_at: new Date().toISOString() }
          : entry
      )
    )
  }

  const updateEntryProduct = async (entryId: string, productId: string) => {
    const item = itemsByIdRef.current.get(productId)
    const sku = item ? extractSkuFromUrl(item.link || "") : ""
    try {
      await patchEntryMapping(entryId, productId, sku || null)
      showToast("已更新映射", "success")
      setPickerOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新失败"
      showToast(message, "error")
    }
  }

  const showProgressModal = (total: number, label = "映射") => {
    setProgressLabel(label)
    setProgressTotal(total)
    setProgressProcessed(0)
    setProgressSuccess(0)
    setProgressFailures([])
    setProgressCancelled(false)
    setProgressRunning(true)
    setProgressOpen(true)
  }

  const updateProgress = (processed: number, success: number, failures: ProgressFailure[]) => {
    setProgressProcessed(processed)
    setProgressSuccess(success)
    setProgressFailures(failures)
  }

  const finishProgress = (cancelled: boolean) => {
    setProgressRunning(false)
    setProgressCancelled(cancelled)
  }

  const buildSkuIndexAll = (items: SourcingItem[]) => {
    itemsByIdRef.current = new Map()
    skuIndexAllRef.current = new Map()
    items.forEach((item) => {
      if (!item?.id) return
      itemsByIdRef.current.set(item.id, item)
      const meta = extractMetaSpec(item.spec || {})
      const candidates = [item.link, meta.sourceLink, meta.promoLink].filter(Boolean) as string[]
      candidates.forEach((link) => {
        const sku = extractSkuFromUrl(link)
        if (!sku) return
        const existing = skuIndexAllRef.current.get(sku)
        if (!existing || getItemTimestamp(item) >= getItemTimestamp(existing)) {
          skuIndexAllRef.current.set(sku, item)
        }
      })
    })
  }

  const loadAllItemsForMapping = async () => {
    if (itemsAllLoadedRef.current) return
    const allItems: SourcingItem[] = []
    let offset = 0
    let hasMore = true
    const limit = 200

    while (hasMore) {
      const params = new URLSearchParams()
      params.set("limit", String(limit))
      params.set("offset", String(offset))
      params.set("fields", "list")
      const data = await apiRequest<{ items: SourcingItem[]; has_more?: boolean; next_offset?: number }>(
        `/api/sourcing/items?${params.toString()}`
      )
      const items = Array.isArray(data.items) ? data.items : []
      allItems.push(...items)
      hasMore = Boolean(data.has_more)
      offset = data.next_offset ?? offset + items.length
      if (!items.length) {
        break
      }
    }

    itemsAllRef.current = allItems
    buildSkuIndexAll(allItems)
    itemsAllLoadedRef.current = true

    try {
      localStorage.setItem(
        SOURCING_ITEMS_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          items: allItems.slice(0, 200),
          pagination: { limit: 200, offset: allItems.length, hasMore: false },
        })
      )
    } catch {
      // ignore
    }
  }

  const autoMapEntries = async () => {
    if (progressRunning) return
    const targetEntries = filteredEntries.filter((entry) => !entry.product_id)
    if (!targetEntries.length) {
      showToast("当前没有未映射蓝链", "info")
      return
    }
    showProgressModal(targetEntries.length, "映射")
    setImportCancel(false)
    let processed = 0
    let success = 0
    const failures: ProgressFailure[] = []

    try {
      await loadAllItemsForMapping()
      if (!itemsAllRef.current.length) {
        failures.push({ link: "--", name: "未知商品", reason: "选品库为空" })
      }

      for (const entry of targetEntries) {
        if (importCancel) break
        processed += 1
        const link = entry.source_link || ""
        if (!link) {
          failures.push({ link: "--", name: "未知商品", reason: "蓝链为空" })
          updateProgress(processed, success, failures)
          continue
        }
        const { sku, reason } = await resolveSkuFromLink(link)
        if (!sku) {
          failures.push({ link, name: "未知商品", reason: reason || "无法解析SKU" })
          updateProgress(processed, success, failures)
          continue
        }
        const matchedItem = skuIndexAllRef.current.get(sku)
        if (!matchedItem) {
          failures.push({ link, name: "未知商品", reason: "选品库无匹配商品" })
          updateProgress(processed, success, failures)
          continue
        }
        try {
          await patchEntryMapping(entry.id, matchedItem.id, sku)
          success += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : "写入失败"
          failures.push({ link, name: matchedItem.title || "未知商品", reason: message })
        }
        updateProgress(processed, success, failures)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "映射失败"
      failures.push({ link: "--", name: "未知商品", reason: message })
    } finally {
      finishProgress(importCancel)
    }
  }

  const handleImport = async () => {
    if (!activeAccountId || activeAccountId === ALL_ACCOUNTS_ID) {
      showToast("请先选择账号", "error")
      return
    }
    if (!activeCategoryId) {
      showToast("请先选择分类", "error")
      return
    }
    const lines = importText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) {
      showToast("请粘贴蓝链链接", "error")
      return
    }
    if (importing) return
    setImporting(true)
    setImportCancel(false)
    showProgressModal(lines.length, "导入")

    const payloadEntries: Array<{ account_id: string; category_id: string; source_link: string; sku_id?: string | null; product_id?: string | null }> = []
    const failures: ProgressFailure[] = []
    let matchedCount = 0
    let processed = 0

    try {
      await loadAllItemsForMapping()
      for (const link of lines) {
        if (importCancel) break
        processed += 1
        const { sku, reason } = await resolveSkuFromLink(link)
        const item = sku ? skuIndexAllRef.current.get(sku) : null
        if (item) {
          matchedCount += 1
        } else if (reason) {
          failures.push({ link, name: "未知商品", reason })
        }
        payloadEntries.push({
          account_id: activeAccountId,
          category_id: activeCategoryId,
          source_link: link,
          sku_id: sku || null,
          product_id: item?.id || null,
        })
        updateProgress(processed, matchedCount, failures)
      }

      if (payloadEntries.length) {
        await apiRequest("/api/blue-link-map/entries/batch", {
          method: "POST",
          body: JSON.stringify({ entries: payloadEntries }),
        })
        showToast(`导入完成：匹配 ${matchedCount} 条，未匹配 ${lines.length - matchedCount} 条。`, "success")
        setImportOpen(false)
        setImportText("")
        await refreshState()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "导入失败"
      showToast(message, "error")
    } finally {
      setImporting(false)
      finishProgress(importCancel)
    }
  }

  if (loading && !accounts.length && !entries.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm text-slate-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">账号列表</h3>
          <span className="text-xs text-slate-400">{accounts.length} 个</span>
        </div>
        <div className="mt-4 space-y-2">
          <button
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
              activeAccountId === ALL_ACCOUNTS_ID
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50"
            }`}
            type="button"
            onClick={() => setActiveAccountId(ALL_ACCOUNTS_ID)}
          >
            <span>全部账号</span>
          </button>
          {accounts.map((account) => (
            <button
              key={account.id}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                activeAccountId === account.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              type="button"
              onClick={() => setActiveAccountId(account.id)}
            >
              <span>{account.name}</span>
              <span className="text-xs text-slate-400">
                {entries.filter((entry) => entry.account_id === account.id).length}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" onClick={() => setAccountModalOpen(true)}>
            账号管理
          </Button>
          <Button
            variant="outline"
            onClick={() => setCategoryModalOpen(true)}
            disabled={!activeAccountId || activeAccountId === ALL_ACCOUNTS_ID}
          >
            分类管理
          </Button>
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {activeAccountId && activeAccountId !== ALL_ACCOUNTS_ID ? (
                categories
                  .filter((category) => category.account_id === activeAccountId)
                  .map((category) => (
                    <button
                      key={category.id}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        activeCategoryId === category.id
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-slate-200 text-slate-500"
                      }`}
                      type="button"
                      onClick={() => setActiveCategoryId(category.id)}
                    >
                      {category.name}
                    </button>
                  ))
              ) : (
                <span className="text-xs text-slate-400">全部账号不支持分类筛选</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-48"
                placeholder="搜索商品名称"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                导入蓝链
              </Button>
              <Button onClick={autoMapEntries}>
                一键映射
              </Button>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 && !listLoading ? (
          <Empty
            title="暂无蓝链"
            description="导入蓝链后系统会自动匹配商品。"
            actionLabel="导入蓝链"
            onAction={() => setImportOpen(true)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {listLoading && visibleEntries.length === 0
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                  >
                    <div className="h-4 w-24 rounded bg-slate-100" />
                    <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
                    <div className="mt-4 h-8 w-24 rounded bg-slate-100" />
                  </div>
                ))
              : visibleEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">蓝链</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {entry.product_title || "未匹配商品"}
                    </p>
                    <p className="mt-2 break-all text-xs text-slate-500">
                      {entry.source_link || "--"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCopy(entry)}>
                      复制
                    </Button>
                    <Button size="sm" onClick={() => openEdit(entry)}>
                      编辑
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openProductPicker(entry)}>
                      选择商品
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDelete(entry)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>编辑蓝链</DialogTitle>
            <DialogDescription>修改蓝链链接并重新匹配商品。</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={editLink}
            onChange={(event) => setEditLink(event.target.value)}
            placeholder="请输入蓝链"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditSubmit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>导入蓝链</DialogTitle>
            <DialogDescription>每行一条蓝链，系统会自动匹配商品。</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="https://b23.tv/..."
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "导入中..." : "开始导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>账号管理</DialogTitle>
            <DialogDescription>新增、编辑或删除账号。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="账号名称"
                value={accountNameInput}
                onChange={(event) => setAccountNameInput(event.target.value)}
              />
              <Button onClick={handleAccountSubmit}>新增</Button>
            </div>
            <div className="max-h-[320px] space-y-2 overflow-auto">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <Input
                    defaultValue={account.name}
                    onBlur={(event) => updateAccountName(account.id, event.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => deleteAccount(account.id)}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAccountModalOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>分类管理</DialogTitle>
            <DialogDescription>管理当前账号下的蓝链分类。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="分类名称"
                value={categoryNameInput}
                onChange={(event) => {
                  setCategoryNameInput(event.target.value)
                  setCategoryError("")
                }}
              />
              <Button onClick={addCategoryByName}>新增</Button>
            </div>
            {categoryError ? <p className="text-xs text-rose-500">{categoryError}</p> : null}
            <div className="max-h-[320px] space-y-2 overflow-auto">
              {categories
                .filter((category) => category.account_id === activeAccountId)
                .map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                    <span className="text-sm text-slate-700">{category.name}</span>
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => deleteCategory(category.id)}
                    >
                      删除
                    </Button>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>选择商品</DialogTitle>
            <DialogDescription>选择商品用于映射蓝链。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="搜索商品名称"
              value={pickerKeyword}
              onChange={(event) => {
                setPickerKeyword(event.target.value)
                setPickerOffset(0)
                void loadPickerItems(true)
              }}
            />
            <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
              {pickerItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {pickerLoading ? "加载中..." : "暂无商品"}
                </div>
              ) : (
                pickerItems.map((item) => (
                  <button
                    key={item.id}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    type="button"
                    onClick={() => pickerEntry && updateEntryProduct(pickerEntry.id, item.id)}
                  >
                    <span>{item.title || "未命名商品"}</span>
                    <span className="text-xs text-slate-400">{item.price ?? "--"} 元</span>
                  </button>
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
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{progressLabel}进度</DialogTitle>
            <DialogDescription>
              {progressRunning
                ? `${progressLabel}中... 已处理 ${progressProcessed} / ${progressTotal}`
                : progressCancelled
                ? `${progressLabel}已取消`
                : `${progressLabel}完成`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-brand transition-all"
                style={{ width: progressTotal ? `${(progressProcessed / progressTotal) * 100}%` : "0%" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
              <div>总数 {progressTotal}</div>
              <div>成功 {progressSuccess}</div>
              <div>失败 {progressFailures.length}</div>
            </div>
            <div className="max-h-[200px] space-y-2 overflow-auto text-xs text-slate-600">
              {progressFailures.length === 0 ? (
                <div className="text-slate-400">暂无失败记录</div>
              ) : (
                progressFailures.map((item, index) => (
                  <div key={`${item.link}-${index}`} className="rounded-lg border border-slate-200 p-2">
                    <div className="text-rose-500">[{item.reason}]</div>
                    <div>{item.name}</div>
                    <div className="break-all text-slate-400">{item.link}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            {progressRunning ? (
              <Button
                variant="outline"
                onClick={() => setImportCancel(true)}
              >
                取消
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setProgressOpen(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
