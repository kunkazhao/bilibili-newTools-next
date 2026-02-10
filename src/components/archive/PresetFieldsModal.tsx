import { useEffect, useMemo, useRef, useState } from "react"
import ModalForm from "@/components/ModalForm"
import { Button } from "@/components/ui/button"
import EditableListRow from "@/components/ui/editable-list-row"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CategoryItem, SpecField } from "@/components/archive/types"

interface PresetFieldsModalProps {
  isOpen: boolean
  categories: CategoryItem[]
  selectedCategoryId: string
  onClose: () => void
  onSave: (categoryId: string, fields: SpecField[]) => void
}

type DraftField = {
  id: string
  key: string
  example: string
}

export default function PresetFieldsModal({
  isOpen,
  categories,
  selectedCategoryId,
  onClose,
  onSave,
}: PresetFieldsModalProps) {
  const childCategories = useMemo(
    () => categories.filter((item) => item.parentId),
    [categories]
  )
  const defaultCategoryId = useMemo(() => {
    if (selectedCategoryId) {
      const exists = childCategories.some((item) => item.id === selectedCategoryId)
      if (exists) return selectedCategoryId
    }
    return childCategories[0]?.id ?? ""
  }, [childCategories, selectedCategoryId])

  const [activeCategoryId, setActiveCategoryId] = useState(defaultCategoryId)
  const [drafts, setDrafts] = useState<DraftField[]>([])
  const [newField, setNewField] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editingFieldKey, setEditingFieldKey] = useState("")
  const [editingFieldExample, setEditingFieldExample] = useState("")
  const draftIdRef = useRef(0)

  const createDraft = (key: string, example: string = "") => {
    draftIdRef.current += 1
    return { id: `preset-${draftIdRef.current}`, key, example }
  }

  useEffect(() => {
    setActiveCategoryId(defaultCategoryId)
  }, [defaultCategoryId, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const target = childCategories.find((item) => item.id === activeCategoryId)
    setDrafts(target?.specFields?.map((field) => createDraft(field.key, field.example ?? "")) ?? [])
    setErrorMessage("")
    setEditingFieldId(null)
    setEditingFieldKey("")
    setEditingFieldExample("")
  }, [activeCategoryId, isOpen, childCategories])

  const trimmedSet = useMemo(
    () => new Set(drafts.map((item) => item.key.trim()).filter(Boolean)),
    [drafts]
  )

  const handleAdd = () => {
    const trimmed = newField.trim()
    if (!trimmed) {
      setErrorMessage("参数名称不能为空")
      return
    }
    if (trimmedSet.has(trimmed)) {
      setErrorMessage("参数名称重复")
      return
    }
    setDrafts((prev) => [...prev, createDraft(trimmed)])
    setNewField("")
    setErrorMessage("")
  }

  const handleStartEdit = (field: DraftField) => {
    setEditingFieldId(field.id)
    setEditingFieldKey(field.key)
    setEditingFieldExample(field.example)
    setErrorMessage("")
  }

  const handleConfirmEdit = (id: string) => {
    setDrafts((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, key: editingFieldKey, example: editingFieldExample }
          : item
      )
    )
    setEditingFieldId(null)
    setEditingFieldKey("")
    setEditingFieldExample("")
  }

  const handleCancelEdit = () => {
    setEditingFieldId(null)
    setEditingFieldKey("")
    setEditingFieldExample("")
  }

  const handleRemove = (id: string) => {
    setDrafts((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = () => {
    if (drafts.some((item) => item.key.trim() === "")) {
      setErrorMessage("参数名称不能为空")
      return
    }
    const trimmedSet = new Set(drafts.map((item) => item.key.trim()))
    if (trimmedSet.size !== drafts.length) {
      setErrorMessage("参数名称重复")
      return
    }
    if (!activeCategoryId) return
    const fields: SpecField[] = drafts.map((item) => ({
      key: item.key.trim(),
      example: item.example.trim(),
    }))
    onSave(activeCategoryId, fields)
    setErrorMessage("")
    onClose()
  }

  const handleReorder = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const current = [...drafts]
    const fromIndex = current.findIndex((item) => item.id === dragId)
    const toIndex = current.findIndex((item) => item.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const [moved] = current.splice(fromIndex, 1)
    current.splice(toIndex, 0, moved)
    setDrafts(current)
  }

  return (
    <ModalForm
      isOpen={isOpen}
      title="预设参数"
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onSubmit={handleSave}
      closeOnOverlayClick={false}
      confirmLabel="保存"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[180px]">
            <Select value={activeCategoryId} onValueChange={setActiveCategoryId}>
              <SelectTrigger aria-label="Category">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {childCategories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Input
              aria-label="New field"
              placeholder="新增参数"
              value={newField}
              onChange={(event) => setNewField(event.target.value)}
            />
            <Button type="button" onClick={handleAdd}>
              新增
            </Button>
          </div>
        </div>

        {errorMessage ? <div className="text-xs text-rose-500">{errorMessage}</div> : null}

        <ScrollArea className="dialog-list" data-dialog-scroll="true">
          <div className="space-y-2 pr-2">
            {drafts.map((item) => (
              <EditableListRow
                key={item.id}
                draggable
                dragHandleAriaLabel="Drag handle"
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => setDragId(null)}
                onDrop={() => handleReorder(item.id)}
                editing={editingFieldId === item.id}
                editAriaLabel="Edit preset field"
                deleteAriaLabel="Delete field"
                onEdit={() => handleStartEdit(item)}
                onDelete={() => handleRemove(item.id)}
                onConfirm={() => handleConfirmEdit(item.id)}
                onCancel={handleCancelEdit}
                viewContent={(
                  <div className="flex items-center gap-2">
                    <div className="modal-list-field">{item.key}</div>
                    <div className="modal-list-field">{item.example || "--"}</div>
                  </div>
                )}
                editContent={(
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Preset field"
                      className="modal-list-field bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                      placeholder="参数名称"
                      value={editingFieldId === item.id ? editingFieldKey : item.key}
                      onChange={(event) => setEditingFieldKey(event.target.value)}
                    />
                    <Input
                      aria-label="Format example"
                      className="modal-list-field bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                      placeholder="格式示例"
                      value={editingFieldId === item.id ? editingFieldExample : item.example}
                      onChange={(event) => setEditingFieldExample(event.target.value)}
                    />
                  </div>
                )}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </ModalForm>
  )
}
