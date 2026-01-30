import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import Skeleton from "@/components/Skeleton"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COVER_PLACEHOLDER,
  formatDate,
  formatNumber,
  normalizeCover,
  pickCategoryColor,
} from "@/components/benchmark/benchmarkUtils"
import type { BenchmarkCategory, BenchmarkEntry } from "@/components/benchmark/types"

type BenchmarkPageViewProps = {
  isLoading: boolean
  categories: BenchmarkCategory[]
  entries: BenchmarkEntry[]
  filter: string
  onFilterChange: (value: string) => void
  onAddClick: () => void
  onManageCategories: () => void
  onOpenSubtitle: (entry: BenchmarkEntry) => void
  onEditEntry: (entry: BenchmarkEntry) => void
  onDeleteEntry: (entry: BenchmarkEntry) => void
}

export default function BenchmarkPageView({
  isLoading,
  categories,
  entries,
  filter,
  onFilterChange,
  onAddClick,
  onManageCategories,
  onOpenSubtitle,
  onEditEntry,
  onDeleteEntry,
}: BenchmarkPageViewProps) {
  const categoryMap = new Map(categories.map((item) => [String(item.id), item]))

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
            <PrimaryButton onClick={onAddClick}>添加视频</PrimaryButton>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-500"
              onClick={onManageCategories}
              aria-label="分类管理"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">分类</span>
            <Select value={filter} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[160px]" aria-label="Category filter">
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
          <Empty title="暂无对标视频" description="点击右上角“添加视频”开始收集。" />
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const categoryColor = getCategoryColor(entry.category_id)
              const author = entry.author || entry.owner?.name || "未知作者"
              return (
                <article
                  key={entry.id}
                  className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-slate-300"
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
                    />
                    <span
                      className="absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {getCategoryLabel(entry.category_id)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {entry.title || "未命名视频"}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{author}</span>
                      <span className="opacity-40">·</span>
                      <span>{formatDate(entry.pub_time || null)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>播放 {formatNumber(entry.stats?.view)}</span>
                      <span>点赞 {formatNumber(entry.stats?.like)}</span>
                      <span>评论 {formatNumber(entry.stats?.reply)}</span>
                    </div>
                    {entry.note ? (
                      <div className="mt-2 text-xs text-slate-500">备注：{entry.note}</div>
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
                        取字幕
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
                        编辑
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
    </div>
  )
}
