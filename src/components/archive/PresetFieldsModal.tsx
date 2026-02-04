import { useEffect, useMemo, useRef, useState } from "react"
import ModalForm from "@/components/ModalForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Trash2 } from "lucide-react"
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
  const defaultCategoryId = useMemo(() => {
    if (selectedCategoryId && selectedCategoryId !== "all") {
      const exists = categories.some((item) => item.id === selectedCategoryId)
      if (exists) return selectedCategoryId
    }
    return categories[0]?.id ?? ""
  }, [categories, selectedCategoryId])

  const [activeCategoryId, setActiveCategoryId] = useState(defaultCategoryId)
  const [drafts, setDrafts] = useState<DraftField[]>([])
  const [newField, setNewField] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
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
    const target = categories.find((item) => item.id === activeCategoryId)
    setDrafts(target?.specFields?.map((field) => createDraft(field.key, field.example ?? "")) ?? [])
    setErrorMessage("")
  }, [activeCategoryId, isOpen])

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

  const handleUpdate = (id: string, value: string) => {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, key: value } : item))
    )
  }

  const handleUpdateExample = (id: string, value: string) => {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, example: value } : item))
    )
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
                {categories.map((item) => (
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
              <div
                key={item.id}
                className="modal-list-row"
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleReorder(item.id)}
              >
                <span className="drag-handle" role="img" aria-label="Drag handle">
                  <GripVertical className="h-4 w-4" aria-hidden="true" />
                </span>
                <Input
                  aria-label="Preset field"
                  className="modal-list-field bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                  placeholder="参数名称"
                  value={item.key}
                  onChange={(event) => handleUpdate(item.id, event.target.value)}
                />
                <Input
                  aria-label="Format example"
                  className="modal-list-field bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                  placeholder="格式示例"
                  value={item.example}
                  onChange={(event) => handleUpdateExample(item.id, event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="dialog-action-delete"
                  aria-label="Delete field"
                  onClick={() => handleRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </ModalForm>
  )
}

