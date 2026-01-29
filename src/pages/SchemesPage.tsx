import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { apiRequest } from "@/lib/api"
import { useToast } from "@/components/Toast"
import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"
import CategoryManagerModal from "@/components/archive/CategoryManagerModal"
import type { CategoryItem } from "@/components/archive/types"
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "@/components/archive/archiveApi"

const ARCHIVE_CATEGORY_CACHE_KEY = "sourcing_category_cache_v1"
const ARCHIVE_CATEGORY_CACHE_TTL = 5 * 60 * 1000
const SCHEME_CACHE_KEY = "scheme_list_cache_v1"
const SCHEME_CACHE_TTL = 5 * 60 * 1000

interface SchemeItem {
  id: string
  title?: string
}

interface Scheme {
  id: string
  name: string
  category_id: string
  category_name?: string
  remark?: string
  created_at?: string
  items?: SchemeItem[]
}


interface SchemesPageProps {
  onEnterScheme: (schemeId: string) => void
}

function formatDate(value?: string) {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

const CategorySkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
      >
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
    ))}
  </div>
)

const SchemeSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
      >
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

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

function isCacheFresh(cache: CachePayload<unknown> | null, ttl: number) {
  if (!cache?.timestamp) return false
  return Date.now() - cache.timestamp < ttl
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
    }
  }

  const showCategorySkeleton = isCategoryLoading && categories.length === 0
  const showSchemeSkeleton = isSchemeLoading && schemes.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>新建方案</Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">方案分类</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">共 {categories.length} 类</span>
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
                type="button"
                onClick={() => setIsCategoryManagerOpen(true)}
              >
                管理
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {showCategorySkeleton ? (
              <CategorySkeleton />
            ) : categories.length === 0 ? (
              <Empty title="暂无分类" description="请先在选品库中新建分类" />
            ) : (
              categories
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((category) => {
                const count = schemes.filter(
                  (scheme) => scheme.category_id === category.id
                ).length
                const active = category.id === activeCategoryId
                return (
                  <button
                    key={category.id}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs text-slate-400">{count} 个方案</span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="space-y-4">
          {statusMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {statusMessage}
            </div>
          ) : null}
          {showSchemeSkeleton ? (
            <SchemeSkeleton />
          ) : activeCategoryId && filteredSchemes.length === 0 ? (
            <Empty title="暂无方案" description="点击右上角新建方案" />
          ) : (
            <div className="space-y-4">
              {filteredSchemes.map((scheme) => {
                const itemCount = Array.isArray(scheme.items) ? scheme.items.length : 0
                return (
                  <article
                    key={scheme.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">
                          分类：{scheme.category_name || categoryMap.get(scheme.category_id) || "--"}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {scheme.name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {scheme.remark?.trim() ? scheme.remark : "暂无备注"}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>创建时间：{formatDate(scheme.created_at)}</span>
                          <span>选品数：{itemCount}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(scheme)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          size="sm"
                          onClick={() => requestDelete(scheme.id)}
                        >
                          删除
                        </Button>
                        <Button size="sm" onClick={() => onEnterScheme(scheme.id)}>
                          进入方案
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {isCategoryManagerOpen ? (
        <CategoryManagerModal
          isOpen={isCategoryManagerOpen}
          categories={categories}
          onClose={() => setIsCategoryManagerOpen(false)}
          onSave={handleSaveCategories}
        />
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{formMode === "edit" ? "编辑方案" : "新建方案"}</DialogTitle>
            <DialogDescription>完善方案信息，方便后续管理。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="horizontal" className="items-start">
              <FieldLabel className="w-20 pt-2">方案名称</FieldLabel>
              <FieldContent className="flex-1">
                <Input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="输入方案名称"
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-start">
              <FieldLabel className="w-20 pt-2">所属分类</FieldLabel>
              <FieldContent className="flex-1">
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-start">
              <FieldLabel className="w-20 pt-2">备注</FieldLabel>
              <FieldContent className="flex-1">
                <Textarea
                  rows={4}
                  value={formRemark}
                  onChange={(event) => setFormRemark(event.target.value)}
                  placeholder="补充说明、适用场景等"
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" type="button" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>保存方案</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>删除方案</DialogTitle>
            <DialogDescription>确认删除该方案吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={handleDelete}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
