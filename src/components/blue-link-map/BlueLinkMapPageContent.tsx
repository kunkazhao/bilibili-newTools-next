import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { createAccount, deleteAccount as removeAccount, updateAccount } from "@/lib/accountsApi"
import { useListDataPipeline } from "@/hooks/useListDataPipeline"
import BlueLinkMapDialogs from "./BlueLinkMapDialogs"
import BlueLinkMapPageView from "./BlueLinkMapPageView"
import { fetchBlueLinkMapState } from "./blueLinkMapApi"
import type {
  BlueLinkAccount,
  BlueLinkCategory,
  BlueLinkEntry,
  ProgressFailure,
  SourcingItem,
} from "./types"

const SOURCING_ITEMS_CACHE_KEY = "sourcing_items_cache_v1"

type BlueLinkMapState = {
  accounts: BlueLinkAccount[]
  categories: BlueLinkCategory[]
  entries: BlueLinkEntry[]
}

const EMPTY_STATE: BlueLinkMapState = { accounts: [], categories: [], entries: [] }

const META_SPEC_KEYS = {
  promoLink: "_promo_link",
  sourceLink: "_source_link",
} as const

function getJsonCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
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

function normalizeName(value?: string) {
  return String(value || "").trim()
}

export default function BlueLinkMapPage() {
  const { showToast } = useToast()
  const { items: stateItems, status, error, refresh, setItems: setStateItems } =
    useListDataPipeline<BlueLinkMapState, { scope: string }, BlueLinkMapState>({
      cacheKey: "blue-link-map",
      ttlMs: 3 * 60 * 1000,
      pageSize: 1,
      initialFilters: { scope: "all" },
      fetcher: async () => fetchBlueLinkMapState(),
      mapResponse: (response) => {
        const accounts = Array.isArray(response.accounts) ? response.accounts : []
        const categories = Array.isArray(response.categories) ? response.categories : []
        const entries = Array.isArray(response.entries) ? response.entries : []
        return {
          items: [{ accounts, categories, entries }],
          pagination: { hasMore: false, nextOffset: 1 },
        }
      },
    })
  const state = stateItems[0] ?? EMPTY_STATE
  const accounts = state.accounts
  const categories = state.categories
  const entries = state.entries
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [visibleEntries, setVisibleEntries] = useState<BlueLinkEntry[]>([])
  const chunkTimerRef = useRef<number | null>(null)

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [accountNameInput, setAccountNameInput] = useState("")
  const [categoryNameInput, setCategoryNameInput] = useState("")
  const [categoryError, setCategoryError] = useState("")
  const [sourcingCategories, setSourcingCategories] = useState<Array<{ id: string; name: string }>>([])

  const [editOpen, setEditOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<BlueLinkEntry | null>(null)
  const [editLink, setEditLink] = useState("")

  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [importCancel, setImportCancel] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerKeyword, setPickerKeyword] = useState("")
  const [pickerCategoryId, setPickerCategoryId] = useState("")
  const [pickerItems, setPickerItems] = useState<SourcingItem[]>([])
  const [pickerOffset, setPickerOffset] = useState(0)
  const [pickerHasMore, setPickerHasMore] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerEntry, setPickerEntry] = useState<BlueLinkEntry | null>(null)
  const pickerSearchTimerRef = useRef<number | null>(null)
  const pickerRequestIdRef = useRef(0)

  const [progressOpen, setProgressOpen] = useState(false)
  const [progressLabel, setProgressLabel] = useState("映射")
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressProcessed, setProgressProcessed] = useState(0)
  const [progressSuccess, setProgressSuccess] = useState(0)
  const [progressFailures, setProgressFailures] = useState<ProgressFailure[]>([])
  const [progressCancelled, setProgressCancelled] = useState(false)
  const [progressRunning, setProgressRunning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmDescription, setConfirmDescription] = useState("")
  const [confirmActionLabel, setConfirmActionLabel] = useState("确认")
  const confirmActionRef = useRef<null | (() => Promise<void> | void)>(null)
  const [itemsVersion, setItemsVersion] = useState(0)

  const itemsAllRef = useRef<SourcingItem[]>([])
  const itemsByIdRef = useRef<Map<string, SourcingItem>>(new Map())
  const skuIndexAllRef = useRef<Map<string, SourcingItem>>(new Map())
  const itemsAllLoadedRef = useRef(false)
  const itemsLoadingRef = useRef(false)
  const lastErrorRef = useRef<string | null>(null)

  const updateState = useCallback(
    (updater: (prev: BlueLinkMapState) => BlueLinkMapState) => {
      setStateItems((prev) => {
        const current = prev[0] ?? EMPTY_STATE
        return [updater(current)]
      })
    },
    [setStateItems]
  )

  const isPageLoading = status === "loading" || status === "warmup"
  const isListLoading = status === "loading" || status === "warmup" || status === "refreshing"

  const moveById = <T extends { id: string }>(items: T[], sourceId: string, targetId: string) => {
    const fromIndex = items.findIndex((item) => item.id === sourceId)
    const toIndex = items.findIndex((item) => item.id === targetId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return items
    const next = [...items]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return next
  }

  const mergeItemsIntoMap = (items: SourcingItem[]) => {
    if (!items.length) return
    const next = new Map(itemsByIdRef.current)
    let updated = false
    items.forEach((item) => {
      if (!item?.id) return
      const prev = next.get(item.id)
      if (!prev || getItemTimestamp(item) >= getItemTimestamp(prev)) {
        next.set(item.id, { ...prev, ...item })
        updated = true
      }
    })
    if (updated) {
      itemsByIdRef.current = next
      setItemsVersion((version) => version + 1)
    }
  }

  const hydrateItemsFromCache = () => {
    const cache = getJsonCache<{ items?: SourcingItem[] }>(SOURCING_ITEMS_CACHE_KEY)
    if (cache?.items?.length) {
      mergeItemsIntoMap(cache.items)
    }
  }

  const entriesIndex = useMemo(() => {
    const byAccount = new Map<string, BlueLinkEntry[]>()
    const byAccountCategory = new Map<string, Map<string, BlueLinkEntry[]>>()
    const counts = new Map<string, number>()
    entries.forEach((entry) => {
      const accountId = entry.account_id
      if (!accountId) return
      counts.set(accountId, (counts.get(accountId) ?? 0) + 1)
      let list = byAccount.get(accountId)
      if (!list) {
        list = []
        byAccount.set(accountId, list)
      }
      list.push(entry)
      if (entry.category_id) {
        let categoryMap = byAccountCategory.get(accountId)
        if (!categoryMap) {
          categoryMap = new Map<string, BlueLinkEntry[]>()
          byAccountCategory.set(accountId, categoryMap)
        }
        let categoryList = categoryMap.get(entry.category_id)
        if (!categoryList) {
          categoryList = []
          categoryMap.set(entry.category_id, categoryList)
        }
        categoryList.push(entry)
      }
    })
    return { byAccount, byAccountCategory, counts }
  }, [entries])

  const normalizedKeyword = useMemo(() => searchValue.trim().toLowerCase(), [searchValue])
  const sourcingCategoryIdByName = useMemo(() => {
    const map = new Map<string, string>()
    sourcingCategories.forEach((category) => {
      map.set(normalizeName(category.name), category.id)
    })
    return map
  }, [sourcingCategories])

  const resolveSourcingCategoryId = (categoryId?: string | null) => {
    if (!categoryId) return ""
    const name = categories.find((category) => category.id === categoryId)?.name
    const normalized = normalizeName(name)
    if (normalized) {
      return sourcingCategoryIdByName.get(normalized) ?? ""
    }
    return ""
  }

  const baseEntries = useMemo(() => {
    if (!activeAccountId) return []
    if (activeCategoryId) {
      return (
        entriesIndex.byAccountCategory
          .get(activeAccountId)
          ?.get(activeCategoryId) ?? []
      )
    }
    return entriesIndex.byAccount.get(activeAccountId) ?? []
  }, [entriesIndex, activeAccountId, activeCategoryId])

  const filteredEntries = useMemo(() => {
    if (!normalizedKeyword) return baseEntries
    return baseEntries.filter((entry) => {
      const matchedItem = entry.product_id ? itemsByIdRef.current.get(entry.product_id) : null
      const title = String(matchedItem?.title || entry.product_title || "").toLowerCase()
      const link = String(entry.source_link || "").toLowerCase()
      return title.includes(normalizedKeyword) || link.includes(normalizedKeyword)
    })
  }, [baseEntries, normalizedKeyword, itemsVersion])

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
    return () => {
      if (pickerSearchTimerRef.current) {
        window.clearTimeout(pickerSearchTimerRef.current)
        pickerSearchTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (pickerOpen) return
    if (pickerSearchTimerRef.current) {
      window.clearTimeout(pickerSearchTimerRef.current)
      pickerSearchTimerRef.current = null
    }
  }, [pickerOpen])

  useEffect(() => {
    const loadSourcingCategories = async () => {
      try {
        const data = await apiRequest<{ categories: Array<{ id: string; name: string }> }>(
          "/api/sourcing/categories"
        )
        setSourcingCategories(Array.isArray(data.categories) ? data.categories : [])
      } catch {
        setSourcingCategories([])
      }
    }
    void loadSourcingCategories()
  }, [])

  useEffect(() => {
    if (status !== "error" || !error) return
    if (lastErrorRef.current === error) return
    lastErrorRef.current = error
    showToast(error, "error")
  }, [error, showToast, status])

  useEffect(() => {
    hydrateItemsFromCache()
  }, [])

  useEffect(() => {
    if (accounts.length === 0) {
      setActiveAccountId(null)
      return
    }
    setActiveAccountId((prev) => {
      if (prev && accounts.some((item) => item.id === prev)) {
        return prev
      }
      return accounts[0]?.id || null
    })
  }, [accounts])

  useEffect(() => {
    if (!activeAccountId) {
      setActiveCategoryId(null)
      return
    }
    const cacheKey = `blue_link_map_category_v2_${activeAccountId}`
    const cachedCategory = localStorage.getItem(cacheKey)
    const accountCategories = categories.filter((cat) => cat.account_id === activeAccountId)
    if (cachedCategory && accountCategories.some((cat) => cat.id === cachedCategory)) {
      setActiveCategoryId(cachedCategory)
      return
    }
    setActiveCategoryId(accountCategories[0]?.id || null)
  }, [activeAccountId, categories])

  useEffect(() => {
    if (!activeAccountId || !activeCategoryId) return
    const cacheKey = `blue_link_map_category_v2_${activeAccountId}`
    localStorage.setItem(cacheKey, activeCategoryId)
  }, [activeAccountId, activeCategoryId])

  useEffect(() => {
    if (!entries.length) return
    const partialItems: SourcingItem[] = []
    entries.forEach((entry) => {
      if (!entry.product_id) return
      partialItems.push({
        id: entry.product_id,
        title: entry.product_title,
        price: entry.product_price,
        cover_url: entry.product_cover,
      })
    })
    mergeItemsIntoMap(partialItems)
  }, [entries])

  useEffect(() => {
    if (!visibleEntries.length) return
    const targetIds = new Set(
      visibleEntries.map((entry) => entry.product_id).filter(Boolean) as string[]
    )
    if (targetIds.size === 0) return
    void ensureItemsForEntries(targetIds)
  }, [visibleEntries])

  const refreshState = async () => {
    await refresh()
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

  const handleAccountReorder = (sourceId: string, targetId: string) => {
    updateState((prev) => ({
      ...prev,
      accounts: moveById(prev.accounts, sourceId, targetId),
    }))
  }

  const handleCategoryReorder = (sourceId: string, targetId: string) => {
    if (!activeAccountId) return
    updateState((prev) => {
      const current = prev.categories.filter((item) => item.account_id === activeAccountId)
      const reordered = moveById(current, sourceId, targetId)
      if (reordered === current) return prev
      let index = 0
      const nextCategories = prev.categories.map((item) => {
        if (item.account_id !== activeAccountId) return item
        const next = reordered[index] ?? item
        index += 1
        return next
      })
      return {
        ...prev,
        categories: nextCategories,
      }
    })
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
      showToast("蓝链链接不能为空", "error")
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

  const deleteEntry = async (entry: BlueLinkEntry) => {
    try {
      await apiRequest(`/api/blue-link-map/entries/${entry.id}`, {
        method: "DELETE",
      })
      showToast("已删除", "success")
      updateState((prev) => ({
        ...prev,
        entries: prev.entries.filter((item) => item.id !== entry.id),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败"
      showToast(message, "error")
    }
  }

  const requestDeleteEntry = (entry: BlueLinkEntry) => {
    const matchedItem = entry.product_id ? itemsByIdRef.current.get(entry.product_id) : null
    const title = matchedItem?.title || entry.product_title || "未命名蓝链"
    openConfirm({
      title: "删除蓝链映射",
      description: `确认删除【${title}】吗？`,
      actionLabel: "确认删除",
      onConfirm: async () => {
        await deleteEntry(entry)
      },
    })
  }

  const openConfirm = (options: {
    title: string
    description?: string
    actionLabel?: string
    onConfirm: () => Promise<void> | void
  }) => {
    setConfirmTitle(options.title)
    setConfirmDescription(options.description || "")
    setConfirmActionLabel(options.actionLabel || "确认")
    confirmActionRef.current = options.onConfirm
    setConfirmOpen(true)
  }

  const handleConfirmAction = async () => {
    const action = confirmActionRef.current
    confirmActionRef.current = null
    setConfirmOpen(false)
    if (action) {
      await action()
    }
  }

  const handleAccountSubmit = async () => {
    const name = accountNameInput.trim()
    if (!name) {
      showToast("请输入账号名称", "error")
      return
    }
    try {
      await createAccount({ name })
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
      const data = await updateAccount(accountId, { name: trimmed })
      updateState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((item) =>
          item.id === accountId ? data.account : item
        ),
      }))
      showToast("账号已更新", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新失败"
      showToast(message, "error")
    }
  }

  const deleteAccount = async (accountId: string) => {
    const name = accounts.find((account) => account.id === accountId)?.name || "该账号"
    openConfirm({
      title: "删除账号",
      description: `确认删除【${name}】吗？该账号的蓝链映射都会被移除。`,
      actionLabel: "确认删除",
      onConfirm: async () => {
        try {
          await removeAccount(accountId)
          await refreshState()
        } catch (error) {
          const message = error instanceof Error ? error.message : "删除失败"
          showToast(message, "error")
        }
      },
    })
  }

  const addCategoryByName = async (nameOverride?: string) => {
    if (!activeAccountId) {
      setCategoryError("请先选择账号")
      return
    }
    const trimmed = (nameOverride ?? categoryNameInput).trim()
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
        updateState((prev) => ({
          ...prev,
          categories: [data.category, ...prev.categories],
        }))
      }
      if (!nameOverride) {
        setCategoryNameInput("")
      }
      setCategoryError("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "新增分类失败"
      setCategoryError(message)
    }
  }

  const updateCategoryName = async (categoryId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setCategoryError("分类名称不能为空")
      return
    }
    try {
      const data = await apiRequest<{ category: BlueLinkCategory }>(
        `/api/blue-link-map/categories/${categoryId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed }),
        }
      )
      updateState((prev) => ({
        ...prev,
        categories: prev.categories.map((item) =>
          item.id === categoryId ? data.category : item
        ),
      }))
      setCategoryError("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新失败"
      setCategoryError(message)
    }
  }

  const addCategoryFromOther = async (name: string) => {
    await addCategoryByName(name)
  }

  const deleteCategory = async (categoryId: string) => {
    const name = categories.find((category) => category.id === categoryId)?.name || "该分类"
    openConfirm({
      title: "删除分类",
      description: `删除后分类【${name}】下的映射都会被移除，确认删除？`,
      actionLabel: "确认删除",
      onConfirm: async () => {
        try {
          await apiRequest(`/api/blue-link-map/categories/${categoryId}`, { method: "DELETE" })
          updateState((prev) => ({
            ...prev,
            categories: prev.categories.filter((item) => item.id !== categoryId),
          }))
        } catch (error) {
          const message = error instanceof Error ? error.message : "删除分类失败"
          showToast(message, "error")
        }
      },
    })
  }

  const ensureItemsForEntries = async (targetIds: Set<string>) => {
    if (!targetIds.size || itemsLoadingRef.current) return
    const missingIds = new Set<string>()
    targetIds.forEach((id) => {
      const item = itemsByIdRef.current.get(id)
      if (!item || item.commission_rate === undefined || item.commission_rate === null) {
        missingIds.add(id)
      }
    })
    if (!missingIds.size) return

    itemsLoadingRef.current = true
    try {
      let offset = 0
      let hasMore = true
      const limit = 200
      const fetched: SourcingItem[] = []

      while (hasMore && missingIds.size > 0) {
        const params = new URLSearchParams()
        params.set("limit", String(limit))
        params.set("offset", String(offset))
        params.set("fields", "list")
        const data = await apiRequest<{ items: SourcingItem[]; has_more?: boolean; next_offset?: number }>(
          `/api/sourcing/items?${params.toString()}`
        )
        const list = Array.isArray(data.items) ? data.items : []
        if (list.length) {
          fetched.push(...list)
          list.forEach((item) => {
            if (item?.id) {
              missingIds.delete(item.id)
            }
          })
        }
        hasMore = Boolean(data.has_more)
        offset = data.next_offset ?? offset + list.length
        if (!list.length) break
      }

      if (fetched.length) {
        mergeItemsIntoMap(fetched)
      }
    } catch {
      // ignore background failures
    } finally {
      itemsLoadingRef.current = false
    }
  }

  const loadPickerItems = async (
    reset = false,
    categoryId = pickerCategoryId,
    keyword = pickerKeyword
  ) => {
    if (pickerLoading && !reset) return
    const requestId = ++pickerRequestIdRef.current
    setPickerLoading(true)
    const limit = 50
    const offset = reset ? 0 : pickerOffset
    const params = new URLSearchParams()
    params.set("limit", String(limit))
    params.set("offset", String(offset))
    params.set("fields", "list")
    const resolvedCategoryId = resolveSourcingCategoryId(categoryId)
    if (resolvedCategoryId) params.set("category_id", resolvedCategoryId)
    const trimmedKeyword = keyword.trim()
    if (trimmedKeyword) params.set("q", trimmedKeyword)
    try {
      const data = await apiRequest<{ items: SourcingItem[]; has_more?: boolean; next_offset?: number }>(
        `/api/sourcing/items?${params.toString()}`
      )
      const list = Array.isArray(data.items) ? data.items : []
      if (requestId !== pickerRequestIdRef.current) return
      setPickerItems((prev) => (reset ? list : prev.concat(list)))
      setPickerHasMore(Boolean(data.has_more))
      setPickerOffset(data.next_offset ?? offset + list.length)
    } catch (error) {
      if (requestId !== pickerRequestIdRef.current) return
      const message = error instanceof Error ? error.message : "加载商品失败"
      showToast(message, "error")
    } finally {
      if (requestId === pickerRequestIdRef.current) {
        setPickerLoading(false)
      }
    }
  }

  const openProductPicker = (entry: BlueLinkEntry) => {
    const defaultCategoryId = activeCategoryId || ""
    if (pickerSearchTimerRef.current) {
      window.clearTimeout(pickerSearchTimerRef.current)
      pickerSearchTimerRef.current = null
    }
    setPickerEntry(entry)
    setPickerKeyword("")
    setPickerCategoryId(defaultCategoryId)
    setPickerItems([])
    setPickerOffset(0)
    setPickerHasMore(false)
    setPickerOpen(true)
    void loadPickerItems(true, defaultCategoryId, "")
  }

  const handlePickerCategoryChange = (value: string) => {
    setPickerCategoryId(value)
    setPickerItems([])
    setPickerOffset(0)
    setPickerHasMore(false)
    if (pickerSearchTimerRef.current) {
      window.clearTimeout(pickerSearchTimerRef.current)
      pickerSearchTimerRef.current = null
    }
    void loadPickerItems(true, value, pickerKeyword)
  }

  const handlePickerKeywordChange = (value: string) => {
    setPickerKeyword(value)
    if (!pickerOpen) return
    if (pickerSearchTimerRef.current) {
      window.clearTimeout(pickerSearchTimerRef.current)
    }
    pickerSearchTimerRef.current = window.setTimeout(() => {
      void loadPickerItems(true, pickerCategoryId, value)
    }, 300)
  }

  const patchEntryMapping = async (entryId: string, productId: string | null, skuId: string | null) => {
    await apiRequest(`/api/blue-link-map/entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify({ product_id: productId, sku_id: skuId || null }),
    })
    updateState((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.id === entryId
          ? { ...entry, product_id: productId || null, updated_at: new Date().toISOString() }
          : entry
      ),
    }))
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
    setItemsVersion((version) => version + 1)
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
      showToast("当前页没有未映射蓝链", "info")
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
    if (!activeAccountId) {
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


  const entriesCountByAccount = entriesIndex.counts

  const accountCategories = useMemo(() => {
    if (!activeAccountId) return []
    return categories.filter((category) => category.account_id === activeAccountId)
  }, [categories, activeAccountId])

  return (
    <>
      <BlueLinkMapPageView
        loading={isPageLoading}
        listLoading={isListLoading}
        accounts={accounts}
        entries={entries}
        activeAccountId={activeAccountId}
        activeCategoryId={activeCategoryId}
        searchValue={searchValue}
        accountCategories={accountCategories}
        filteredEntries={filteredEntries}
        visibleEntries={visibleEntries}
        itemsById={itemsByIdRef.current}
        entriesCountByAccount={entriesCountByAccount}
        onAccountChange={setActiveAccountId}
        onCategoryChange={setActiveCategoryId}
        onSearchChange={setSearchValue}
        onOpenAccountManage={() => setAccountModalOpen(true)}
        onOpenCategoryManage={() => setCategoryModalOpen(true)}
        onOpenImport={() => setImportOpen(true)}
        onAutoMap={autoMapEntries}
        onCopy={handleCopy}
        onEdit={openEdit}
        onPick={openProductPicker}
        onDelete={requestDeleteEntry}
      />
      <BlueLinkMapDialogs
        editOpen={editOpen}
        editLink={editLink}
        onEditLinkChange={setEditLink}
        onEditOpenChange={setEditOpen}
        onEditSubmit={handleEditSubmit}
        importOpen={importOpen}
        importText={importText}
        importing={importing}
        onImportTextChange={setImportText}
        onImportOpenChange={setImportOpen}
        onImportSubmit={handleImport}
        accountModalOpen={accountModalOpen}
        accountNameInput={accountNameInput}
        accounts={accounts}
        onAccountNameChange={setAccountNameInput}
        onAccountSubmit={handleAccountSubmit}
        onAccountOpenChange={setAccountModalOpen}
        onAccountNameBlur={updateAccountName}
        onAccountDelete={deleteAccount}
        onAccountReorder={handleAccountReorder}
        categoryModalOpen={categoryModalOpen}
        categoryNameInput={categoryNameInput}
        categoryError={categoryError}
        categories={categories}
        activeAccountId={activeAccountId}
        onCategoryNameChange={(value) => {
          setCategoryNameInput(value)
          setCategoryError("")
        }}
        onCategorySubmit={addCategoryByName}
        onCategoryOpenChange={setCategoryModalOpen}
        onCategoryNameBlur={updateCategoryName}
        onCategoryAddFromOther={addCategoryFromOther}
        onCategoryDelete={deleteCategory}
        onCategoryReorder={handleCategoryReorder}
        pickerOpen={pickerOpen}
        pickerCategoryId={pickerCategoryId}
        pickerKeyword={pickerKeyword}
        pickerItems={pickerItems}
        pickerHasMore={pickerHasMore}
        pickerLoading={pickerLoading}
        onPickerCategoryChange={handlePickerCategoryChange}
        onPickerKeywordChange={handlePickerKeywordChange}
        onPickerOpenChange={setPickerOpen}
        onPickerPick={(itemId) => {
          if (!pickerEntry) return
          void updateEntryProduct(pickerEntry.id, itemId)
        }}
        onPickerLoadMore={() => void loadPickerItems(false, pickerCategoryId, pickerKeyword)}
        progressOpen={progressOpen}
        progressLabel={progressLabel}
        progressTotal={progressTotal}
        progressProcessed={progressProcessed}
        progressSuccess={progressSuccess}
        progressFailures={progressFailures}
        progressCancelled={progressCancelled}
        progressRunning={progressRunning}
        onProgressOpenChange={setProgressOpen}
        onProgressCancel={() => setImportCancel(true)}
        onProgressClose={() => setProgressOpen(false)}
        confirmOpen={confirmOpen}
        confirmTitle={confirmTitle}
        confirmDescription={confirmDescription}
        confirmActionLabel={confirmActionLabel}
        onConfirmOpenChange={setConfirmOpen}
        onConfirmAction={handleConfirmAction}
      />
    </>
  )
}
