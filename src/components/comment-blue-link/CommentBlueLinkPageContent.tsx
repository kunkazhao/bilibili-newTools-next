import { startTransition, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import {
  buildComboContent,
  buildProductContent,
  getPinnedComments,
  isBilibiliInput,
} from "@/lib/bilibili"
import CommentBlueLinkDialogs from "./CommentBlueLinkDialogs"
import CommentBlueLinkPageView from "./CommentBlueLinkPageView"
import { fetchCommentBlueLinkState } from "./commentBlueLinkApi"
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
import type { CommentAccount, CommentCategory, CommentCombo } from "./types"
const COMMENT_BLUE_LINK_CACHE_KEY = "comment_blue_link_cache_v2"
const COMMENT_BLUE_LINK_CACHE_TTL = 5 * 60 * 1000
const COMMENT_BLUE_LINK_PRODUCT_KEY = "comment_combo_product_"
const CACHE_DEBOUNCE_MS = 800
const CHUNK_SIZE = 40
const ALL_CATEGORY_ID = "__all__"
type CommentCache = {
  timestamp: number
  accounts: CommentAccount[]
  categories: CommentCategory[]
  combos: CommentCombo[]
  currentAccountId?: string | null
  currentCategoryId?: string | null
}
const getCache = () => {
  try {
    const raw = localStorage.getItem(COMMENT_BLUE_LINK_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CommentCache
  } catch {
    return null
  }
}
const isCacheFresh = (cache: CommentCache | null) => {
  if (!cache?.timestamp) return false
  return Date.now() - cache.timestamp < COMMENT_BLUE_LINK_CACHE_TTL
}
export default function CommentBlueLinkPage() {
  const { showToast } = useToast()
  const [accounts, setAccounts] = useState<CommentAccount[]>([])
  const [categories, setCategories] = useState<CommentCategory[]>([])
  const [combos, setCombos] = useState<CommentCombo[]>([])
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [currentCategoryId, setCurrentCategoryId] = useState<string>(ALL_CATEGORY_ID)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [visibleCombos, setVisibleCombos] = useState<CommentCombo[]>([])
  const chunkTimerRef = useRef<number | null>(null)
  const cacheTimerRef = useRef<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<CommentCombo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CommentCombo | null>(null)
  const [formAccountId, setFormAccountId] = useState("")
  const [formCategoryId, setFormCategoryId] = useState("")
  const [formName, setFormName] = useState("")
  const [formSourceLink, setFormSourceLink] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formRemark, setFormRemark] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [comboViewModes, setComboViewModes] = useState<
    Record<string, "full" | "product">
  >({})
  const [productContents, setProductContents] = useState<Record<string, string>>({})
  const [productLoading, setProductLoading] = useState<Record<string, boolean>>({})
  const combosIndex = useMemo(() => {
    const byAccount = new Map<string, CommentCombo[]>()
    const byAccountCategory = new Map<string, Map<string, CommentCombo[]>>()
    const counts = new Map<string, number>()
    combos.forEach((combo) => {
      const accountId = combo.account_id
      let list = byAccount.get(accountId)
      if (!list) {
        list = []
        byAccount.set(accountId, list)
      }
      list.push(combo)
      counts.set(accountId, (counts.get(accountId) ?? 0) + 1)
      if (combo.category_id) {
        let categoryMap = byAccountCategory.get(accountId)
        if (!categoryMap) {
          categoryMap = new Map<string, CommentCombo[]>()
          byAccountCategory.set(accountId, categoryMap)
        }
        let categoryList = categoryMap.get(combo.category_id)
        if (!categoryList) {
          categoryList = []
          categoryMap.set(combo.category_id, categoryList)
        }
        categoryList.push(combo)
      }
    })
    return { byAccount, byAccountCategory, counts }
  }, [combos])
  const filteredCombos = useMemo(() => {
    if (!currentAccountId) return []
    if (currentCategoryId && currentCategoryId !== ALL_CATEGORY_ID) {
      return (
        combosIndex.byAccountCategory
          .get(currentAccountId)
          ?.get(currentCategoryId) ?? []
      )
    }
    return combosIndex.byAccount.get(currentAccountId) ?? []
  }, [combosIndex, currentAccountId, currentCategoryId])
  const persistCache = () => {
    try {
      localStorage.setItem(
        COMMENT_BLUE_LINK_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          accounts,
          categories,
          combos,
          currentAccountId,
          currentCategoryId,
        })
      )
    } catch {
      // ignore
    }
  }
  useEffect(() => {
    const cache = getCache()
    const hasFreshCache = isCacheFresh(cache)
    if (hasFreshCache) {
      setAccounts(Array.isArray(cache?.accounts) ? cache?.accounts ?? [] : [])
      setCategories(Array.isArray(cache?.categories) ? cache?.categories ?? [] : [])
      setCombos(Array.isArray(cache?.combos) ? cache?.combos ?? [] : [])
      const accountId = cache?.currentAccountId || cache?.accounts?.[0]?.id || null
      setCurrentAccountId(accountId)
      setCurrentCategoryId(cache?.currentCategoryId || ALL_CATEGORY_ID)
      setLoading(false)
      setListLoading(false)
    }
    const load = async () => {
      if (!hasFreshCache) {
        setListLoading(true)
      }
      try {
        const data = await fetchCommentBlueLinkState()
        const accountList = Array.isArray(data.accounts) ? data.accounts : []
        const categoryList = Array.isArray(data.categories) ? data.categories : []
        const comboList = Array.isArray(data.combos) ? data.combos : []
        setAccounts(accountList)
        setCategories(categoryList)
        startTransition(() => {
          setCombos(comboList)
        })
        const nextAccountId = accountList[0]?.id || null
        setCurrentAccountId((prev) => prev || nextAccountId)
        setCurrentCategoryId((prev) => prev || ALL_CATEGORY_ID)
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载失败"
        showToast(message, "error")
      } finally {
        setLoading(false)
        setListLoading(false)
      }
    }
    load().catch(() => {})
  }, [showToast])
  useEffect(() => {
    if (cacheTimerRef.current) {
      window.clearTimeout(cacheTimerRef.current)
    }
    cacheTimerRef.current = window.setTimeout(() => {
      persistCache()
      cacheTimerRef.current = null
    }, CACHE_DEBOUNCE_MS)
    return () => {
      if (cacheTimerRef.current) {
        window.clearTimeout(cacheTimerRef.current)
      }
    }
  }, [accounts, categories, combos, currentAccountId, currentCategoryId])
  useEffect(() => {
    if (!currentAccountId) return
    if (currentCategoryId === ALL_CATEGORY_ID) return
    const exists = categories.some(
      (item) => item.account_id === currentAccountId && item.id === currentCategoryId
    )
    if (!exists) {
      setCurrentCategoryId(ALL_CATEGORY_ID)
    }
  }, [categories, currentAccountId, currentCategoryId])
  useEffect(() => {
    if (chunkTimerRef.current) {
      window.clearTimeout(chunkTimerRef.current)
      chunkTimerRef.current = null
    }
    if (!filteredCombos.length) {
      setVisibleCombos([])
      return
    }
    let index = 0
    const next = () => {
      index += CHUNK_SIZE
      setVisibleCombos(filteredCombos.slice(0, index))
      if (index < filteredCombos.length) {
        chunkTimerRef.current = window.setTimeout(next, 16)
      }
    }
    setVisibleCombos(filteredCombos.slice(0, CHUNK_SIZE))
    if (filteredCombos.length > CHUNK_SIZE) {
      chunkTimerRef.current = window.setTimeout(next, 16)
    }
  }, [filteredCombos])
  useEffect(() => {
    if (!formAccountId) return
    const list = categories.filter((item) => item.account_id === formAccountId)
    if (!list.length) {
      setFormCategoryId("")
      return
    }
    const exists = list.some((item) => item.id === formCategoryId)
    if (!exists) {
      setFormCategoryId(list[0].id)
    }
  }, [categories, formAccountId, formCategoryId])
  const readProductCache = (comboId: string) => {
    if (!comboId) return ""
    try {
      return (
        localStorage.getItem(`${COMMENT_BLUE_LINK_PRODUCT_KEY}${comboId}`)?.trim() ||
        ""
      )
    } catch {
      return ""
    }
  }
  const writeProductCache = (comboId: string, content: string) => {
    if (!comboId) return
    const safeContent = (content || "").trim()
    if (!safeContent) return
    try {
      localStorage.setItem(`${COMMENT_BLUE_LINK_PRODUCT_KEY}${comboId}`, safeContent)
    } catch {
      // ignore
    }
  }
  const ensureProductContent = async (combo: CommentCombo) => {
    if (!combo?.id) return
    const comboId = combo.id
    const directProduct = (combo.product_content || "").trim()
    if (directProduct) {
      if (!productContents[comboId]) {
        setProductContents((prev) => ({ ...prev, [comboId]: directProduct }))
      }
      return
    }
    const cached = productContents[comboId] || readProductCache(comboId)
    if (cached) {
      if (!productContents[comboId]) {
        setProductContents((prev) => ({ ...prev, [comboId]: cached }))
      }
      return
    }
    if (!combo.source_link) {
      const fallback = "未获取到商品名称"
      setProductContents((prev) => ({ ...prev, [comboId]: fallback }))
      writeProductCache(comboId, fallback)
      return
    }
    if (productLoading[comboId]) return
    setProductLoading((prev) => ({ ...prev, [comboId]: true }))
    try {
      const result = await getPinnedComments(combo.source_link)
      const content = buildProductContent(result)
      const safeContent = (content || "").trim() || "未获取到商品名称"
      setProductContents((prev) => ({ ...prev, [comboId]: safeContent }))
      writeProductCache(comboId, safeContent)
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成商品版失败"
      showToast(message, "error")
      const fallback = "未获取到商品名称"
      setProductContents((prev) => ({ ...prev, [comboId]: fallback }))
      writeProductCache(comboId, fallback)
    } finally {
      setProductLoading((prev) => ({ ...prev, [comboId]: false }))
    }
  }
      const getComboDisplayContent = (combo: CommentCombo) => {
    const mode = comboViewModes[combo.id] ?? "full"
    if (mode === "product") {
      const directProduct = (combo.product_content || "").trim()
      if (directProduct) {
        return directProduct
      }
      const cached = productContents[combo.id] || readProductCache(combo.id)
      if (cached) {
        if (!productContents[combo.id]) {
          setProductContents((prev) => ({ ...prev, [combo.id]: cached }))
        }
        return cached
      }
      if (!combo.source_link) {
        return "????????"
      }
      if (productLoading[combo.id]) {
        return "??????..."
      }
      return ""
    }
    return combo.content || ""
  }
  const copyText = async (content: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content)
      return true
    }
    try {
      const textarea = document.createElement("textarea")
      textarea.value = content
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }
  const handleCopyCombo = async (combo: CommentCombo) => {
    const content = getComboDisplayContent(combo).trim()
    if (!content) {
      const mode = comboViewModes[combo.id] ?? "full"
      if (mode === "product") {
        showToast("????????????", "info")
        void ensureProductContent(combo)
      } else {
        showToast("???????", "info")
      }
      return
    }
    try {
      const ok = await copyText(content)
      if (ok) {
        showToast("???????", "success")
      } else {
        showToast("??????????", "error")
      }
    } catch {
      showToast("??????????", "error")
    }
  }
  const handleToggleVersion = (combo: CommentCombo) => {
    const current = comboViewModes[combo.id] ?? "full"
    const next = current === "full" ? "product" : "full"
    setComboViewModes((prev) => ({ ...prev, [combo.id]: next }))
    if (next === "product") {
      const directProduct = (combo.product_content || "").trim()
      if (directProduct) {
        if (!productContents[combo.id]) {
          setProductContents((prev) => ({ ...prev, [combo.id]: directProduct }))
        }
        return
      }
      void ensureProductContent(combo)
    }
  }
  const ensureDefaultCategory = async (accountId: string) => {
    const existing = categories.find((item) => item.account_id === accountId)
    if (existing) return existing.id
    try {
      const data = await apiRequest<{ category: CommentCategory }>("/api/comment/categories", {
        method: "POST",
        body: JSON.stringify({ account_id: accountId, name: "默认" }),
      })
      if (data.category) {
        setCategories((prev) => [data.category, ...prev])
        return data.category.id
      }
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : "分类创建失败"
      showToast(message, "error")
      return null
    }
  }
  const openCreate = () => {
    setEditingCombo(null)
    const accountId = currentAccountId ?? ""
    setFormAccountId(accountId)
    const defaultCategory = categories.find((item) => item.account_id === accountId)
    setFormCategoryId(defaultCategory?.id || "")
    setFormName("")
    setFormSourceLink("")
    setFormContent("")
    setFormRemark("")
    setModalOpen(true)
  }
  const openEdit = (combo: CommentCombo) => {
    setEditingCombo(combo)
    setFormAccountId(combo.account_id)
    setFormCategoryId(combo.category_id || "")
    setFormName(combo.name || "")
    setFormSourceLink(combo.source_link || "")
    setFormContent(combo.content || "")
    setFormRemark(combo.remark || "")
    setModalOpen(true)
  }
  const handleExtractContent = async () => {
    if (extracting) return
    const link = formSourceLink.trim()
    if (!link) {
      showToast("请输入B站链接或BV号", "info")
      return
    }
    if (!isBilibiliInput(link)) {
      showToast("仅支持B站链接、b23短链或BV号", "error")
      return
    }
    setExtracting(true)
    try {
      const result = await getPinnedComments(link)
      const content = buildComboContent(result)
      setFormContent(content)
      showToast("提取完成", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "提取失败"
      showToast(message, "error")
    } finally {
      setExtracting(false)
    }
  }
  const handleSave = async () => {
    if (!formAccountId) {
      showToast("请选择账号", "error")
      return
    }
    if (!formName.trim()) {
      showToast("组合名称不能为空", "error")
      return
    }
    let categoryId = formCategoryId
    if (!categoryId || categoryId === ALL_CATEGORY_ID) {
      categoryId = (await ensureDefaultCategory(formAccountId)) || ""
    }
    if (!categoryId) {
      showToast("当前账号暂无可用分类", "error")
      return
    }
    const payload = {
      account_id: formAccountId,
      category_id: categoryId,
      name: formName.trim(),
      source_link: formSourceLink.trim(),
      content: formContent.trim(),
      remark: formRemark.trim(),
    }
    try {
      if (editingCombo) {
        const data = await apiRequest<{ combo: CommentCombo }>(
          `/api/comment/combos/${editingCombo.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        )
        setCombos((prev) =>
          prev.map((item) => (item.id === data.combo.id ? data.combo : item))
        )
        showToast("保存成功", "success")
      } else {
        const data = await apiRequest<{ combo: CommentCombo }>("/api/comment/combos", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        setCombos((prev) => [data.combo, ...prev])
        showToast("新增成功", "success")
      }
      setModalOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败"
      showToast(message, "error")
    }
  }
  const handleDelete = async (combo: CommentCombo) => {
    try {
      await apiRequest(`/api/comment/combos/${combo.id}`, { method: "DELETE" })
      setCombos((prev) => prev.filter((item) => item.id !== combo.id))
      showToast("删除成功", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败"
      showToast(message, "error")
    }
  }
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await handleDelete(deleteTarget)
    setDeleteTarget(null)
  }
  const comboViewStates = useMemo(() => {
    const states: Record<
      string,
      { mode: "full" | "product"; content: string; loading: boolean }
    > = {}
    combos.forEach((combo) => {
      const mode = comboViewModes[combo.id] ?? "full"
      if (mode === "product") {
        const directProduct = (combo.product_content || "").trim()
        const cached =
          directProduct || productContents[combo.id] || readProductCache(combo.id)
        const loading = Boolean(productLoading[combo.id]) && !directProduct
        let content = cached
        if (!content) {
          if (!combo.source_link) {
            content = "未获取到商品名称"
          } else {
            content = "商品版生成中..."
          }
        }
        states[combo.id] = { mode, content, loading }
        return
      }
      states[combo.id] = {
        mode,
        content: combo.content || "",
        loading: false,
      }
    })
    return states
  }, [combos, comboViewModes, productContents, productLoading])
  const combosCountByAccount = combosIndex.counts
  return (
    <>
      <CommentBlueLinkPageView
        loading={loading}
        listLoading={listLoading}
        accounts={accounts}
        currentAccountId={currentAccountId}
        filteredCombos={filteredCombos}
        visibleCombos={visibleCombos}
        combosCountByAccount={combosCountByAccount}
        comboViewStates={comboViewStates}
        onAccountChange={setCurrentAccountId}
        onCopyCombo={handleCopyCombo}
        onOpenCreate={openCreate}
        onOpenEdit={openEdit}
        onDelete={(combo) => setDeleteTarget(combo)}
        onToggleVersion={handleToggleVersion}
      />
      <CommentBlueLinkDialogs
        modalOpen={modalOpen}
        editing={Boolean(editingCombo)}
        accounts={accounts}
        categories={categories}
        formAccountId={formAccountId}
        formCategoryId={formCategoryId}
        formName={formName}
        formSourceLink={formSourceLink}
        formContent={formContent}
        formRemark={formRemark}
        extracting={extracting}
        onModalOpenChange={setModalOpen}
        onAccountChange={setFormAccountId}
        onCategoryChange={setFormCategoryId}
        onNameChange={setFormName}
        onSourceLinkChange={setFormSourceLink}
        onContentChange={setFormContent}
        onRemarkChange={setFormRemark}
        onExtract={handleExtractContent}
        onSave={handleSave}
      />
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open) setDeleteTarget(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除{deleteTarget?.name ? `【${deleteTarget.name}】` : "该项"}吗？该操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
