import { Button } from "@/components/ui/button"
import { Pencil, Archive, Trash2 } from "lucide-react"

export interface CommissionItemView {
  id: string
  index: number
  title: string
  price: number
  commissionRate: number
  commission: number
  sales30: number
  comments: string
  image: string
  shopName: string
  source: string
  isFocused: boolean
  isArchived: boolean
}

interface CommissionListCardProps {
  item: CommissionItemView
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return "--"
  return value.toLocaleString("zh-CN")
}

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return "--"
  return `${value.toFixed(2)}%`
}

const formatYuan = (value: number) => {
  if (!Number.isFinite(value)) return "--"
  return `${value.toFixed(2)} 元`
}

export default function CommissionListCard({
  item,
  onEdit,
  onArchive,
  onDelete,
}: CommissionListCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex gap-4">
        <div className="relative h-[120px] w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {item.image ? (
            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <div className="grid gap-4 text-xs text-slate-500 md:grid-cols-5">
                <div>
                  <div className="text-xs text-slate-400">商品价格</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {formatYuan(item.price)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">佣金</div>
                  <div className="mt-1 text-base font-semibold text-emerald-600">
                    {formatYuan(item.commission)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">佣金比例</div>
                  <div className="mt-1 text-base font-semibold text-rose-500">
                    {formatPercent(item.commissionRate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">30天销量</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {formatNumber(item.sales30)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">评价数</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {item.comments}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <span>店铺：{item.shopName || "--"}</span>
                <span className="truncate">-来源：{item.source || "--"}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-w-[90px]"
                onClick={() => onEdit(item.id)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </Button>
              <Button
                type="button"
                variant="outline"
                className={
                  item.isArchived
                    ? "min-w-[90px] border-slate-200 text-slate-400"
                    : "min-w-[90px] border-violet-200 text-violet-600 hover:text-violet-700"
                }
                onClick={() => onArchive(item.id)}
                disabled={item.isArchived}
              >
                <Archive className="mr-2 h-4 w-4" />
                {item.isArchived ? "已归档" : "归档"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-w-[90px] border-rose-200 text-rose-600 hover:text-rose-700"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
