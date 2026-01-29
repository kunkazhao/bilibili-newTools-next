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
import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"

interface CommentAccount {
  id: string
  name: string
}

interface CommentCombo {
  id: string
  account_id: string
  name: string
  source_link?: string
  content?: string
  remark?: string
  created_at?: string
}

const COMMENT_BLUE_LINK_CACHE_KEY = "comment_blue_link_cache_v1"
const COMMENT_BLUE_LINK_CACHE_TTL = 5 * 60 * 1000
const CHUNK_SIZE = 40

type CommentCache = {
  timestamp: number
  accounts: CommentAccount[]
  combos: CommentCombo[]
  currentAccountId?: string | null
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
  const [combos, setCombos] = useState<CommentCombo[]>([])
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [visibleCombos, setVisibleCombos] = useState<CommentCombo[]>([])
  const chunkTimerRef = useRef<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<CommentCombo | null>(null)
  const [formAccountId, setFormAccountId] = useState("")
  const [formName, setFormName] = useState("")
  const [formSourceLink, setFormSourceLink] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formRemark, setFormRemark] = useState("")

  const filteredCombos = useMemo(() => {
    if (!currentAccountId) return []
    return combos.filter((combo) => combo.account_id === currentAccountId)
  }, [combos, currentAccountId])

  useEffect(() => {
    const cache = getCache()
    if (isCacheFresh(cache)) {
      setAccounts(Array.isArray(cache?.accounts) ? cache?.accounts ?? [] : [])
      setCombos(Array.isArray(cache?.combos) ? cache?.combos ?? [] : [])
      setCurrentAccountId(cache?.currentAccountId || cache?.accounts?.[0]?.id || null)
      setLoading(false)
      setListLoading(false)
    }

    const load = async () => {
      setListLoading(true)
      try {
        const data = await apiRequest<{
          accounts: CommentAccount[]
          combos: CommentCombo[]
        }>("/api/comment/blue-links/state")
        const accountList = Array.isArray(data.accounts) ? data.accounts : []
        const comboList = Array.isArray(data.combos) ? data.combos : []
        setAccounts(accountList)
        setCombos(comboList)
        setCurrentAccountId((prev) => prev || accountList[0]?.id || null)
        try {
          localStorage.setItem(
            COMMENT_BLUE_LINK_CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              accounts: accountList,
              combos: comboList,
              currentAccountId: currentAccountId || accountList[0]?.id || null,
            })
          )
        } catch {
          // ignore
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载失败"
        showToast(message, "error")
      } finally {
        setLoading(false)
        setListLoading(false)
      }
    }

    load().catch(() => {})
  }, [currentAccountId, showToast])

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

  const openCreate = () => {
    setEditingCombo(null)
    setFormAccountId(currentAccountId ?? "")
    setFormName("")
    setFormSourceLink("")
    setFormContent("")
    setFormRemark("")
    setModalOpen(true)
  }

  const openEdit = (combo: CommentCombo) => {
    setEditingCombo(combo)
    setFormAccountId(combo.account_id)
    setFormName(combo.name || "")
    setFormSourceLink(combo.source_link || "")
    setFormContent(combo.content || "")
    setFormRemark(combo.remark || "")
    setModalOpen(true)
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
    const payload = {
      account_id: formAccountId,
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
            <h3 className="text-base font-semibold text-slate-900">话术组合</h3>
            <Button onClick={openCreate}>新增组合</Button>
          </div>
        </div>

        {filteredCombos.length === 0 && !listLoading ? (
          <Empty title="暂无话术组合" description="请先新建话术组合" actionLabel="新增" onAction={openCreate} />
        ) : listLoading && visibleCombos.length === 0 ? (
          <CardSkeletons />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleCombos.map((combo) => (
              <article
                key={combo.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{combo.name}</p>
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
            ))}
          </div>
        )}
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{editingCombo ? "编辑话术组合" : "新增话术组合"}</DialogTitle>
            <DialogDescription>用于评论区蓝链话术</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={formAccountId} onValueChange={setFormAccountId}>
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
            <Input
              placeholder="组合名称"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
            />
            <Input
              placeholder="来源链接"
              value={formSourceLink}
              onChange={(event) => setFormSourceLink(event.target.value)}
            />
            <Textarea
              rows={5}
              placeholder="话术内容"
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
