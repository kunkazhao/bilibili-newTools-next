import { useEffect, useMemo, useRef, useState } from "react"
import { apiRequest } from "@/lib/api"
import { useToast } from "@/components/Toast"
import SchemesDialogs from "@/components/schemes/SchemesDialogs"
import SchemesPageView from "@/components/schemes/SchemesPageView"
import { useListDataPipeline } from "@/hooks/useListDataPipeline"
import type { CategoryItem } from "@/components/archive/types"
import type { Scheme, SchemesPageProps } from "@/components/schemes/types"
import { getUserErrorMessage } from "@/lib/errorMessages"
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "@/components/archive/archiveApi"

const ARCHIVE_CATEGORY_CACHE_KEY = "sourcing_category_cache_v1"

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
export default function SchemesPage({ onEnterScheme }: SchemesPageProps) {
  const { showToast } = useToast()
  const {
    items: schemes,
    status: schemeStatus,
    error: schemeError,
    setItems: setSchemes,
  } = useListDataPipeline<Scheme, { scope: string }, { schemes: Scheme[] }>({
    cacheKey: "schemes",
    ttlMs: 3 * 60 * 1000,
    pageSize: 50,
    initialFilters: { scope: "all" },
    fetcher: async () => apiRequest<{ schemes: Scheme[] }>("/api/schemes"),
    mapResponse: (response) => ({
      items: Array.isArray(response.schemes) ? response.schemes : [],
      pagination: { hasMore: false, nextOffset: response.schemes?.length ?? 0 },
    }),
  })
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [activeParentId, setActiveParentId] = useState("")
  const [activeCategoryId, setActiveCategoryId] = useState("")
  const [isCategoryLoading, setIsCategoryLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState("")
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const categorySaveTokenRef = useRef(0)

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

  const parentCategories = useMemo(
    () =>
      categories
        .filter((category) => !category.parentId)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  )

  const childCategoriesByParent = useMemo(() => {
    const map = new Map<string, CategoryItem[]>()
    categories
      .filter((category) => category.parentId)
      .forEach((category) => {
        const parentId = String(category.parentId)
        if (!map.has(parentId)) {
          map.set(parentId, [])
        }
        map.get(parentId)?.push(category)
      })
    map.forEach((list) =>
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    )
    return map
  }, [categories])

  const activeChildCategories = useMemo(() => {
    if (!activeParentId) return []
    return childCategoriesByParent.get(activeParentId) ?? []
  }, [activeParentId, childCategoriesByParent])

  const childCategoryList = useMemo(
    () =>
      parentCategories.flatMap(
        (parent) => childCategoriesByParent.get(parent.id) ?? []
      ),
    [parentCategories, childCategoriesByParent]
  )

  const filteredSchemes = useMemo(() => {
    if (!activeCategoryId) return []
    return schemes.filter((scheme) => scheme.category_id === activeCategoryId)
  }, [schemes, activeCategoryId])

  const isSchemeLoading =
    schemeStatus === "loading" || schemeStatus === "warmup" || schemeStatus === "refreshing"

  useEffect(() => {
    setStatusMessage("")
    const categoryCache = getCategoryCache()
    const cachedCategories = getCacheData(categoryCache) ?? []

    if (cachedCategories.length) {
      setCategories(cachedCategories)
    }

    setIsCategoryLoading(cachedCategories.length === 0)

    const init = async () => {
      const categoryList = await loadCategories()
      if (categoryList.length) {
        setCategories(categoryList)
        saveCache(ARCHIVE_CATEGORY_CACHE_KEY, categoryList)
      } else if (!cachedCategories.length) {
        setStatusMessage("加载分类失败")
      }
      setIsCategoryLoading(false)
    }

    init().catch(() => {})
  }, [])

  useEffect(() => {
    if (schemeStatus !== "error") return
    if (schemes.length === 0) {
      setStatusMessage("加载方案失败")
    }
    if (schemeError) {
      showToast(schemeError, "error")
    }
  }, [schemeError, schemeStatus, schemes.length, showToast])

  useEffect(() => {
    if (!parentCategories.length) return
    setActiveParentId((prev) =>
      parentCategories.some((item) => item.id === prev) ? prev : parentCategories[0].id
    )
  }, [parentCategories])

  useEffect(() => {
    setActiveCategoryId((prev) => {
      const hasPrev =
        prev.length > 0 && categories.some((category) => category.id === prev && category.parentId)
      if (hasPrev) return prev

      const preferredParentId = activeParentId || parentCategories[0]?.id || ""
      const preferredChildren = preferredParentId
        ? (childCategoriesByParent.get(preferredParentId) ?? [])
        : []
      if (preferredChildren.length > 0) {
        return preferredChildren[0].id
      }

      for (const parent of parentCategories) {
        const children = childCategoriesByParent.get(parent.id) ?? []
        if (children.length > 0) {
          return children[0].id
        }
      }

      return ""
    })
  }, [activeParentId, categories, childCategoriesByParent, parentCategories])

  const loadCategories = async (): Promise<CategoryItem[]> => {
    try {
      const response = await fetchCategories({ includeCounts: false })
      const list = (response.categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order ?? 0,
        specFields: category.spec_fields ?? [],
        count: category.item_count ?? 0,
        parentId: category.parent_id ?? null,
      }))
      return Array.isArray(list) ? list : []
    } catch {
      const cache = getCategoryCache()
      return getCacheData(cache) ?? []
    }
  }

  const handleSaveCategories = (next: CategoryItem[]) => {
    const previousCategories = categories
    const previousCategoryMap = new Map(previousCategories.map((item) => [item.id, item]))
    const existingIds = new Set(previousCategories.map((item) => item.id))
    const nextIds = new Set(next.map((item) => item.id))

    const parents = next.filter((item) => !item.parentId)
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

    setCategories(optimisticCategories)
    saveCache(ARCHIVE_CATEGORY_CACHE_KEY, optimisticCategories)

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
            specFields: created?.spec_fields ?? item.specFields,
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
            specFields: created?.spec_fields ?? item.specFields,
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

        setCategories(persisted)
        saveCache(ARCHIVE_CATEGORY_CACHE_KEY, persisted)

        if (idMap.size > 0) {
          setActiveParentId((prev) => idMap.get(prev) ?? prev)
          setActiveCategoryId((prev) => idMap.get(prev) ?? prev)
          setFormCategoryId((prev) => idMap.get(prev) ?? prev)
        }
      } catch {
        if (saveToken !== categorySaveTokenRef.current) {
          return
        }

        setCategories(previousCategories)
        saveCache(ARCHIVE_CATEGORY_CACHE_KEY, previousCategories)
        showToast("\u5206\u7c7b\u4fdd\u5b58\u5931\u8d25\uff0c\u5df2\u6062\u590d\u4e0a\u4e00\u6b21\u7ed3\u679c", "error")
        const latest = await loadCategories()
        if (latest.length) {
          setCategories(latest)
          saveCache(ARCHIVE_CATEGORY_CACHE_KEY, latest)
        }
      }
    })()
  }

  const openCreate = () => {
    setFormMode("create")
    setEditingSchemeId(null)
    setFormName("")
    setFormCategoryId(activeCategoryId)
    setFormRemark("")
    setFormOpen(true)
  }

  const handleSelectParent = (parentId: string) => {
    setActiveParentId(parentId)
  }

  const handleSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId)
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
        setSchemes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        showToast("方案已更新", "success")
      } else {
        const response = await apiRequest<{ scheme: Scheme }>("/api/schemes", {
          method: "POST",
          body: JSON.stringify({ ...payload, items: [] }),
        })
        const created = response.scheme
        setSchemes((prev) => [created, ...prev])
        if (!activeCategoryId) {
          setActiveCategoryId(created.category_id)
        }
        showToast("方案已创建", "success")
      }
      setFormOpen(false)
    } catch (error) {
      const message = getUserErrorMessage(error, "保存失败")
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
    setSchemes((prev) => prev.filter((item) => item.id !== targetId))
    try {
      await apiRequest(`/api/schemes/${targetId}`, { method: "DELETE" })
      showToast("方案已删除", "success")
    } catch (error) {
      setSchemes(snapshot)
      const message = getUserErrorMessage(error, "删除失败")
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
        parentCategories={parentCategories}
        childCategories={activeChildCategories}
        activeParentId={activeParentId}
        schemes={schemes}
        filteredSchemes={filteredSchemes}
        activeCategoryId={activeCategoryId}
        isCategoryLoading={isCategoryLoading}
        isSchemeLoading={isSchemeLoading}
        statusMessage={statusMessage}
        onCreate={openCreate}
        onManageCategories={() => setIsCategoryManagerOpen(true)}
        onParentSelect={handleSelectParent}
        onCategorySelect={handleSelectCategory}
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
          categories: childCategoryList,
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

