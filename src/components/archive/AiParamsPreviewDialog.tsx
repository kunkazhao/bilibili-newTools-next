import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type AiParamsPreviewField = {
  key: string
  oldValue: string
  newValue: string
}

type AiParamsPreviewDialogProps = {
  open: boolean
  title: string
  fields: AiParamsPreviewField[]
  onConfirm: () => void
  onCancel: () => void
  isSaving?: boolean
}

export default function AiParamsPreviewDialog({
  open,
  title,
  fields,
  onConfirm,
  onCancel,
  isSaving = false,
}: AiParamsPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onCancel() : null)}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[140px_1fr_1fr] gap-2 text-xs text-slate-500">
            <span>字段</span>
            <span>原值</span>
            <span>新值</span>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
            {fields.map((field) => (
              <div
                key={field.key}
                className="grid grid-cols-[140px_1fr_1fr] gap-2 text-sm text-slate-700"
              >
                <span className="text-slate-500">{field.key}</span>
                <span className="truncate">{field.oldValue || "--"}</span>
                <span className="truncate font-medium text-slate-900">
                  {field.newValue || "--"}
                </span>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-400">
            仅写入空值字段，已有内容不会被覆盖。
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "写入中..." : "确认写入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
