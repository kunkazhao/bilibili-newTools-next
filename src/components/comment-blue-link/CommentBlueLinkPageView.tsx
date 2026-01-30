import { useState } from "react"
import { Button } from "@/components/ui/button"
import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"
import { Copy, Pencil, Trash2 } from "lucide-react"
import type { CommentAccount, CommentCategory, CommentCombo } from "./types"

const SidebarSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
      >
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-8" />
      </div>
    ))}
  </div>
)

const CardSkeletons = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
      >
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-3/4" />
        <Skeleton className="mt-4 h-8 w-24" />
      </div>
    ))}
  </div>
)

interface CommentBlueLinkPageViewProps {
  loading: boolean
  listLoading: boolean
  accounts: CommentAccount[]
  currentAccountId: string | null
  currentCategoryId: string
  allCategoryId: string
  accountCategories: CommentCategory[]
  filteredCombos: CommentCombo[]
  visibleCombos: CommentCombo[]
  combosCountByAccount: Map<string, number>
  onAccountChange: (accountId: string) => void
  onCategoryChange: (categoryId: string) => void
  onBatchCopy: () => void
  onCopyCombo: (combo: CommentCombo) => void
  onOpenCreate: () => void
  onOpenEdit: (combo: CommentCombo) => void
  onDelete: (combo: CommentCombo) => void
}

export default function CommentBlueLinkPageView({
  loading,
  listLoading,
  accounts,
  currentAccountId,
  currentCategoryId,
  allCategoryId,
  accountCategories,
  filteredCombos,
  visibleCombos,
  combosCountByAccount,
  onAccountChange,
  onCategoryChange,
  onBatchCopy,
  onCopyCombo,
  onOpenCreate,
  onOpenEdit,
  onDelete,
}: CommentBlueLinkPageViewProps) {
  const [expandedCombos, setExpandedCombos] = useState<Set<string>>(new Set())

  const toggleCombo = (comboId: string) => {
    setExpandedCombos((prev) => {
      const next = new Set(prev)
      if (next.has(comboId)) {
        next.delete(comboId)
      } else {
        next.add(comboId)
      }
      return next
    })
  }

  if (loading && !accounts.length && !filteredCombos.length) {
    return (
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="mt-4">
            <SidebarSkeleton />
          </div>
        </aside>
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <CardSkeletons />
        </section>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">评论账号</h3>
        </div>
        <div className="mt-4 space-y-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                currentAccountId === account.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              type="button"
              onClick={() => onAccountChange(account.id)}
            >
              <span>{account.name}</span>
              <span className="text-xs text-slate-400">
                {combosCountByAccount.get(account.id) ?? 0}
              </span>
            </button>
          ))}
          {listLoading && accounts.length === 0 ? <SidebarSkeleton /> : null}
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${
                  currentCategoryId === allCategoryId
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-slate-200 text-slate-500"
                }`}
                onClick={() => onCategoryChange(allCategoryId)}
              >
                全部
              </button>
              {accountCategories.map((category) => (
                <button
                  key={category.id}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    currentCategoryId === category.id
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-slate-200 text-slate-500"
                  }`}
                  type="button"
                  onClick={() => onCategoryChange(category.id)}
                >
                  {category.name}
                </button>
              ))}
              {!accountCategories.length ? (
                <span className="text-xs text-slate-400">该账号暂无分类</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={onBatchCopy} disabled={!filteredCombos.length}>
                批量复制
              </Button>
              <Button onClick={onOpenCreate}>新增组合</Button>
            </div>
          </div>
        </div>

        {filteredCombos.length === 0 && !listLoading ? (
          <Empty
            title="暂无蓝链组合"
            description="请先新增蓝链评论组合"
            actionLabel="新增"
            onAction={onOpenCreate}
          />
        ) : listLoading && visibleCombos.length === 0 ? (
          <CardSkeletons />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleCombos.map((combo) => {
              const isExpanded = expandedCombos.has(combo.id)
              const hasContent = Boolean(combo.content && combo.content.trim())
              return (
                <article
                  key={combo.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{combo.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-slate-500"
                        onClick={() => onCopyCombo(combo)}
                        aria-label="Copy combo"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-slate-500"
                        onClick={() => onOpenEdit(combo)}
                        aria-label="Edit combo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => onDelete(combo)}
                        aria-label="Delete combo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </div>
                    </div>
                    <div
                      className={`relative w-full rounded-lg bg-[#F8F9FF] p-3 text-xs text-slate-600 whitespace-pre-line break-words ${
                        isExpanded ? "" : "h-[240px] overflow-hidden"
                      }`}
                    >
                      {combo.content || "\u6682\u65e0\u5185\u5bb9"}
                      {!isExpanded && hasContent ? (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#F8F9FF] to-transparent" />
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{"\u5907\u6ce8\uff1a"}{combo.remark || "--"}</span>
                      {hasContent ? (
                        <button
                          type="button"
                          className="text-[#6c82ff] hover:underline"
                          onClick={() => toggleCombo(combo.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "\u6536\u8d77\u5185\u5bb9" : "\u5c55\u5f00\u5168\u6587"}
                        </button>
                      ) : null}
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
