import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { useListDataPipeline } from "@/hooks/useListDataPipeline"
import { getUserErrorMessage } from "@/lib/errorMessages"
import CategoryManagerModal from "@/components/archive/CategoryManagerModal"
import type { CategoryItem } from "@/components/archive/types"
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/components/archive/archiveApi"
import type {
  BenchmarkCategory,
  BenchmarkEntry,
  BenchmarkState,
  VideoInfo,
} from "@/components/benchmark/types"

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""
const EMPTY_STATE: BenchmarkState = { categories: [], entries: [] }

const toCategoryItems = (categories: BenchmarkCategory[]): CategoryItem[] => {
  return categories
    .map((category) => {
      const sortOrderRaw = category.sortOrder ?? category.sort_order
      const parsedSortOrder = Number(sortOrderRaw)
      return {
        id: String(category.id),
        name: category.name || "",
        sortOrder: Number.isFinite(parsedSortOrder) ? parsedSortOrder : 0,
        parentId:
          category.parentId === undefined
            ? (category.parent_id ?? null)
            : category.parentId,
        count: category.count,
      }
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

const toBenchmarkCategories = (categories: CategoryItem[]): BenchmarkCategory[] => {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: null,
    sortOrder: category.sortOrder,
    sort_order: category.sortOrder,
    parentId: category.parentId ?? null,
    parent_id: category.parentId ?? null,
    count: category.count,
  }))
}

const sortByOrder = (a: CategoryItem, b: CategoryItem) =>
  (a.sortOrder ?? 0) - (b.sortOrder ?? 0)

