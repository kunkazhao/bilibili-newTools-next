import { GripVertical, Image as ImageIcon, Pencil, Trash2 } from "lucide-react"
import Empty from "@/components/Empty"
import { Button } from "@/components/ui/button"

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
}: SchemeDetailProductListProps) {
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
      {items.length === 0 ? (
        <Empty
          title="暂无选品"
          description="点击新增选品添加商品"
          actionLabel="新增选品"
          onAction={onOpenPicker}
        />
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-4 rounded-2xl border p-4 shadow-card ${
                item.isMissing ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-white"
              }`}
              draggable
              onDragStart={() => onDragStart(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(item.id)}
            >
              <div className="flex items-start gap-3">
                <span className="drag-handle mt-1" role="img" aria-label="Drag handle">
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-3">
                  <h4 className="max-w-[320px] truncate text-sm font-semibold text-slate-900">
                    {item.title}
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                    <div className="min-w-[72px]">
                      <p className="text-[11px] text-slate-400">价格</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="min-w-[72px]">
                      <p className="text-[11px] text-slate-400">佣金</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.commission)}
                      </p>
                    </div>
                    <div className="min-w-[72px]">
                      <p className="text-[11px] text-slate-400">比例</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatRate(item.commissionRate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="生成图片"
                  onClick={() => onGenerateImage(item.id)}
                >
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="删除"
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="编辑"
                  onClick={() => onEdit(item.id)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
