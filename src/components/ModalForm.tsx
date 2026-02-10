import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ModalFormProps {
  isOpen: boolean
  title: string
  onSubmit: () => void
  onOpenChange: (_open: boolean) => void
  confirmLabel?: string
  size?: "sm" | "md" | "lg" | "xl"
  closeOnOverlayClick?: boolean
  children?: ReactNode
}

export default function ModalForm({
  isOpen,
  title,
  onSubmit,
  onOpenChange,
  confirmLabel = "确认",
  size = "md",
  closeOnOverlayClick = true,
  children,
}: ModalFormProps) {
  const sizeClass = {
    sm: "sm:max-w-[520px]",
    md: "sm:max-w-[560px]",
    lg: "sm:max-w-[720px]",
    xl: "sm:max-w-[900px]",
  }[size]
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${sizeClass} max-h-[85vh] flex flex-col`}
        onInteractOutside={(event) => {
          if (!closeOnOverlayClick) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Form details.</DialogDescription>
        </DialogHeader>
        <form
          className="dialog-form flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="dialog-body min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                取消
              </Button>
            </DialogClose>
            <Button type="submit">{confirmLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
