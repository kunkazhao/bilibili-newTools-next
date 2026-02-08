import type { DragEvent, ReactNode } from "react"
import { Check, GripVertical, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditableListRowProps {
  viewContent: ReactNode
  editContent?: ReactNode
  editing?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onConfirm?: () => void
  onCancel?: () => void
  editAriaLabel?: string
  deleteAriaLabel?: string
  confirmAriaLabel?: string
  cancelAriaLabel?: string
  className?: string
  onRowClick?: () => void
  draggable?: boolean
  dragHandleAriaLabel?: string
  onDragStart?: () => void
  onDragEnd?: () => void
  onDrop?: () => void
}

export default function EditableListRow({
  viewContent,
  editContent,
  editing,
  onEdit,
  onDelete,
  onConfirm,
  onCancel,
  editAriaLabel = "Edit item",
  deleteAriaLabel = "Delete item",
  confirmAriaLabel = "Confirm edit",
  cancelAriaLabel = "Cancel edit",
  className,
  onRowClick,
  draggable,
  dragHandleAriaLabel = "Drag handle",
  onDragStart,
  onDragEnd,
  onDrop,
}: EditableListRowProps) {
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <div
      className={cn("modal-list-row", className)}
      onDragOver={draggable ? handleDragOver : undefined}
      onDrop={draggable ? onDrop : undefined}
      onClick={onRowClick}
    >
      {draggable ? (
        <span
          className="drag-handle"
          role="img"
          aria-label={dragHandleAriaLabel}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
      <div className="flex-1">{editing ? editContent : viewContent}</div>
      {editing ? (
        <>
          {onConfirm ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={confirmAriaLabel}
              onClick={(event) => {
                event.stopPropagation()
                onConfirm()
              }}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={cancelAriaLabel}
              onClick={(event) => {
                event.stopPropagation()
                onCancel()
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </>
      ) : (
        <>
          {onEdit ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={editAriaLabel}
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="dialog-action-delete"
              aria-label={deleteAriaLabel}
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
