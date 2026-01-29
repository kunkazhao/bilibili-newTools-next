import ActionModal from "@/components/ActionModal"
import Tooltip from "@/components/Tooltip"

interface ImportFailure {
  link: string
  title: string
  reason: string
}

interface ImportProgressState {
  status: "idle" | "running" | "done"
  total: number
  processed: number
  success: number
  failed: number
  failures: ImportFailure[]
}

interface ImportProgressModalProps {
  isOpen: boolean
  state: ImportProgressState
  onClose: () => void
  onCancel: () => void
}

export default function ImportProgressModal({
  isOpen,
  state,
  onClose,
  onCancel,
}: ImportProgressModalProps) {
  const isRunning = state.status === "running"

  return (
    <ActionModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onConfirm={isRunning ? () => {} : onClose}
      confirmLabel={isRunning ? "继续等待" : "关闭"}
      cancelLabel={isRunning ? "取消导入" : "取消"}
      showCancel={isRunning}
      onCancel={onCancel}
      title="导入进度"
    >
      <div className="space-y-3 text-sm text-slate-600">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-400">总数</div>
            <div className="text-base font-semibold text-slate-900">
              {state.total}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-400">已处理</div>
            <div className="text-base font-semibold text-slate-900">
              {state.processed}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-400">成功</div>
            <div className="text-base font-semibold text-slate-900">
              {state.success}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-400">失败</div>
            <div className="text-base font-semibold text-slate-900">
              {state.failed}
            </div>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-brand transition-all"
            style={{
              width:
                state.total === 0
                  ? "0%"
                  : `${Math.round((state.processed / state.total) * 100)}%`,
            }}
          />
        </div>

        {state.failed > 0 ? (
          <div className="text-xs text-rose-500">
            失败详情（前 5 条）：
            <div className="mt-2 space-y-2 text-slate-600">
              {state.failures.slice(0, 5).map((item) => (
                <Tooltip
                  key={item.link}
                  content={`${item.reason} | ${item.link}`}
                >
                  <div className="truncate rounded-md border border-slate-200 bg-white px-2 py-1">
                    {item.title} - {item.reason}
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </ActionModal>
  )
}
