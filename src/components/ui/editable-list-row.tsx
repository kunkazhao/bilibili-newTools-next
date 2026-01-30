import type { DragEvent, ReactNode } from "react"
import { GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface EditableListRowProps {
  value: string
  inputKey?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  onBlur?: (value: string) => void
  actionLabel?: string
  actionContent?: ReactNode
  actionAriaLabel?: string
  actionVariant?: "default" | "outline" | "ghost"
  actionSize?: "default" | "sm" | "lg" | "icon"
  actionClassName?: string
  onAction?: () => void
  draggable?: boolean
  dragHandleAriaLabel?: string
  onDragStart?: () => void
  onDragEnd?: () => void
  onDrop?: () => void
}

export default function EditableListRow({
  value,
  inputKey,
  placeholder,
  disabled,
  readOnly,
  onBlur,
  actionLabel,
  actionContent,
  actionAriaLabel,
  actionVariant = "outline",
  actionSize = "sm",
  actionClassName,
  onAction,
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
      className="modal-list-row"
      onDragOver={draggable ? handleDragOver : undefined}
      onDrop={draggable ? onDrop : undefined}
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
      {readOnly ? (
        <div className="modal-list-field">{value}</div>
      ) : (
        <Input
          key={inputKey}
          aria-label="Editable list item"
          defaultValue={value}
          placeholder={placeholder}
          disabled={disabled}
          onBlur={(event) => onBlur?.(event.target.value)}
          className="flex-1"
        />
      )}
      {actionLabel || actionContent ? (
        <Button
          type="button"
          variant={actionVariant}
          size={actionSize}
          className={cn(actionClassName)}
          onClick={onAction}
          aria-label={actionAriaLabel}
        >
          {actionContent ?? actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
