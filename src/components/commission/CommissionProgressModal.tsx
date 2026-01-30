import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { X } from "lucide-react"

interface CommissionProgressModalProps {
  isOpen: boolean
  title: string
  message: string
  current: number
  total: number
  onClose: () => void
}

export default function CommissionProgressModal({
  isOpen,
  title,
  message,
  current,
  total,
  onClose,
}: CommissionProgressModalProps) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Progress update.</DialogDescription>
          <DialogClose asChild>
            <button type="button" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{message}</span>
            <span className="text-brand">({current}/{total})</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
