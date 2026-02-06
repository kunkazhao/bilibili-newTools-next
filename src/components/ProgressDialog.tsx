import { CheckCircle2 } from "lucide-react"

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
  success,
  failures = [],
  showSummary = true,
  showFailures = false,
  allowCancel = false,
  showCloseOnDone = true,
  summaryText,
  onCancel,
  onOpenChange,
}: ProgressDialogProps) {
  const isRunning = status === "running"
  const isDone = status === "done"
  const isIndeterminate = isRunning && processed === 0 && total > 0
  const percent = isIndeterminate ? 0 : total > 0 ? Math.round((processed / total) * 100) : 0
  const percentLabel = isIndeterminate ? "准备中" : `${percent}%`

  const failureCount = failures.length
  const successCount =
    typeof success === "number" ? success : Math.max(processed - failureCount, 0)
  const isDoneSuccess = isDone && failureCount === 0

  const defaultSummaryText = isIndeterminate
    ? "任务准备中..."
    : `共 ${total} 条 · 失败 ${failureCount} 条`

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isRunning) return
    onOpenChange?.(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[520px]"
        onInteractOutside={(event) => {
          if (isRunning) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (isRunning) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-brand transition-all ${
                  isIndeterminate ? "animate-pulse" : ""
                }`}
                style={{ width: `${isIndeterminate ? 40 : percent}%` }}
              />
            </div>
            <div className="text-base font-semibold text-slate-400">{percentLabel}</div>
          </div>

          {showSummary ? (
            <div className="space-y-2">
              {isDoneSuccess ? (
                <div className="flex items-center gap-2 text-base font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>已全部同步成功</span>
                </div>
              ) : null}

              {summaryText && !isDoneSuccess ? (
                <div className="text-base font-semibold text-slate-700">{summaryText}</div>
              ) : (
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span className="text-emerald-600">成功 {successCount} 条</span>
                  <span className="text-slate-300">{"\u2022"}</span>
                  <span className="text-slate-700">失败 {failureCount} 条</span>
                  {!summaryText && !isDoneSuccess ? (
                    <span className="ml-2 text-sm font-medium text-slate-400">{defaultSummaryText}</span>
                  ) : null}
                </div>
              )}
            </div>
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
              {"\u53d6\u6d88"}
            </Button>
          ) : showCloseOnDone ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {"\u5173\u95ed"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
