import { useEffect, useMemo, useState } from "react"
import { apiRequest } from "@/lib/api"
import { useToast } from "@/components/Toast"
import SchemesDialogs from "@/components/schemes/SchemesDialogs"
import SchemesPageView from "@/components/schemes/SchemesPageView"
import type { CategoryItem } from "@/components/archive/types"
import type { Scheme, SchemesPageProps } from "@/components/schemes/types"
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "@/components/archive/archiveApi"

const ARCHIVE_CATEGORY_CACHE_KEY = "sourcing_category_cache_v1"
const SCHEME_CACHE_KEY = "scheme_list_cache_v1"

type CachePayload<T> = { timestamp: number; data?: T; items?: T }

function getCache<T>(key: string) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as CachePayload<T>
  } catch {
    return null
  }
}

function getCacheData<T>(cache: CachePayload<T> | null) {
  if (!cache) return null
  return (cache.data ?? cache.items ?? null) as T | null
}

function saveCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }))
  } catch {
    // ignore cache failure
  }
}

const getCategoryCache = () => getCache<CategoryItem[]>(ARCHIVE_CATEGORY_CACHE_KEY)
const getSchemeCache = () => getCache<Scheme[]>(SCHEME_CACHE_KEY)

export default function SchemesPage({ onEnterScheme }: SchemesPageProps) {
  const { showToast } = useToast()
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [isCategoryLoading, setIsCategoryLoading] = useState(true)
  const [isSchemeLoading, setIsSchemeLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState("")
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formCategoryId, setFormCategoryId] = useState("")
  const [formRemark, setFormRemark] = useState("")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null)

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((cat) => map.set(cat.id, cat.name))
    return map
  }, [categories])

  const filteredSchemes = useMemo(() => {
    if (!activeCategoryId) return []
    return schemes.filter((scheme) => scheme.category_id === activeCategoryId)
  }, [schemes, activeCategoryId])

  useEffect(() => {
    const schemeCache = getSchemeCache()
    const categoryCache = getCategoryCache()
    const cachedSchemes = getCacheData(schemeCache) ?? []
    const cachedCategories = getCacheData(categoryCache) ?? []

    if (cachedSchemes.length) {
      setSchemes(cachedSchemes)
    }
    if (cachedCategories.length) {
      setCategories(cachedCategories)
    }

    setIsSchemeLoading(cachedSchemes.length === 0)
    setIsCategoryLoading(cachedCategories.length === 0)

    const init = async () => {
      setStatusMessage("")
      const [schemeResult, categoryResult] = await Promise.allSettled([
        apiRequest<{ schemes: Scheme[] }>("/api/schemes"),
        loadCategories(),
      ])

      if (schemeResult.status === "fulfilled") {
        const schemeList = Array.isArray(schemeResult.value.schemes)
          ? schemeResult.value.schemes
          : []
        setSchemes(schemeList)
        saveCache(SCHEME_CACHE_KEY, schemeList)
      } else if (!cachedSchemes.length) {
        setStatusMessage("加载方案失败")
      }

      if (categoryResult.status === "fulfilled") {
        const categoryList = Array.isArray(categoryResult.value)
          ? categoryResult.value
          : []
        setCategories(categoryList)
        saveCache(ARCHIVE_CATEGORY_CACHE_KEY, categoryList)
      } else if (!cachedCategories.length) {
        setStatusMessage("加载分类失败")
      }

      setIsSchemeLoading(false)
      setIsCategoryLoading(false)
    }

    init().catch(() => {})
  }, [])

  useEffect(() => {
    if (!categories.length) return
    setActiveCategoryId((prev) => {
      if (prev && categories.some((cat) => cat.id === prev)) return prev
      return categories[0].id
    })
  }, [categories])

  const loadCategories = async (): Promise<CategoryItem[]> => {
    try {
      const response = await fetchCategories({ includeCounts: false })
      const list = (response.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order ?? 0,
        specFields: category.spec_fields ?? [],
        count: category.item_count ?? 0,
      }))
      return Array.isArray(list) ? list : []
    } catch {
      const cache = getCategoryCache()
      return getCacheData(cache) ?? []
    }
  }

  const handleSaveCategories = (next: CategoryItem[]) => {
    const existingIds = new Set(categories.map((item) => item.id))
    const nextIds = new Set(next.map((item) => item.id))
    const updates = next.map((item, index) => ({
      ...item,
      sortOrder: (index + 1) * 10,
    }))
    const tasks: Promise<unknown>[] = []
    updates.forEach((item) => {
      if (existingIds.has(item.id)) {
        tasks.push(
          updateCategory(item.id, {
            name: item.name,
            sort_order: item.sortOrder,
          })
        )
      } else {
        tasks.push(createCategory({ name: item.name, sort_order: item.sortOrder }))
      }
    })
    categories.forEach((item) => {
      if (!nextIds.has(item.id)) {
        tasks.push(deleteCategory(item.id))
      }
    })
    Promise.all(tasks)
      .then(() => {
        setCategories(updates)
        saveCache(ARCHIVE_CATEGORY_CACHE_KEY, updates)
        showToast("分类已保存", "success")
      })
      .catch(() => showToast("分类保存失败", "error"))
  }

  const openCreate = () => {
    setFormMode("create")
    setEditingSchemeId(null)
    setFormName("")
    setFormCategoryId(activeCategoryId ?? "")
    setFormRemark("")
    setFormOpen(true)
  }

  const openEdit = (scheme: Scheme) => {
    setFormMode("edit")
    setEditingSchemeId(scheme.id)
    setFormName(scheme.name)
    setFormCategoryId(scheme.category_id)
    setFormRemark(scheme.remark ?? "")
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    const name = formName.trim()
    const categoryId = formCategoryId
    if (!name) {
      showToast("请输入方案名称", "error")
      return
    }
    if (!categoryId) {
      showToast("请选择所属分类", "error")
      return
    }
    const categoryName = categoryMap.get(categoryId) || ""
    const payload = {
      name,
      category_id: categoryId,
      category_name: categoryName,
      remark: formRemark.trim(),
    }
    try {
      if (formMode === "edit" && editingSchemeId) {
        const response = await apiRequest<{ scheme: Scheme }>(
          `/api/schemes/${editingSchemeId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        )
        const updated = response.scheme
        setSchemes((prev) => {
          const next = prev.map((item) => (item.id === updated.id ? updated : item))
          saveCache(SCHEME_CACHE_KEY, next)
          return next
        })
        showToast("方案已更新", "success")
      } else {
        const response = await apiRequest<{ scheme: Scheme }>("/api/schemes", {
          method: "POST",
          body: JSON.stringify({ ...payload, items: [] }),
        })
        const created = response.scheme
        setSchemes((prev) => {
          const next = [created, ...prev]
          saveCache(SCHEME_CACHE_KEY, next)
          return next
        })
        if (!activeCategoryId) {
          setActiveCategoryId(created.category_id)
        }
        showToast("方案已创建", "success")
      }
      setFormOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败"
      showToast(message, "error")
    }
  }

  const requestDelete = (schemeId: string) => {
    setPendingDeleteId(schemeId)
    setPendingDeleteName(schemes.find((item) => item.id === schemeId)?.name ?? null)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!pendingDeleteId) return
    const targetId = pendingDeleteId
    setDeleteOpen(false)
    const snapshot = schemes
    setSchemes((prev) => {
      const next = prev.filter((item) => item.id !== targetId)
      saveCache(SCHEME_CACHE_KEY, next)
      return next
    })
    try {
      await apiRequest(`/api/schemes/${targetId}`, { method: "DELETE" })
      showToast("方案已删除", "success")
    } catch (error) {
      setSchemes(snapshot)
      saveCache(SCHEME_CACHE_KEY, snapshot)
      const message = error instanceof Error ? error.message : "删除失败"
      showToast(message, "error")
    } finally {
      setPendingDeleteId(null)
      setPendingDeleteName(null)
    }
  }


  return (
    <>
      <SchemesPageView
        categories={categories}
        schemes={schemes}
        filteredSchemes={filteredSchemes}
        activeCategoryId={activeCategoryId}
        isCategoryLoading={isCategoryLoading}
        isSchemeLoading={isSchemeLoading}
        statusMessage={statusMessage}
        onCreate={openCreate}
        onManageCategories={() => setIsCategoryManagerOpen(true)}
        onCategorySelect={setActiveCategoryId}
        onEditScheme={openEdit}
        onDeleteScheme={requestDelete}
        onEnterScheme={onEnterScheme}
      />
      <SchemesDialogs
        categoryManager={{
          open: isCategoryManagerOpen,
          categories,
          onClose: () => setIsCategoryManagerOpen(false),
          onSave: handleSaveCategories,
        }}
        formDialog={{
          open: formOpen,
          mode: formMode,
          name: formName,
          categoryId: formCategoryId,
          remark: formRemark,
          categories,
          onOpenChange: setFormOpen,
          onNameChange: setFormName,
          onCategoryChange: setFormCategoryId,
          onRemarkChange: setFormRemark,
          onSubmit: handleSubmit,
        }}
        deleteDialog={{
          open: deleteOpen,
          name: pendingDeleteName ?? undefined,
          onOpenChange: (open) => {
            setDeleteOpen(open)
            if (!open) {
              setPendingDeleteId(null)
              setPendingDeleteName(null)
            }
          },
          onConfirm: handleDelete,
        }}
      />
    </>
  )
}

