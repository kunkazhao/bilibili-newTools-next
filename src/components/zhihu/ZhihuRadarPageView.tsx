import { memo } from "react"
import CategoryManagerModal from "@/components/archive/CategoryManagerModal"
import type { CategoryItem } from "@/components/archive/types"
import ProgressDialog from "@/components/ProgressDialog"
import Skeleton from "@/components/Skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, TrendingUp } from "lucide-react"
import type { ZhihuQuestionItem, ZhihuQuestionStat } from "./zhihuApi"

interface TrendDialogState {
  open: boolean
  title: string
  stats: ZhihuQuestionStat[]
  loading: boolean
  onOpenChange: (open: boolean) => void
}

interface UpdateDialogState {
  open: boolean
  keywordId: string
  options: Array<{ id: string; name: string }>
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onKeywordChange: (value: string) => void
  onConfirm: () => void
}

interface AddQuestionDialogState {
  open: boolean
  questionUrl: string
  keywordId: string
  options: Array<{ id: string; name: string }>
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onQuestionUrlChange: (value: string) => void
  onKeywordChange: (value: string) => void
  onConfirm: () => void
}

interface ProgressDialogState {
  open: boolean
  status: "running" | "done" | "error"
  total: number
  processed: number
  success: number
  failed: number
  onOpenChange: (open: boolean) => void
}

interface ZhihuRadarPageViewProps {
  keywords: CategoryItem[]
  activeKeywordId: string
  items: ZhihuQuestionItem[]
  isKeywordLoading: boolean
  listLoading: boolean
  isRefreshing: boolean
  isUsingCache: boolean
  listTotal: number
  allCount: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  searchValue: string
  onSearchChange: (value: string) => void
  onSelectKeyword: (id: string) => void
  onOpenKeywordManager: () => void
  onOpenAddQuestion: () => void
  isKeywordManagerOpen: boolean
  onCloseKeywordManager: () => void
  onSaveKeywords: (next: CategoryItem[]) => void
  onOpenTrend: (item: ZhihuQuestionItem) => void
  onDeleteQuestion: (item: ZhihuQuestionItem) => void
  deletingId: string | null
  trendDialog: TrendDialogState
  updateDialog: UpdateDialogState
  addQuestionDialog: AddQuestionDialogState
  progressDialog: ProgressDialogState
}

const KeywordSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
      >
        <div className="h-4 w-20 rounded bg-slate-100" />
        <div className="h-3 w-10 rounded bg-slate-100" />
      </div>
    ))}
  </div>
)

const ListSkeleton = () => (
  <div className="space-y-3 p-4" data-testid="zhihu-list-skeleton">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex items-center gap-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
)

const formatNumber = (value?: number) => {
  if (value === 0 || typeof value === "number") return value.toLocaleString()
  return "--"
}

