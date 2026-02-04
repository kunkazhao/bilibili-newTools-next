import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"
import { Button } from "@/components/ui/button"
import { InteractiveCard } from "@/components/ui/interactive-card"
import type { CategoryItem } from "@/components/archive/types"
import type { Scheme } from "@/components/schemes/types"
import { Pencil, Settings, Trash2 } from "lucide-react"

type SchemesPageViewProps = {
  categories: CategoryItem[]
  schemes: Scheme[]
  filteredSchemes: Scheme[]
  activeCategoryId: string | null
  isCategoryLoading: boolean
  isSchemeLoading: boolean
  statusMessage: string
  onCreate: () => void
  onManageCategories: () => void
  onCategorySelect: (categoryId: string) => void
  onEditScheme: (scheme: Scheme) => void
  onDeleteScheme: (schemeId: string) => void
  onEnterScheme: (schemeId: string) => void
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
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
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

const formatDate = (value?: string) => {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export default function SchemesPageView({
  categories,
  schemes,
  filteredSchemes,
  activeCategoryId,
  isCategoryLoading,
  isSchemeLoading,
  statusMessage,
  onCreate,
  onManageCategories,
  onCategorySelect,
  onEditScheme,
  onDeleteScheme,
  onEnterScheme,
}: SchemesPageViewProps) {
  const showCategorySkeleton = isCategoryLoading && categories.length === 0
  const showSchemeSkeleton = isSchemeLoading && schemes.length === 0

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">方案分类</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500"
              onClick={onManageCategories}
              aria-label="分类管理"
            >
              <Settings className="h-4 w-4" />
            </Button>
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
                      onClick={() => onCategorySelect(category.id)}
                    >
                      <span>{category.name}</span>
                    </button>
                  )
                })
            )}
          </div>
        </section>

        <section className="space-y-4" data-testid="schemes-list">
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
            data-testid="schemes-create-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={onCreate}>新建方案</Button>
              </div>
            </div>
          </div>
          {statusMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {statusMessage}
            </div>
          ) : null}
          {showSchemeSkeleton ? (
            <SchemeSkeleton />
          ) : activeCategoryId && filteredSchemes.length === 0 ? (
            <Empty title="暂无方案" description="点击右侧新建方案" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="schemes-card-grid">
              {filteredSchemes.map((scheme) => {
                const itemCount = Array.isArray(scheme.items) ? scheme.items.length : 0
                return (
                  <InteractiveCard asChild interactive key={scheme.id}>
                    <article
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`进入方案 ${scheme.name}`}
                    onClick={() => onEnterScheme(scheme.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onEnterScheme(scheme.id)
                      }
                    }}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-500"
                          onClick={(event) => {
                            event.stopPropagation()
                            onEditScheme(scheme)
                          }}
                          aria-label="编辑方案"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-500 hover:text-rose-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            onDeleteScheme(scheme.id)
                          }}
                          aria-label="删除方案"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </article>
                </InteractiveCard>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}





