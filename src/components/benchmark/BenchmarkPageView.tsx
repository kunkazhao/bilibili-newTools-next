import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"
import CategoryHierarchy from "@/components/archive/CategoryHierarchy"
import { Button } from "@/components/ui/button"
import { InteractiveCard } from "@/components/ui/interactive-card"
import { Settings } from "lucide-react"
import {
  COVER_PLACEHOLDER,
  formatDate,
  formatDuration,
  formatNumber,
  normalizeCover,
  pickCategoryColor,
} from "@/components/benchmark/benchmarkUtils"
import type { CategoryItem } from "@/components/archive/types"
import type { BenchmarkEntry } from "@/components/benchmark/types"

type BenchmarkPageViewProps = {
  isLoading: boolean
  categories: CategoryItem[]
  parentCategories: CategoryItem[]
  activeParentId: string
  activeCategoryId: string
  entries: BenchmarkEntry[]
  onParentSelect: (categoryId: string) => void
  onCategorySelect: (categoryId: string) => void
  onAddClick: () => void
  onManageCategories: () => void
  onOpenSubtitle: (entry: BenchmarkEntry) => void
  onEditEntry: (entry: BenchmarkEntry) => void
  onDeleteEntry: (entry: BenchmarkEntry) => void
}

export default function BenchmarkPageView({
  isLoading,
  categories,
  parentCategories,
  activeParentId,
  activeCategoryId,
  entries,
  onParentSelect,
  onCategorySelect,
  onAddClick,
  onManageCategories,
  onOpenSubtitle,
  onEditEntry,
  onDeleteEntry,
}: BenchmarkPageViewProps) {
  const showCategorySkeleton = isLoading && categories.length === 0
  const categoryMap = new Map(categories.map((item) => [String(item.id), item]))

  const getCategoryLabel = (categoryId?: string | null) => {
    if (!categoryId) return "\u672a\u5206\u7c7b"
    return categoryMap.get(String(categoryId))?.name || "\u672a\u5206\u7c7b"
  }

  const getCategoryColor = (categoryId?: string | null) => {
    const category = categoryId ? categoryMap.get(String(categoryId)) : undefined
    return pickCategoryColor(category?.name || "", category?.id)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">{"\u5bf9\u6807\u5206\u7c7b"}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500"
              onClick={onManageCategories}
              aria-label={"\u5206\u7c7b\u7ba1\u7406"}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {parentCategories.length === 0 && !showCategorySkeleton ? (
              <Empty
                title={"\u6682\u65e0\u5206\u7c7b"}
                description={"\u8bf7\u5148\u5728\u5206\u7c7b\u7ba1\u7406\u91cc\u65b0\u589e\u4e00\u7ea7\u548c\u4e8c\u7ea7\u5206\u7c7b"}
              />
            ) : (
              <CategoryHierarchy
                title={"\u4e00\u7ea7\u5206\u7c7b"}
                categories={categories}
                activeParentId={activeParentId}
                activeCategoryId={activeCategoryId}
                onParentSelect={onParentSelect}
                onCategorySelect={onCategorySelect}
                showChildCount={false}
                isLoading={showCategorySkeleton}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{"\u5bf9\u6807\u89c6\u9891\u6536\u96c6"}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {"\u6536\u96c6\u7ade\u54c1\u89c6\u9891\u94fe\u63a5\uff0c\u8bb0\u5f55\u4eae\u70b9\u4e0e\u5206\u7c7b\uff0c\u4fbf\u4e8e\u540e\u7eed\u590d\u76d8\u3002"}
                </p>
              </div>
              <Button onClick={onAddClick}>{"\u6dfb\u52a0\u89c6\u9891"}</Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <Skeleton className="h-24 w-40 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <Empty
                title={"\u6682\u65e0\u5bf9\u6807\u89c6\u9891"}
                description={"\u8bf7\u5728\u5de6\u4fa7\u9009\u62e9\u4e8c\u7ea7\u5206\u7c7b\uff0c\u6216\u70b9\u51fb\u201c\u6dfb\u52a0\u89c6\u9891\u201d\u3002"}
              />
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => {
                  const categoryColor = getCategoryColor(entry.category_id)
                  const author = entry.author || entry.owner?.name || "\u672a\u77e5\u4f5c\u8005"
                  const durationLabel = formatDuration(entry.duration)
                  const isInteractive = Boolean(entry.link)
                  return (
                    <InteractiveCard asChild interactive={isInteractive} key={entry.id}>
                      <article
                        className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                        onClick={() => {
                          if (entry.link) window.open(entry.link, "_blank")
                        }}
                      >
                        <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                          <img
                            src={normalizeCover(entry.cover) || COVER_PLACEHOLDER}
                            alt={entry.title || ""}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent" />
                          {durationLabel ? (
                            <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                              {durationLabel}
                            </span>
                          ) : null}
                          <span
                            className="absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: categoryColor }}
                          >
                            {getCategoryLabel(entry.category_id)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-2 text-sm font-semibold text-slate-900">
                            {entry.title || "\u672a\u547d\u540d\u89c6\u9891"}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{author}</span>
                            <span className="opacity-40">/</span>
                            <span>{formatDate(entry.pub_time || null)}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>{"\u64ad\u653e"} {formatNumber(entry.stats?.view)}</span>
                            <span>{"\u70b9\u8d5e"} {formatNumber(entry.stats?.like)}</span>
                            <span>{"\u8bc4\u8bba"} {formatNumber(entry.stats?.reply)}</span>
                          </div>
                          {entry.note ? (
                            <div className="mt-2 text-xs text-slate-500">{"\u5907\u6ce8\uff1a"}{entry.note}</div>
                          ) : null}
                          <div className="mt-3 flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-brand hover:bg-brand/10 hover:text-brand/80"
                              onClick={(event) => {
                                event.stopPropagation()
                                onOpenSubtitle(entry)
                              }}
                            >
                              {"\u53d6\u5b57\u5e55"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3"
                              onClick={(event) => {
                                event.stopPropagation()
                                onEditEntry(entry)
                              }}
                            >
                              {"\u7f16\u8f91"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-rose-500 hover:text-rose-600"
                              onClick={(event) => {
                                event.stopPropagation()
                                onDeleteEntry(entry)
                              }}
                            >
                              {"\u5220\u9664"}
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
        </section>
      </div>
    </div>
  )
}