const formatGrowth = (value?: number) => {
  if (value === 0 || typeof value === "number") return value.toLocaleString()
  return "--"
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const getGrowthClass = (value?: number) => {
  if (!value) return "text-slate-500"
  if (value >= 1000) return "text-rose-600 font-semibold"
  if (value >= 100) return "text-orange-600 font-semibold"
  if (value > 0) return "text-emerald-600"
  return "text-slate-500"
}

interface ZhihuQuestionRowProps {
  row: ZhihuQuestionItem
  index: number
  deletingId: string | null
  onOpenTrend: (item: ZhihuQuestionItem) => void
  onDeleteQuestion: (item: ZhihuQuestionItem) => void
}

const ZhihuQuestionRow = memo(function ZhihuQuestionRow({
  row,
  index,
  deletingId,
  onOpenTrend,
  onDeleteQuestion,
}: ZhihuQuestionRowProps) {
  return (
    <tr
      className={`transition ${index % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-slate-100`}
    >
      <td className="px-4 py-3 text-slate-700">
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 text-sm font-medium text-slate-900 hover:text-brand"
        >
          {row.title || "--"}
        </a>
      </td>
      <td className="px-4 py-3 text-slate-600">{row.first_keyword || "???"}</td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDateTime(row.last_seen_at)}</td>
      <td className="px-4 py-3 text-slate-700">{formatNumber(row.view_count_total)}</td>
      <td className="px-4 py-3 text-slate-700">{formatNumber(row.answer_count_total)}</td>
      <td className={`px-4 py-3 ${getGrowthClass(row.view_count_delta)}`}>
        {formatGrowth(row.view_count_delta)}
      </td>
      <td className={`px-4 py-3 ${getGrowthClass(row.answer_count_delta)}`}>
        {formatGrowth(row.answer_count_delta)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand/40 hover:text-brand"
            type="button"
            onClick={() => onOpenTrend(row)}
            aria-label="????"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => onDeleteQuestion(row)}
            aria-label="????"
            disabled={deletingId === row.id}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
})

export default function ZhihuRadarPageView({
  keywords,
  activeKeywordId,
  items,
  isKeywordLoading,
  listLoading,
  isRefreshing,
  isUsingCache,
  listTotal,
  allCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  searchValue,
  onSearchChange,
  onSelectKeyword,
  onOpenKeywordManager,
  onOpenAddQuestion,
  isKeywordManagerOpen,
  onCloseKeywordManager,
  onSaveKeywords,
  onOpenTrend,
  onDeleteQuestion,
  deletingId,
  trendDialog,
  updateDialog,
  addQuestionDialog,
  progressDialog,
}: ZhihuRadarPageViewProps) {
  const showCategorySkeleton = isKeywordLoading && keywords.length === 0
  const showListSkeleton = listLoading && (!isUsingCache || items.length === 0)
  const loadMoreContent = hasMore ? (
    <div className="flex items-center justify-center border-t border-slate-100 px-4 py-3">
      {isLoadingMore ? (
        <span className="text-xs text-slate-400">正在加载更多...</span>
      ) : (
        <button
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
          type="button"
          onClick={onLoadMore}
        >
          加载更多
        </button>
      )}
    </div>
  ) : null
  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">关键词</h3>
            <button
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
              type="button"
              onClick={onOpenKeywordManager}
            >
              ＋
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {showCategorySkeleton ? (
              <KeywordSkeleton />
            ) : (
              <>
                <button
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    activeKeywordId === "all"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  type="button"
                  onClick={() => onSelectKeyword("all")}
                >
                  <span>全部</span>
                  <span className="text-xs text-slate-400">{allCount} 条</span>
                </button>
                {keywords.map((keyword) => (
                  <button
                    key={keyword.id}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                      activeKeywordId === keyword.id
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    type="button"
                    onClick={() => onSelectKeyword(keyword.id)}
                  >
                    <span>{keyword.name}</span>
                    <span className="text-xs text-slate-400">{keyword.count ?? 0}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-slate-900">问题列表</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  {items.length}
                </span>
                <span className="text-xs text-slate-500">
                  已加载 {items.length} / 总数 {listTotal}
                </span>
                {isRefreshing ? (
                  <span className="text-xs text-slate-400">刷新中...</span>
                ) : listLoading ? (
                  <span className="text-xs text-slate-400">加载中...</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-56"
                  placeholder="搜索问题标题"
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
                <Button variant="outline" onClick={() => updateDialog.onOpenChange(true)}>
                  更新数据
                </Button>
                <Button variant="outline" onClick={onOpenAddQuestion}>
                  Add Question
                </Button>
                <Button onClick={onOpenKeywordManager}>添加监控关键词</Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            {showListSkeleton ? (
              <ListSkeleton />
            ) : (
              <>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">问题标题</th>
                      <th className="px-4 py-3 font-semibold">所属分类</th>
                      <th className="px-4 py-3 font-semibold">更新时间</th>
                      <th className="px-4 py-3 font-semibold">总阅读量</th>
                      <th className="px-4 py-3 font-semibold">总回答数</th>
                      <th className="px-4 py-3 font-semibold">新增阅读数</th>
                      <th className="px-4 py-3 font-semibold">新增回答数</th>
                      <th className="px-4 py-3 font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      items.map((row, index) => (
                        <ZhihuQuestionRow
                          key={row.id}
                          row={row}
                          index={index}
                          deletingId={deletingId}
                          onOpenTrend={onOpenTrend}
                          onDeleteQuestion={onDeleteQuestion}
                        />
                      ))
                    )}
                  </tbody>
                </table>
                {items.length > 0 ? loadMoreContent : null}
              </>
            )}
          </div>
        </section>
      </div>

      {isKeywordManagerOpen ? (
        <CategoryManagerModal
          isOpen={isKeywordManagerOpen}
          categories={keywords}
          onClose={onCloseKeywordManager}
          onSave={onSaveKeywords}
        />
      ) : null}

      <Dialog open={updateDialog.open} onOpenChange={updateDialog.onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              更新数据
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-slate-600">选择关键词范围</div>
            <Select value={updateDialog.keywordId} onValueChange={updateDialog.onKeywordChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {updateDialog.options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => updateDialog.onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={updateDialog.onConfirm} disabled={updateDialog.submitting}>
              {updateDialog.submitting ? "更新中..." : "开始更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addQuestionDialog.open} onOpenChange={addQuestionDialog.onOpenChange}>
        <DialogContent
          className="sm:max-w-[460px]"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Add Question
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm text-slate-600">Question URL</div>
              <Input
                placeholder="https://www.zhihu.com/question/xxxx"
                value={addQuestionDialog.questionUrl}
                onChange={(event) => addQuestionDialog.onQuestionUrlChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-600">Keyword Category</div>
              <Select
                value={addQuestionDialog.keywordId}
                onValueChange={addQuestionDialog.onKeywordChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {addQuestionDialog.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => addQuestionDialog.onOpenChange(false)}
              disabled={addQuestionDialog.submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={addQuestionDialog.onConfirm}
              disabled={
                addQuestionDialog.submitting ||
                !addQuestionDialog.keywordId ||
                !addQuestionDialog.questionUrl.trim()
              }
            >
              {addQuestionDialog.submitting ? "Adding..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <ProgressDialog
        open={progressDialog.open}
        title="更新数据"
        status={progressDialog.status}
        total={progressDialog.total}
        processed={progressDialog.processed}
        success={progressDialog.success}
        summaryText={`共 ${progressDialog.total} 个问题 · 成功 ${progressDialog.success} · 失败 ${progressDialog.failed}`}
        failures={[]}
        showFailures={false}
        allowCancel={false}
        onOpenChange={progressDialog.onOpenChange}
      />

      <Dialog open={trendDialog.open} onOpenChange={trendDialog.onOpenChange}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              {trendDialog.title || "趋势分析"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>最近 15 天阅读量趋势</span>
                {trendDialog.loading ? <span>加载中...</span> : null}
              </div>
              <div className="mt-3 h-48 rounded-lg bg-gradient-to-br from-slate-100 via-white to-slate-50" />
            </div>
            <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-3">
              {trendDialog.stats.slice(-15).map((stat) => (
                <div
                  key={stat.stat_date}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
                >
                  <span>{stat.stat_date}</span>
                  <span>{stat.view_count.toLocaleString()}</span>
                </div>
              ))}
              {trendDialog.stats.length === 0 && !trendDialog.loading ? (
                <div className="text-slate-400">暂无趋势数据</div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
