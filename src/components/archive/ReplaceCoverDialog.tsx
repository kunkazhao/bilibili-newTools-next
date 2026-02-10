import { useState } from "react"
import ModalForm from "@/components/ModalForm"

interface ReplaceCoverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (files: File[]) => void
}

export default function ReplaceCoverDialog({
  open,
  onOpenChange,
  onSubmit,
}: ReplaceCoverDialogProps) {
  const [files, setFiles] = useState<File[]>([])

  return (
    <ModalForm
      isOpen={open}
      title="替换封面"
      confirmLabel="开始替换"
      onOpenChange={onOpenChange}
      onSubmit={() => onSubmit(files)}
      size="sm"
      closeOnOverlayClick={false}
    >
      <div className="space-y-3">
        <label className="text-sm text-slate-600" htmlFor="replace-cover-input">
          选择图片
        </label>
        <input
          id="replace-cover-input"
          aria-label="选择图片"
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </div>
    </ModalForm>
  )
}
