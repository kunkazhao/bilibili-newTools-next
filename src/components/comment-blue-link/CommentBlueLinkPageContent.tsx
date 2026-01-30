import { startTransition, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { buildComboContent, getPinnedComments, isBilibiliInput } from "@/lib/bilibili"
import CommentBlueLinkDialogs from "./CommentBlueLinkDialogs"
import CommentBlueLinkPageView from "./CommentBlueLinkPageView"
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

const COMMENT_BLUE_LINK_CACHE_KEY = "comment_blue_link_cache_v1"
const COMMENT_BLUE_LINK_CACHE_TTL = 5 * 60 * 1000
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

  const accountCategories = useMemo(() => {
    if (!currentAccountId) return []
    return categories.filter((item) => item.account_id === currentAccountId)
  }, [categories, currentAccountId])

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
        const data = await apiRequest<{
          accounts: CommentAccount[]
          categories: CommentCategory[]
          combos: CommentCombo[]
        }>("/api/comment/blue-links/state")
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

  const handleBatchCopy = async () => {
    if (!filteredCombos.length) {
      showToast("暂无可复制内容", "info")
      return
    }
    const text = filteredCombos
      .map((combo) => {
        const name = combo.name?.trim() ? `【${combo.name.trim()}】` : ""
        const content = combo.content?.trim() || ""
        return [name, content].filter(Boolean).join("\n")
      })
      .filter(Boolean)
      .join("\n\n")
    if (!text) {
      showToast("暂无可复制内容", "info")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast("已复制到剪贴板", "success")
    } catch {
      try {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
        showToast("已复制到剪贴板", "success")
      } catch {
        showToast("复制失败，请手动复制", "error")
      }
    }
  }

  const handleCopyCombo = async (combo: CommentCombo) => {
    const text = (combo.content || "").trim()
    if (!text) {
      showToast("暂无可复制内容", "info")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast("复制成功", "success")
    } catch {
      try {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
        showToast("复制成功", "success")
      } catch {
        showToast("复制失败，请手动复制", "error")
      }
    }
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


  const combosCountByAccount = combosIndex.counts

  return (
    <>
      <CommentBlueLinkPageView
        loading={loading}
        listLoading={listLoading}
        accounts={accounts}
        currentAccountId={currentAccountId}
        currentCategoryId={currentCategoryId}
        allCategoryId={ALL_CATEGORY_ID}
        accountCategories={accountCategories}
        filteredCombos={filteredCombos}
        visibleCombos={visibleCombos}
        combosCountByAccount={combosCountByAccount}
        onAccountChange={setCurrentAccountId}
        onCategoryChange={setCurrentCategoryId}
        onBatchCopy={handleBatchCopy}
        onCopyCombo={handleCopyCombo}
        onOpenCreate={openCreate}
        onOpenEdit={openEdit}
        onDelete={(combo) => setDeleteTarget(combo)}
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
