import { useEffect, useMemo, useState } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import Skeleton from "@/components/Skeleton"
import { useToast } from "@/components/Toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { apiRequest } from "@/lib/api"

const CATEGORY_PALETTE = [
  "#6c82ff",
  "#58c1ff",
  "#35b9a5",
  "#f4b23c",
  "#f25f8b",
  "#9b8cfa",
  "#7bd36d",
  "#ff8a65",
]

const COVER_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect fill='%23101828' width='320' height='180'/><text x='50%' y='50%' dy='.35em' fill='%23ffffff' font-size='20' font-family='sans-serif' text-anchor='middle'>No Cover</text></svg>"

type BenchmarkCategory = {
  id: string
  name: string
  color?: string | null
}

type BenchmarkEntry = {
  id: string
  category_id?: string | null
  title?: string | null
  link?: string | null
  bvid?: string | null
  cover?: string | null
  author?: string | null
  duration?: number | null
  pub_time?: string | number | null
  note?: string | null
  owner?: { name?: string }
  stats?: { view?: number; like?: number; reply?: number }
}

type BenchmarkState = {
  categories: BenchmarkCategory[]
  entries: BenchmarkEntry[]
}

type VideoInfo = {
  status: string
  link?: string
  bvid?: string
  title?: string
  cover?: string
  duration?: number
  pubdate?: number
  owner?: { name?: string }
  author?: string
  stat?: { view?: number; like?: number; reply?: number }
}

