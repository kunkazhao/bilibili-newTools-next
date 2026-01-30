import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, X } from "lucide-react"

interface ResultItem {
  label: string
  value: string
}

interface CommissionResultModalProps {
  isOpen: boolean
  items: ResultItem[]
  highlightLabel: string
  highlightValue: string
  onSortAll: () => void
  onSortNew: () => void
  onClose: () => void
}

export default function CommissionResultModal({
  isOpen,
  items,
  highlightLabel,
  highlightValue,
  onSortAll,
  onSortNew,
  onClose,
}: CommissionResultModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <DialogTitle>解析完成</DialogTitle>
            <DialogDescription>Parsing summary.</DialogDescription>
          </div>
          <DialogClose asChild>
            <button type="button" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-semibold text-slate-700">{item.value}</span>
            </div>
          ))}

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between text-sm font-semibold text-emerald-700">
              <span>{highlightLabel}</span>
              <span>{highlightValue}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <p className="text-center">是否将获取到的商品排序到列表顶部？</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={onSortAll} className="min-w-[120px]">全部置顶</Button>
            <Button variant="outline" onClick={onSortNew} className="min-w-[120px]">
              仅新增置顶
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
