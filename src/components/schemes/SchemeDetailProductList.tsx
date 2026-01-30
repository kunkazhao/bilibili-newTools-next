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
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
}

export default function SchemeDetailProductList({
  items,
  totalCount,
  onOpenPicker,
  onEdit,
  onRemove,
  onDragStart,
  onDrop,
}: SchemeDetailProductListProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">已选商品</h3>
        <span className="text-xs text-slate-500">共 {totalCount} 件</span>
      </div>
      {items.length === 0 ? (
        <Empty title="暂无选品" description="点击新增选品添加商品" actionLabel="新增选品" onAction={onOpenPicker} />
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-card ${
                item.isMissing ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-white"
              }`}
              draggable
              onDragStart={() => onDragStart(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(item.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <img
                    src={item.cover}
                    alt={item.title}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
                    <div className="text-xs text-slate-500">店铺：{item.shopName}</div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>30天销量：{item.sales30}</span>
                      <span>评价数：{item.comments}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(item.id)}>
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onRemove(item.id)}>
                    删除
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">价格</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{item.price} 元</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">佣金</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{item.commission} 元</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">佣金比例</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{item.commissionRate}</p>
                </div>
              </div>
              {item.missingFields.length ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  缺失：{item.missingFields.join("、")}
                </div>
              ) : null}
              <div className="text-xs text-slate-500">总结：{item.remarkText}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
