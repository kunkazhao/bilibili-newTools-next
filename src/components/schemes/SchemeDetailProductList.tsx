import { GripVertical, Image as ImageIcon, Pencil, Trash2 } from "lucide-react"
import Empty from "@/components/Empty"
import { Button } from "@/components/ui/button"
import { InteractiveCard } from "@/components/ui/interactive-card"

type SchemeDetailProductCard = {
  id: string
  title: string
  cover: string
  shopName: string
  sales30: string
  comments: string
  price: string
  commission: string
  commissionRate: string
  missingFields: string[]
  remarkText: string
  isMissing: boolean
}

type SchemeDetailProductListProps = {
  items: SchemeDetailProductCard[]
  totalCount: number
  onOpenPicker: () => void
  onGenerateImage: (id: string) => void
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
  onCardClick?: (id: string) => void
}

export default function SchemeDetailProductList({
  items,
  totalCount,
  onOpenPicker,
  onGenerateImage,
  onEdit,
  onRemove,
  onDragStart,
  onDrop,
  onCardClick,
}: SchemeDetailProductListProps) {
  const isInteractive = Boolean(onCardClick)
  const formatCurrency = (value: string) => {
    if (!value || value === "--") return "--"
    return `${value} 元`
  }

  const formatRate = (value: string) => {
    if (!value || value === "--" || value === "--%") return "--"
    return value.endsWith("%") ? value : `${value}%`
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">已选商品</h3>
        <span className="text-xs text-slate-500">共 {totalCount} 件</span>
      </div>
      <div
        className="mt-4 h-[var(--scheme-detail-product-scroll-height)] overflow-y-auto overflow-x-hidden"
        data-testid="scheme-detail-product-scroll"
      >
        {items.length === 0 ? (
          <Empty
            title="暂无选品"
            description="点击新增选品添加商品"
            actionLabel="新增选品"
            onAction={onOpenPicker}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <InteractiveCard asChild interactive={isInteractive} key={item.id}>
                <div
                  className={`flex items-start gap-4 rounded-2xl border p-4 shadow-card ${
                    item.isMissing
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                  data-testid="scheme-detail-card"
                  draggable
                  onClick={() => onCardClick?.(item.id)}
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDrop(item.id)}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="drag-handle"
                      role="img"
                      aria-label="Drag handle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="space-y-2">
                      <h4 className="max-w-[320px] truncate text-sm font-semibold text-slate-900">
                        {item.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400">价格</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400">比例</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatRate(item.commissionRate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="生成图片"
                          onClick={(event) => {
                            event.stopPropagation()
                            onGenerateImage(item.id)
                          }}
                        >
                          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="删除"
                          onClick={(event) => {
                            event.stopPropagation()
                            onRemove(item.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="编辑"
                          onClick={(event) => {
                            event.stopPropagation()
                            onEdit(item.id)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </InteractiveCard>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