export default function BenchmarkPage() {
  const { showToast } = useToast()
  const fetchBenchmarkState = useCallback(
    async () => apiRequest<BenchmarkState>("/api/benchmark/state"),
    []
  )
  const mapBenchmarkResponse = useCallback((response: BenchmarkState) => {
    const categories = Array.isArray(response.categories) ? response.categories : []
    const entries = Array.isArray(response.entries) ? response.entries : []
    return {
      items: [{ categories, entries }],
      pagination: { hasMore: false, nextOffset: 1 },
    }
  }, [])
  const {
    items: stateItems,
    status,
    error,
    setItems: setStateItems,
    refresh,
  } = useListDataPipeline<BenchmarkState, { scope: string }, BenchmarkState>({
    cacheKey: "benchmark",
    ttlMs: 3 * 60 * 1000,
    pageSize: 1,
    initialFilters: { scope: "all" },
    fetcher: fetchBenchmarkState,
    mapResponse: mapBenchmarkResponse,
  })
  const state = stateItems[0] ?? EMPTY_STATE
  const entries = state.entries
  const categories = useMemo(() => toCategoryItems(state.categories), [state.categories])
  const [activeParentId, setActiveParentId] = useState("")
  const [activeCategoryId, setActiveCategoryId] = useState("")
  const lastErrorRef = useRef<string | null>(null)
  const categorySaveTokenRef = useRef(0)
  const updateState = useCallback(
    (updater: (prev: BenchmarkState) => BenchmarkState) => {
      setStateItems((prev) => {
        const current = prev[0] ?? EMPTY_STATE
        return [updater(current)]
      })
    },
    [setStateItems]
  )
  const isLoading = status === "loading" || status === "warmup"

  const parentCategories = useMemo(
    () => categories.filter((item) => !item.parentId).slice().sort(sortByOrder),
    [categories]
  )

  const childCategoriesByParent = useMemo(() => {
    const map = new Map<string, CategoryItem[]>()
    categories.forEach((item) => {
      if (!item.parentId) return
      const parentId = String(item.parentId)
      if (!map.has(parentId)) {
        map.set(parentId, [])
      }
      map.get(parentId)?.push(item)
    })
    map.forEach((list) => list.sort(sortByOrder))
    return map
  }, [categories])

  const childCategoryList = useMemo(
    () =>
      parentCategories.flatMap(
        (parent) => childCategoriesByParent.get(parent.id) ?? []
      ),
    [childCategoriesByParent, parentCategories]
  )

  useEffect(() => {
    if (status !== "error" || !error) return
    if (lastErrorRef.current === error) return
    lastErrorRef.current = error
    showToast(error, "error")
  }, [error, showToast, status])

  useEffect(() => {
    if (!parentCategories.length) {
      setActiveParentId("")
      return
    }
    setActiveParentId((prev) => {
      if (prev && parentCategories.some((category) => category.id === prev)) {
        return prev
      }
      return parentCategories[0]?.id ?? ""
    })
  }, [parentCategories])

  useEffect(() => {
    if (!activeParentId) {
      setActiveCategoryId("")
      return
    }
    const activeChildren = childCategoriesByParent.get(activeParentId) ?? []
    setActiveCategoryId((prev) => {
      if (prev && activeChildren.some((category) => category.id === prev)) {
        return prev
      }
      return activeChildren[0]?.id ?? ""
    })
  }, [activeParentId, childCategoriesByParent])

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

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  const [entryToDelete, setEntryToDelete] = useState<BenchmarkEntry | null>(null)

  const [subtitleOpen, setSubtitleOpen] = useState(false)
  const [subtitleLoading, setSubtitleLoading] = useState(false)
  const [subtitleText, setSubtitleText] = useState("")

  const selectableCategories = useMemo<BenchmarkCategory[]>(
    () =>
      childCategoryList.map((item) => ({
        id: item.id,
        name: item.name,
        color: pickCategoryColor(item.name, item.id),
      })),
    [childCategoryList]
  )

  useEffect(() => {
    if (!addOpen) return
    if (
      addCategoryId &&
      selectableCategories.some((category) => String(category.id) === addCategoryId)
    ) {
      return
    }
    setAddCategoryId(String(selectableCategories[0]?.id ?? ""))
  }, [addCategoryId, addOpen, selectableCategories])

  useEffect(() => {
    if (!editing) return
    if (
      editCategoryId &&
      selectableCategories.some((category) => String(category.id) === editCategoryId)
    ) {
      return
    }
    setEditCategoryId(String(selectableCategories[0]?.id ?? ""))
  }, [editCategoryId, editing, selectableCategories])

  const filteredEntries = useMemo(() => {
    if (!activeCategoryId) return []
    return entries.filter(
      (entry) => String(entry.category_id || "") === activeCategoryId
    )
  }, [activeCategoryId, entries])

  const openAddDialog = () => {
    if (!childCategoryList.length) {
      showToast("请先维护分类", "info")
      setIsCategoryManagerOpen(true)
      return
    }
    setAddLinks("")
    setAddNote("")
    const preferred =
      activeCategoryId || String(childCategoryList[0]?.id || "")
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
    const lines = addLinks
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) {
      showToast("请输入视频链接或 BV 号", "error")
      return
    }
    if (!addCategoryId) {
      showToast("请选择分类", "error")
      return
    }

    setAddSubmitting(true)
    const failed: string[] = []
    const created: BenchmarkEntry[] = []

    try {
      for (const line of lines) {
        try {
          const info = await fetchVideoInfo(line)
          const payload = {
            category_id: addCategoryId,
            title: info.title || line,
            link: info.link || line,
            bvid: info.bvid || null,
            cover: info.cover || null,
            author: info.author || info.owner?.name || null,
            duration: info.duration || null,
            pub_time: info.pubdate || null,
            note: addNote.trim() || null,
            owner: info.owner || {},
            stats: info.stat || {},
            payload: info,
            page: 1,
          }
          const data = await apiRequest<{ entry?: BenchmarkEntry }>(
            "/api/benchmark/entries",
            {
              method: "POST",
              body: JSON.stringify(payload),
            }
          )
          if (data?.entry) {
            created.push(data.entry)
          }
        } catch {
          failed.push(line)
        }
      }

      if (created.length) {
        updateState((prev) => ({
          ...prev,
          entries: [...created, ...prev.entries],
        }))
        showToast(`成功添加 ${created.length} 条视频`, "success")
      }

      if (failed.length) {
        showToast(`以下链接处理失败：${failed.join("、")}`, "error")
      }

      if (created.length) {
        setAddOpen(false)
      }
    } finally {
      setAddSubmitting(false)
    }
  }

  const openEditDialog = (entry: BenchmarkEntry) => {
    if (!childCategoryList.length) {
      showToast("请先维护分类", "info")
      setIsCategoryManagerOpen(true)
      return
    }
    setEditing(entry)
    setEditTitle(entry.title || "")
    const preferred =
      String(entry.category_id || "") ||
      activeCategoryId ||
      String(childCategoryList[0]?.id || "")
    setEditCategoryId(preferred)
    setEditNote(entry.note || "")
  }

  const handleEditSubmit = async () => {
    if (!editing || editSubmitting) return
    if (!editTitle.trim()) {
      showToast("标题不能为空", "error")
      return
    }
    if (!editCategoryId) {
      showToast("请选择分类", "error")
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
        updateState((prev) => ({
          ...prev,
          entries: prev.entries.map((item) =>
            item.id === data.entry?.id ? data.entry : item
          ),
        }))
      } else {
        updateState((prev) => ({
          ...prev,
          entries: prev.entries.map((item) =>
            item.id === editing.id ? { ...item, ...payload } : item
          ),
        }))
      }
      showToast("已更新视频信息", "success")
      setEditing(null)
    } catch (error) {
      const message = getUserErrorMessage(error, "更新失败")
      showToast(message, "error")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return
    try {
      await apiRequest(`/api/benchmark/entries/${entryToDelete.id}`, {
        method: "DELETE",
      })
      updateState((prev) => ({
        ...prev,
        entries: prev.entries.filter((item) => item.id !== entryToDelete.id),
      }))
      showToast("\u5df2\u5220\u9664\u8be5\u89c6\u9891", "success")
    } catch (error) {
      const message = getUserErrorMessage(error, "\u5220\u9664\u5931\u8d25")
      showToast(message, "error")
    } finally {
      setEntryToDelete(null)
    }
  }

  const handleSaveCategories = (next: CategoryItem[]) => {
    const previousCategories = categories
    const previousCategoryMap = new Map(
      previousCategories.map((item) => [item.id, item])
    )
    const existingIds = new Set(previousCategories.map((item) => item.id))
    const nextIds = new Set(next.map((item) => item.id))

    const parents = next.filter((item) => !item.parentId).slice().sort(sortByOrder)
    const childrenByParent = new Map<string, CategoryItem[]>()
    next
      .filter((item) => item.parentId)
      .forEach((item) => {
        const parentId = String(item.parentId)
        if (!childrenByParent.has(parentId)) {
          childrenByParent.set(parentId, [])
        }
        childrenByParent.get(parentId)?.push(item)
      })
    childrenByParent.forEach((list) => list.sort(sortByOrder))

    const normalized: CategoryItem[] = [
      ...parents.map((item, index) => ({
        ...item,
        parentId: null,
        sortOrder: (index + 1) * 10,
      })),
      ...Array.from(childrenByParent.entries()).flatMap(([parentId, list]) =>
        list.map((item, index) => ({
          ...item,
          parentId,
          sortOrder: (index + 1) * 10,
        }))
      ),
    ]

    const optimisticCategories = normalized.map((item) => ({
      ...item,
      count: previousCategoryMap.get(item.id)?.count ?? item.count ?? 0,
    }))

    updateState((prev) => ({
      ...prev,
      categories: toBenchmarkCategories(optimisticCategories),
    }))

    const saveToken = ++categorySaveTokenRef.current

    void (async () => {
      try {
        const idMap = new Map<string, string>()
        const persisted: CategoryItem[] = []

        const parentQueue = normalized.filter((item) => !item.parentId)
        const childQueue = normalized.filter((item) => item.parentId)

        for (const item of parentQueue) {
          if (existingIds.has(item.id)) {
            await updateCategory(item.id, {
              name: item.name,
              sort_order: item.sortOrder,
              parent_id: null,
            })
            persisted.push({
              ...item,
              parentId: null,
              count: previousCategoryMap.get(item.id)?.count ?? item.count ?? 0,
            })
            continue
          }

          const response = await createCategory({
            name: item.name,
            sort_order: item.sortOrder,
            parent_id: null,
          })
          const created = response?.category
          const createdId = created?.id ? String(created.id) : item.id
          if (createdId !== item.id) {
            idMap.set(item.id, createdId)
          }
          persisted.push({
            ...item,
            id: createdId,
            parentId: null,
            sortOrder: created?.sort_order ?? item.sortOrder,
            count: created?.item_count ?? item.count ?? 0,
          })
        }

        for (const item of childQueue) {
          const resolvedParentId = item.parentId
            ? (idMap.get(item.parentId) ?? item.parentId)
            : null

          if (existingIds.has(item.id)) {
            await updateCategory(item.id, {
              name: item.name,
              sort_order: item.sortOrder,
              parent_id: resolvedParentId,
            })
            persisted.push({
              ...item,
              parentId: resolvedParentId,
              count: previousCategoryMap.get(item.id)?.count ?? item.count ?? 0,
            })
            continue
          }

          const response = await createCategory({
            name: item.name,
            sort_order: item.sortOrder,
            parent_id: resolvedParentId,
          })
          const created = response?.category
          const createdId = created?.id ? String(created.id) : item.id
          if (createdId !== item.id) {
            idMap.set(item.id, createdId)
          }
          persisted.push({
            ...item,
            id: createdId,
            parentId: created?.parent_id ?? resolvedParentId,
            sortOrder: created?.sort_order ?? item.sortOrder,
            count: created?.item_count ?? item.count ?? 0,
          })
        }

        await Promise.all(
          previousCategories
            .filter((item) => !nextIds.has(item.id))
            .map((item) => deleteCategory(item.id))
        )

        if (saveToken !== categorySaveTokenRef.current) {
          return
        }

        updateState((prev) => ({
          ...prev,
          categories: toBenchmarkCategories(persisted),
        }))

        if (idMap.size > 0) {
          setActiveParentId((prev) => idMap.get(prev) ?? prev)
          setActiveCategoryId((prev) => idMap.get(prev) ?? prev)
          setAddCategoryId((prev) => idMap.get(prev) ?? prev)
          setEditCategoryId((prev) => idMap.get(prev) ?? prev)
        }
      } catch {
        if (saveToken !== categorySaveTokenRef.current) {
          return
        }

        updateState((prev) => ({
          ...prev,
          categories: toBenchmarkCategories(previousCategories),
        }))
        showToast("分类保存失败，已恢复上一次结果", "error")
        await refresh()
      }
    })()
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
      const message = getUserErrorMessage(error, "获取字幕失败")
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
      showToast("\u6682\u65e0\u5b57\u5e55\u5185\u5bb9", "info")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast("\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f", "success")
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
        showToast("\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f", "success")
      } catch {
        showToast("\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236", "error")
      }
    }
  }

  return (
    <>
      <BenchmarkPageView
        isLoading={isLoading}
        categories={categories}
        parentCategories={parentCategories}
        activeParentId={activeParentId}
        activeCategoryId={activeCategoryId}
        entries={filteredEntries}
        onParentSelect={setActiveParentId}
        onCategorySelect={setActiveCategoryId}
        onAddClick={openAddDialog}
        onManageCategories={() => setIsCategoryManagerOpen(true)}
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
          categories: selectableCategories,
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
          categories: selectableCategories,
          onClose: () => setEditing(null),
          onTitleChange: setEditTitle,
          onCategoryChange: setEditCategoryId,
          onNoteChange: setEditNote,
          onSubmit: handleEditSubmit,
        }}
        confirmDialogs={{
          entry: entryToDelete,
          onEntryCancel: () => setEntryToDelete(null),
          onEntryConfirm: handleDeleteEntry,
        }}
      />
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        categories={categories}
        onClose={() => setIsCategoryManagerOpen(false)}
        onSave={handleSaveCategories}
      />
    </>
  )
}
