import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Empty from "@/components/Empty"
import { Copy, Link2, Pencil, Settings, Trash2 } from "lucide-react"
import type { BlueLinkAccount, BlueLinkCategory, BlueLinkEntry, SourcingItem } from "./types"

interface BlueLinkMapPageViewProps {
  loading: boolean
  listLoading: boolean
  accounts: BlueLinkAccount[]
  entries: BlueLinkEntry[]
  activeAccountId: string | null
  activeCategoryId: string | null
  searchValue: string
  accountCategories: BlueLinkCategory[]
  filteredEntries: BlueLinkEntry[]
  visibleEntries: BlueLinkEntry[]
  itemsById: Map<string, SourcingItem>
  entriesCountByAccount: Map<string, number>
  onAccountChange: (accountId: string) => void
  onCategoryChange: (categoryId: string) => void
  onSearchChange: (value: string) => void
  onOpenAccountManage: () => void
  onOpenCategoryManage: () => void
  onOpenImport: () => void
  onAutoMap: () => void
  onCopy: (entry: BlueLinkEntry) => void
  onEdit: (entry: BlueLinkEntry) => void
  onPick: (entry: BlueLinkEntry) => void
  onDelete: (entry: BlueLinkEntry) => void
}

export default function BlueLinkMapPageView({
  loading,
  listLoading,
  accounts,
  entries,
  activeAccountId,
  activeCategoryId,
  searchValue,
  accountCategories,
  filteredEntries,
  visibleEntries,
  itemsById,
  entriesCountByAccount,
  onAccountChange,
  onCategoryChange,
  onSearchChange,
  onOpenAccountManage,
  onOpenCategoryManage,
  onOpenImport,
  onAutoMap,
  onCopy,
  onEdit,
  onPick,
  onDelete,
}: BlueLinkMapPageViewProps) {
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]))
  const categoryNameById = new Map(accountCategories.map((category) => [category.id, category.name]))

  const formatPrice = (value?: number) => {
    if (value === 0 || typeof value === "number") return `${value}元`
    return "--"
  }

  const formatCommissionRate = (value?: number | string) => {
    if (value === null || value === undefined || value === "") return "--"
    if (typeof value === "number") return `${value.toFixed(2)}%`
    return String(value).includes("%") ? String(value) : `${value}%`
  }

  const truncateTitle = (value: string) => {
    if (!value) return "--"
    return value.length > 12 ? `${value.slice(0, 12)}...` : value
  }

  if (loading && !accounts.length && !entries.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm text-slate-500">加载中...</p>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">账号列表</h3>
            <span className="text-xs text-slate-400">{accounts.length} 个</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-500"
            onClick={onOpenAccountManage}
            aria-label="账号管理"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                activeAccountId === account.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              type="button"
              onClick={() => onAccountChange(account.id)}
            >
              <span>{account.name}</span>
              <span className="text-xs text-slate-400">
                {entriesCountByAccount.get(account.id) ?? 0}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {activeAccountId ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-500"
                  onClick={onOpenCategoryManage}
                  aria-label="分类管理"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              ) : null}
              {!activeAccountId ? (
                <span className="text-xs text-slate-400">请先选择账号。</span>
              ) : accountCategories.length === 0 ? (
                <span className="text-xs text-slate-400">暂无分类，请在分类管理中添加。</span>
              ) : (
                accountCategories.map((category) => (
                  <button
                    key={category.id}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      activeCategoryId === category.id
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-slate-200 text-slate-500"
                    }`}
                    type="button"
                    onClick={() => onCategoryChange(category.id)}
                  >
                    {category.name}
                  </button>
                ))
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-48"
                aria-label="Search product name"
                placeholder="搜索商品名称"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
              />
              <Button variant="outline" onClick={onOpenImport}>
                导入蓝链
              </Button>
              <Button onClick={onAutoMap}>一键映射</Button>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 && !listLoading ? (
          <Empty
            title="暂无蓝链"
            description="导入蓝链后系统会自动匹配商品。"
            actionLabel="导入蓝链"
            onAction={onOpenImport}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listLoading && visibleEntries.length === 0
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                  >
                    <div className="h-4 w-24 rounded bg-slate-100" />
                    <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
                    <div className="mt-4 h-8 w-24 rounded bg-slate-100" />
                  </div>
                ))
              : visibleEntries.map((entry) => {
                  const matchedItem = entry.product_id ? itemsById.get(entry.product_id) : null
                  const title = matchedItem?.title || entry.product_title || "未匹配商品"
                  const cover = matchedItem?.cover_url || entry.product_cover || ""
                  const price = matchedItem?.price ?? entry.product_price
                  const commissionRate = matchedItem?.commission_rate
                  return (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                    >
                      <div className="flex gap-4">
                        <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {cover ? (
                            <img src={cover} alt={title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                              暂无封面
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {truncateTitle(title)}
                              </p>
                              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                <span>价格：{formatPrice(price)}</span>
                                <span>佣金比例：{formatCommissionRate(commissionRate)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-500"
                                onClick={() => onEdit(entry)}
                                aria-label="编辑蓝链"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-500"
                                onClick={() => onPick(entry)}
                                aria-label="选择商品"
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-rose-500"
                                onClick={() => onDelete(entry)}
                                aria-label="删除蓝链"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <span className="truncate">{entry.source_link || "--"}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500"
                              onClick={() => onCopy(entry)}
                              aria-label="复制蓝链"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
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
