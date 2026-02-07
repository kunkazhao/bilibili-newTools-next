import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import Skeleton from "@/components/Skeleton"
import { Button } from "@/components/ui/button"
import { GripVertical, Pencil, Trash2 } from "lucide-react"
import type { DirectPlan } from "./types"

type DirectPlansPageViewProps = {
  loading: boolean
  plans: DirectPlan[]
  onAdd: () => void
  onEdit: (plan: DirectPlan) => void
  onDelete: (plan: DirectPlan) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDrop: (id: string) => void
}

export default function DirectPlansPageView({
  loading,
  plans,
  onAdd,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrop,
}: DirectPlansPageViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">定向计划</h2>
            <p className="mt-1 text-sm text-slate-500">
              记录平台、分类、品牌与佣金比例，支持拖拽排序。
            </p>
          </div>
          <PrimaryButton onClick={onAdd}>新增计划</PrimaryButton>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3"
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <Empty title="暂无定向计划" description="点击右上角“新增计划”开始添加。" />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[40px_120px_1fr_1fr_140px_120px] items-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              <span></span>
              <span>平台</span>
              <span>分类</span>
              <span>品牌</span>
              <span>佣金比例</span>
              <span className="text-right">操作</span>
            </div>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="grid grid-cols-[40px_120px_1fr_1fr_140px_120px] items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(plan.id)}
              >
                <span
                  className="drag-handle flex items-center justify-center text-slate-400"
                  role="img"
                  aria-label="Drag handle"
                  draggable
                  onDragStart={() => onDragStart(plan.id)}
                  onDragEnd={onDragEnd}
                >
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{plan.platform}</span>
                <span className="truncate">{plan.category}</span>
                <span className="truncate">{plan.brand}</span>
                <span>{plan.commission_rate || "-"}</span>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(plan)}
                    aria-label="编辑计划"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-rose-500"
                    onClick={() => onDelete(plan)}
                    aria-label="删除计划"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
