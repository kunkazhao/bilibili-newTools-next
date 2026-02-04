import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type LoadingDialogProps = {
  open: boolean
  title: string
  message?: string
  onOpenChange?: (open: boolean) => void
}

export default function LoadingDialog({
  open,
  title,
  message = "处理中...",
  onOpenChange,
}: LoadingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
          <span>{message}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
