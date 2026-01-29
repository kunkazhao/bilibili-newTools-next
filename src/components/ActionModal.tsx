import type { ReactNode } from "react"
import PrimaryButton from "@/components/PrimaryButton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ActionModalProps {
  isOpen: boolean
  title: string
  onConfirm: () => void
  onOpenChange: (_open: boolean) => void
  confirmLabel?: string
  cancelLabel?: string
  onCancel?: () => void
  showCancel?: boolean
  children?: ReactNode
}

export default function ActionModal({
  isOpen,
  title,
  onConfirm,
  onOpenChange,
  confirmLabel = "确认",
  cancelLabel = "取消",
  onCancel,
  showCancel = true,
  children,
}: ActionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3 text-sm text-slate-600">{children}</div>
        <DialogFooter className="mt-6">
          {showCancel ? (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                onCancel?.()
                onOpenChange(false)
              }}
            >
              {cancelLabel}
            </Button>
          ) : null}
          <PrimaryButton onClick={onConfirm} type="button">
            {confirmLabel}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
