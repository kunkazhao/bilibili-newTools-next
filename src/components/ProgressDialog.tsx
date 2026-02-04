import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Failure = { name: string; link?: string; reason?: string }

type ProgressDialogProps = {
  open: boolean
  title: string
  status: "running" | "done" | "cancelled" | "error"
  total: number
  processed: number
  success?: number
  failures?: Failure[]
  showSummary?: boolean
  showFailures?: boolean
  allowCancel?: boolean
  showCloseOnDone?: boolean
  summaryText?: string
  onCancel?: () => void
  onOpenChange?: (open: boolean) => void
}

export default function ProgressDialog({
  open,
  title,
  status,
  total,
  processed,
  failures = [],
  showSummary = true,
  showFailures = false,
  allowCancel = false,
  showCloseOnDone = true,
  summaryText,
  onCancel,
  onOpenChange,
}: ProgressDialogProps) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0
  const failureCount = failures.length
  const summaryTextResolved = summaryText ?? `${total}个商品 · ${failureCount}个失败`
  const isRunning = status === "running"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-xs text-slate-500">{percent}%</div>
          </div>

          {showSummary ? (
            <div className="text-sm text-slate-600">{summaryTextResolved}</div>
          ) : null}

          {showFailures ? (
            <div className="space-y-2">
              {failures.length === 0
                ? null
                : failures.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="text-sm text-rose-500">{item.name}</div>
                      {item.reason ? (
                        <div className="text-xs text-slate-500">
                          {item.reason}
                        </div>
                      ) : null}
                    </div>
                  ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {isRunning && allowCancel ? (
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          ) : showCloseOnDone ? (
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              关闭
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
