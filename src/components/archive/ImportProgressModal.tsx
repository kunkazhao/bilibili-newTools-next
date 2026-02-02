import ProgressDialog from "@/components/ProgressDialog"

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
  const failures = state.failures.map((item) => ({
    name: item.title,
    link: item.link,
    reason: item.reason,
  }))

  return (
    <ProgressDialog
      open={isOpen}
      title="导入进度"
      status={isRunning ? "running" : "done"}
      total={state.total}
      processed={state.processed}
      success={state.success}
      failures={failures}
      showSummary
      showFailures
      allowCancel={isRunning}
      onCancel={onCancel}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    />
  )
}