const hashString = (input: string) => {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const pickCategoryColor = (seed: string, fallbackId?: string | null) => {
  const key = seed || fallbackId || ""
  if (!CATEGORY_PALETTE.length) return "#6c82ff"
  const index = hashString(key) % CATEGORY_PALETTE.length
  return CATEGORY_PALETTE[index]
}

const normalizeCover = (url?: string | null) => {
  if (!url) return ""
  if (url.startsWith("//")) return `https:${url}`
  return url
}

const formatNumber = (value?: number | null) => {
  if (typeof value !== "number") return "--"
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return value.toString()
}

const formatDate = (value?: string | number | null) => {
  if (!value) return "--"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function BenchmarkPage() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<BenchmarkCategory[]>([])
  const [entries, setEntries] = useState<BenchmarkEntry[]>([])
  const [filter, setFilter] = useState("all")
  const [searchValue, setSearchValue] = useState("")

  const [addOpen, setAddOpen] = useState(false)
  const [addLinks, setAddLinks] = useState("")
  const [addCategoryId, setAddCategoryId] = useState("")
  const [addNote, setAddNote] = useState("")
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [editing, setEditing] = useState<BenchmarkEntry | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCategoryId, setEditCategoryId] = useState("")
  const [editNote, setEditNote] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryInput, setCategoryInput] = useState("")
  const [categorySubmitting, setCategorySubmitting] = useState(false)
  const [categoryUpdatingId, setCategoryUpdatingId] = useState<string | null>(null)

  const [entryToDelete, setEntryToDelete] = useState<BenchmarkEntry | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<BenchmarkCategory | null>(null)

  const categoryMap = useMemo(() => {
    return new Map(categories.map((item) => [String(item.id), item]))
  }, [categories])

  const filteredEntries = useMemo(() => {
    const keyword = searchValue.trim()
    return entries.filter((entry) => {
      if (filter !== "all" && String(entry.category_id || "") !== filter) return false
      if (!keyword) return true
      const title = entry.title || ""
      const author = entry.author || entry.owner?.name || ""
      const note = entry.note || ""
      return title.includes(keyword) || author.includes(keyword) || note.includes(keyword)
    })
  }, [entries, filter, searchValue])

  const loadState = async () => {
    setIsLoading(true)
    try {
      const data = await apiRequest<BenchmarkState>("/api/benchmark/state")
      const nextCategories = Array.isArray(data.categories) ? data.categories : []
      const nextEntries = Array.isArray(data.entries) ? data.entries : []
      setCategories(nextCategories)
      setEntries(nextEntries)
      if (filter !== "all") {
        const exists = nextCategories.some((cat) => String(cat.id) === filter)
        if (!exists) setFilter("all")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载对标数据失败"
      showToast(message, "error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadState().catch(() => {})
  }, [])

  const openAddDialog = () => {
    if (!categories.length) {
      showToast("请先维护一个分类", "info")
      setCategoryOpen(true)
      return
    }
    setAddLinks("")
    setAddNote("")
    const preferred = filter !== "all" ? filter : String(categories[0]?.id || "")
    setAddCategoryId(preferred)
    setAddOpen(true)
  }

  const fetchVideoInfo = async (url: string) => {
    const data = await apiRequest<VideoInfo>("/api/bilibili/video-info", {
      method: "POST",
      body: JSON.stringify({ url }),
    })
    if (data.status !== "success") {
      throw new Error("获取视频信息失败")
    }
    return data
  }

  const handleAddSubmit = async () => {
    if (addSubmitting) return
    const lines = addLinks.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (!lines.length) {
      showToast("请输入视频链接或 BV 号", "error")
      return
    }
    if (!addCategoryId) {
      showToast("请选择分类", "error")
      return
    }
    setAddSubmitting(true)
    try {
      for (const link of lines) {
        const info = await fetchVideoInfo(link)
        const payload = {
          category_id: addCategoryId,
          title: info.title || "",
          link: info.link || link,
          bvid: info.bvid,
          cover: info.cover,
          author: info.owner?.name || info.author || "",
          duration: info.duration,
          pub_time: info.pubdate ?? null,
          note: addNote.trim(),
          owner: info.owner || {},
          stats: info.stat || {},
          payload: info,
        }
        await apiRequest("/api/benchmark/entries", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }
      await loadState()
      showToast("已添加到对标库", "success")
      setAddOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "添加失败"
      showToast(message, "error")
    } finally {
      setAddSubmitting(false)
    }
  }

  const openEditDialog = (entry: BenchmarkEntry) => {
    if (!categories.length) {
      showToast("请先维护一个分类", "info")
      setCategoryOpen(true)
      return
    }
    setEditing(entry)
    setEditTitle(entry.title || "")
    setEditCategoryId(String(entry.category_id || categories[0]?.id || ""))
    setEditNote(entry.note || "")
  }

  const handleEditSubmit = async () => {
    if (!editing || editSubmitting) return
    if (!editTitle.trim()) {
      showToast("标题不能为空", "error")
      return
    }
    setEditSubmitting(true)
    try {
      const payload = {
        title: editTitle.trim(),
        category_id: editCategoryId,
        note: editNote.trim(),
      }
      const data = await apiRequest<{ entry?: BenchmarkEntry }>(
        `/api/benchmark/entries/${editing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      )
      if (data?.entry) {
        setEntries((prev) => prev.map((item) => (item.id === data.entry?.id ? data.entry : item)))
      } else {
        setEntries((prev) =>
          prev.map((item) => (item.id === editing.id ? { ...item, ...payload } : item))
        )
      }
      showToast("已更新视频信息", "success")
      setEditing(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新失败"
      showToast(message, "error")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return
    try {
      await apiRequest(`/api/benchmark/entries/${entryToDelete.id}`, { method: "DELETE" })
      setEntries((prev) => prev.filter((item) => item.id !== entryToDelete.id))
      showToast("已删除该视频", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败"
      showToast(message, "error")
    } finally {
      setEntryToDelete(null)
    }
  }

  const handleCreateCategory = async () => {
    if (categorySubmitting) return
    const raw = categoryInput.trim()
    const names = raw.split(/\s+/).map((name) => name.trim()).filter(Boolean)
    if (!names.length) {
      showToast("请输入分类名称", "error")
      return
    }
    setCategorySubmitting(true)
    const uniqueNames = Array.from(new Set(names))
    const failed: string[] = []
    try {
      for (const name of uniqueNames) {
        const color = pickCategoryColor(name)
        try {
          await apiRequest("/api/benchmark/categories", {
            method: "POST",
            body: JSON.stringify({ name, color }),
          })
        } catch (error) {
          failed.push(name)
        }
      }
      await loadState()
      setCategoryInput("")
      if (failed.length) {
        showToast(`以下分类新增失败：${failed.join("、")}`, "error")
      } else {
        showToast("分类已新增", "success")
      }
    } finally {
      setCategorySubmitting(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return
    const categoryId = String(categoryToDelete.id)
    try {
      await apiRequest(`/api/benchmark/categories/${categoryId}`, { method: "DELETE" })
      setCategories((prev) => prev.filter((item) => String(item.id) !== categoryId))
      setEntries((prev) => prev.filter((entry) => String(entry.category_id || "") !== categoryId))
      if (filter === categoryId) setFilter("all")
      showToast("分类已删除", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除分类失败"
      showToast(message, "error")
    } finally {
      setCategoryToDelete(null)
    }
  }

  const updateCategoryName = async (category: BenchmarkCategory, nextValue: string) => {
    const trimmed = nextValue.trim()
    if (!trimmed) {
      showToast("分类名称不能为空", "error")
      return
    }
    if (trimmed === category.name) return
    const exists = categories.some(
      (item) => String(item.id) !== String(category.id) && item.name.trim() === trimmed
    )
    if (exists) {
      showToast("分类名称重复", "error")
      return
    }
    if (categoryUpdatingId) return
    const keepFilter = filter === String(category.id)
    setCategoryUpdatingId(String(category.id))
    try {
      const color = category.color || pickCategoryColor(trimmed, category.id)
      const data = await apiRequest<{ category?: BenchmarkCategory }>("/api/benchmark/categories", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, color }),
      })
      const created = data?.category
      if (!created?.id) {
        throw new Error("分类更新失败")
      }
      const targetEntries = entries.filter((entry) => String(entry.category_id || "") === String(category.id))
      for (const entry of targetEntries) {
        await apiRequest(`/api/benchmark/entries/${entry.id}`, {
          method: "PATCH",
          body: JSON.stringify({ category_id: created.id }),
        })
      }
      await apiRequest(`/api/benchmark/categories/${category.id}`, { method: "DELETE" })
      await loadState()
      if (keepFilter) setFilter(String(created.id))
      showToast("分类已更新", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "分类更新失败"
      showToast(message, "error")
      await loadState()
    } finally {
      setCategoryUpdatingId(null)
    }
  }

  const getCategoryLabel = (categoryId?: string | null) => {
    if (!categoryId) return "未分类"
    return categoryMap.get(String(categoryId))?.name || "未分类"
  }

  const getCategoryColor = (categoryId?: string | null) => {
    const category = categoryId ? categoryMap.get(String(categoryId)) : undefined
    return category?.color || pickCategoryColor(category?.name || "", category?.id)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">对标视频收集</h2>
            <p className="mt-1 text-sm text-slate-500">
              收集竞品视频链接，记录亮点与分类，便于后续复盘。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={openAddDialog}>添加视频</PrimaryButton>
            <PrimaryButton onClick={() => setCategoryOpen(true)}>分类管理</PrimaryButton>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">分类</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">搜索</span>
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="输入标题/作者/备注"
              className="h-9 w-[240px]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-3 h-3 w-2/3" />
                <Skeleton className="mt-4 h-24 w-full" />
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <Empty title="暂无对标视频" description="点击右上角“添加视频”开始收集。" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEntries.map((entry) => {
              const categoryColor = getCategoryColor(entry.category_id)
              const author = entry.author || entry.owner?.name || "未知作者"
              return (
                <article
                  key={entry.id}
                  className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-slate-300"
                  onClick={() => {
                    if (entry.link) window.open(entry.link, "_blank")
                  }}
                >
                  <div className="relative overflow-hidden rounded-xl bg-slate-900">
                    <img
                      src={normalizeCover(entry.cover) || COVER_PLACEHOLDER}
                      alt={entry.title || ""}
                      className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className="absolute left-3 top-3 rounded-full px-2 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {getCategoryLabel(entry.category_id)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {entry.title || "未命名"}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{author}</span>
                      <span className="opacity-40">·</span>
                      <span>{formatDate(entry.pub_time || null)}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>播放 {formatNumber(entry.stats?.view)}</span>
                      <span>点赞 {formatNumber(entry.stats?.like)}</span>
                      <span>评论 {formatNumber(entry.stats?.reply)}</span>
                    </div>
                    {entry.note ? (
                      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        备注：{entry.note}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditDialog(entry)
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-rose-500 hover:text-rose-600"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEntryToDelete(entry)
                        }}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加对标视频</DialogTitle>
            <DialogDescription>支持粘贴多个链接或 BV 号，每行一个。</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel>视频链接</FieldLabel>
              <FieldContent>
                <Textarea
                  rows={4}
                  value={addLinks}
                  onChange={(event) => setAddLinks(event.target.value)}
                  placeholder="可粘贴多个 B 站链接或 BV 号，每行一个"
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center">
              <FieldLabel className="min-w-[72px]">选择分类</FieldLabel>
              <FieldContent>
                <Select value={addCategoryId} onValueChange={setAddCategoryId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>备注（可选）</FieldLabel>
              <FieldContent>
                <Textarea
                  rows={2}
                  value={addNote}
                  onChange={(event) => setAddNote(event.target.value)}
                  placeholder="填写该视频亮点或竞品策略"
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleAddSubmit} disabled={addSubmitting}>
              {addSubmitting ? "处理中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>编辑对标视频</DialogTitle>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel>标题</FieldLabel>
              <FieldContent>
                <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center">
              <FieldLabel className="min-w-[72px]">分类</FieldLabel>
              <FieldContent>
                <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>备注</FieldLabel>
              <FieldContent>
                <Textarea
                  rows={2}
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button type="button" onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>分类管理</DialogTitle>
            <DialogDescription>支持空格分隔一次新增多个分类。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-[220px] flex-1"
                value={categoryInput}
                onChange={(event) => setCategoryInput(event.target.value)}
                placeholder="例如：键盘 鼠标 耳机"
              />
              <Button type="button" onClick={handleCreateCategory} disabled={categorySubmitting}>
                {categorySubmitting ? "新增中..." : "新增"}
              </Button>
            </div>

            {categories.length === 0 ? (
              <Empty title="暂无分类" description="先新增分类再添加对标视频。" />
            ) : (
              <div className="space-y-2">
                {categories.map((category) => {
                  return (
                    <div key={category.id} className="modal-list-row">
                      <Input
                        className="flex-1"
                        key={`${category.id}-${category.name}`}
                        defaultValue={category.name}
                        disabled={categoryUpdatingId === String(category.id)}
                        onBlur={(event) => updateCategoryName(category, event.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setCategoryToDelete(category)}
                      >
                        删除
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(entryToDelete)}
        onOpenChange={(open) => {
          if (!open) setEntryToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除对标视频</AlertDialogTitle>
            <AlertDialogDescription>确认删除该对标视频吗？该操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => {
          if (!open) setCategoryToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              删除分类后，该分类下的对标视频也会被移除。确认删除吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
