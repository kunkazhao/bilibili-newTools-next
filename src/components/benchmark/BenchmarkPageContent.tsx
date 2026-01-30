import { useEffect, useMemo, useState } from "react"
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import {
  fetchSubtitle,
  formatSubtitleText,
  isValidBilibiliUrl,
} from "@/lib/subtitle"
import BenchmarkDialogs from "@/components/benchmark/BenchmarkDialogs"
import BenchmarkPageView from "@/components/benchmark/BenchmarkPageView"
import { pickCategoryColor } from "@/components/benchmark/benchmarkUtils"
import type {
  BenchmarkCategory,
  BenchmarkEntry,
  BenchmarkState,
  VideoInfo,
} from "@/components/benchmark/types"

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

export default function BenchmarkPage() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<BenchmarkCategory[]>([])
  const [entries, setEntries] = useState<BenchmarkEntry[]>([])
  const [filter, setFilter] = useState("all")

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

  const [subtitleOpen, setSubtitleOpen] = useState(false)
  const [subtitleLoading, setSubtitleLoading] = useState(false)
  const [subtitleText, setSubtitleText] = useState("")

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filter !== "all" && String(entry.category_id || "") !== filter) return false
      return true
    })
  }, [entries, filter])

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
        } catch {
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

  const openSubtitleDialog = async (link: string) => {
    if (subtitleLoading) return
    setSubtitleOpen(true)
    setSubtitleText("")
    setSubtitleLoading(true)
    try {
      const subtitleData = await fetchSubtitle(API_BASE, link)
      const text = formatSubtitleText(subtitleData)
      setSubtitleText(text)
      if (text) {
        showToast("字幕已获取", "success")
      } else {
        showToast("未获取到字幕内容", "info")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取字幕失败"
      showToast(message, "error")
    } finally {
      setSubtitleLoading(false)
    }
  }

  const handleOpenSubtitle = (entry: BenchmarkEntry) => {
    const link = entry.link?.trim() || ""
    if (!link) {
      showToast("缺少视频链接，无法取字幕", "error")
      return
    }
    if (!isValidBilibiliUrl(link)) {
      showToast("请输入有效的 B 站链接或 BV 号", "error")
      return
    }
    openSubtitleDialog(link).catch(() => {})
  }

  const handleCopySubtitle = async () => {
    const text = subtitleText.trim()
    if (!text) {
      showToast("暂无字幕内容", "info")
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


  return (
    <>
      <BenchmarkPageView
        isLoading={isLoading}
        categories={categories}
        entries={filteredEntries}
        filter={filter}
        onFilterChange={setFilter}
        onAddClick={openAddDialog}
        onManageCategories={() => setCategoryOpen(true)}
        onEditEntry={openEditDialog}
        onDeleteEntry={setEntryToDelete}
        onOpenSubtitle={handleOpenSubtitle}
      />
      <BenchmarkDialogs
        subtitleDialog={{
          open: subtitleOpen,
          loading: subtitleLoading,
          text: subtitleText,
          onOpenChange: (open) => {
            setSubtitleOpen(open)
            if (!open) {
              setSubtitleLoading(false)
              setSubtitleText("")
            }
          },
          onCopy: handleCopySubtitle,
        }}
        addDialog={{
          open: addOpen,
          links: addLinks,
          categoryId: addCategoryId,
          note: addNote,
          submitting: addSubmitting,
          categories,
          onOpenChange: setAddOpen,
          onLinksChange: setAddLinks,
          onCategoryChange: setAddCategoryId,
          onNoteChange: setAddNote,
          onSubmit: handleAddSubmit,
        }}
        editDialog={{
          entry: editing,
          title: editTitle,
          categoryId: editCategoryId,
          note: editNote,
          submitting: editSubmitting,
          categories,
          onClose: () => setEditing(null),
          onTitleChange: setEditTitle,
          onCategoryChange: setEditCategoryId,
          onNoteChange: setEditNote,
          onSubmit: handleEditSubmit,
        }}
        categoryDialog={{
          open: categoryOpen,
          input: categoryInput,
          submitting: categorySubmitting,
          updatingId: categoryUpdatingId,
          categories,
          onOpenChange: setCategoryOpen,
          onInputChange: setCategoryInput,
          onSubmit: handleCreateCategory,
          onUpdateName: updateCategoryName,
          onRequestDelete: setCategoryToDelete,
        }}
        confirmDialogs={{
          entry: entryToDelete,
          category: categoryToDelete,
          onEntryCancel: () => setEntryToDelete(null),
          onCategoryCancel: () => setCategoryToDelete(null),
          onEntryConfirm: handleDeleteEntry,
          onCategoryConfirm: handleDeleteCategory,
        }}
      />
    </>
  )
}




