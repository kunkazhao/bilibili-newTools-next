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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { buildComboContent, getPinnedComments, isBilibiliInput } from "@/lib/bilibili"
import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"

interface CommentAccount {
  id: string
  name: string
}

interface CommentCategory {
  id: string
  account_id: string
  name: string
  color?: string | null
}

interface CommentCombo {
  id: string
  account_id: string
  category_id?: string | null
  name: string
  source_link?: string
  content?: string
  remark?: string
  created_at?: string
  updated_at?: string
}

const COMMENT_BLUE_LINK_CACHE_KEY = "comment_blue_link_cache_v1"
const COMMENT_BLUE_LINK_CACHE_TTL = 5 * 60 * 1000
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

const SidebarSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-8" />
      </div>
    ))}
  </div>
)

const CardSkeletons = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
      >
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-3/4" />
        <Skeleton className="mt-4 h-8 w-24" />
      </div>
    ))}
  </div>
)

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

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<CommentCombo | null>(null)
  const [formAccountId, setFormAccountId] = useState("")
  const [formCategoryId, setFormCategoryId] = useState("")
  const [formName, setFormName] = useState("")
  const [formSourceLink, setFormSourceLink] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formRemark, setFormRemark] = useState("")
  const [extracting, setExtracting] = useState(false)

  const categoryMap = useMemo(() => {
    return new Map(categories.map((item) => [item.id, item]))
  }, [categories])

  const accountCategories = useMemo(() => {
    if (!currentAccountId) return []
    return categories.filter((item) => item.account_id === currentAccountId)
  }, [categories, currentAccountId])

  const filteredCombos = useMemo(() => {
    if (!currentAccountId) return []
    return combos.filter((combo) => {
      if (combo.account_id !== currentAccountId) return false
      if (currentCategoryId && currentCategoryId !== ALL_CATEGORY_ID) {
        return combo.category_id === currentCategoryId
      }
      return true
    })
  }, [combos, currentAccountId, currentCategoryId])

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
    if (isCacheFresh(cache)) {
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
      setListLoading(true)
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
        setCombos(comboList)
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
    persistCache()
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

  if (loading && !accounts.length && !combos.length) {
    return (
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="mt-4">
            <SidebarSkeleton />
          </div>
        </aside>
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <CardSkeletons />
        </section>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">评论账号</h3>
          <span className="text-xs text-slate-400">{accounts.length} 个</span>
        </div>
        <div className="mt-4 space-y-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                currentAccountId === account.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              type="button"
              onClick={() => setCurrentAccountId(account.id)}
            >
              <span>{account.name}</span>
              <span className="text-xs text-slate-400">
                {combos.filter((combo) => combo.account_id === account.id).length}
              </span>
            </button>
          ))}
          {listLoading && accounts.length === 0 ? <SidebarSkeleton /> : null}
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${
                  currentCategoryId === ALL_CATEGORY_ID
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-slate-200 text-slate-500"
                }`}
                onClick={() => setCurrentCategoryId(ALL_CATEGORY_ID)}
              >
                全部
              </button>
              {accountCategories.map((category) => (
                <button
                  key={category.id}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    currentCategoryId === category.id
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-slate-200 text-slate-500"
                  }`}
                  type="button"
                  onClick={() => setCurrentCategoryId(category.id)}
                >
                  {category.name}
                </button>
              ))}
              {!accountCategories.length ? (
                <span className="text-xs text-slate-400">该账号暂无分类</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleBatchCopy} disabled={!filteredCombos.length}>
                批量复制
              </Button>
              <Button onClick={openCreate}>新增组合</Button>
            </div>
          </div>
        </div>

        {filteredCombos.length === 0 && !listLoading ? (
          <Empty
            title="暂无蓝链组合"
            description="请先新增蓝链评论组合"
            actionLabel="新增"
            onAction={openCreate}
          />
        ) : listLoading && visibleCombos.length === 0 ? (
          <CardSkeletons />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleCombos.map((combo) => {
              const category = combo.category_id ? categoryMap.get(combo.category_id) : null
              return (
                <article
                  key={combo.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{combo.name}</p>
                        {category ? (
                          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                            {category.name}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500 break-all">
                        {combo.source_link || "--"}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-3">
                        {combo.content || "暂无内容"}
                      </p>
                      <p className="text-xs text-slate-400">备注：{combo.remark || "--"}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(combo)}>
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleDelete(combo)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{editingCombo ? "编辑蓝链组合" : "新增蓝链组合"}</DialogTitle>
            <DialogDescription>用于评论区蓝链评论</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={formAccountId}
              onValueChange={setFormAccountId}
              disabled={Boolean(editingCombo)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择账号" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={formCategoryId}
              onValueChange={setFormCategoryId}
              disabled={Boolean(editingCombo)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((item) => item.account_id === formAccountId)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="组合名称"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="来源链接"
                  value={formSourceLink}
                  onChange={(event) => setFormSourceLink(event.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleExtractContent}
                  disabled={extracting}
                >
                  {extracting ? "提取中..." : "一键提取"}
                </Button>
              </div>
              <p className="text-xs text-slate-400">支持B站链接/BV号，提取置顶评论内容</p>
            </div>
            <Textarea
              rows={5}
              placeholder="评论内容"
              value={formContent}
              onChange={(event) => setFormContent(event.target.value)}
            />
            <Textarea
              rows={3}
              placeholder="备注"
              value={formRemark}
              onChange={(event) => setFormRemark(event.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
