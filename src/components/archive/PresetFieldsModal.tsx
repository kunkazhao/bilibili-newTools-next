import { useEffect, useMemo, useState } from "react"
import ModalForm from "@/components/ModalForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Trash2 } from "lucide-react"
import type { CategoryItem } from "@/components/archive/types"

interface PresetFieldsModalProps {
  isOpen: boolean
  categories: CategoryItem[]
  selectedCategoryId: string
  onClose: () => void
  onSave: (categoryId: string, fields: { key: string }[]) => void
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
  const [drafts, setDrafts] = useState<string[]>([])
  const [newField, setNewField] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [dragKey, setDragKey] = useState<string | null>(null)

  useEffect(() => {
    setActiveCategoryId(defaultCategoryId)
  }, [defaultCategoryId, isOpen])

  useEffect(() => {
    const target = categories.find((item) => item.id === activeCategoryId)
    setDrafts(target?.specFields?.map((field) => field.key) ?? [])
    setErrorMessage("")
  }, [activeCategoryId, categories])

  const trimmedSet = useMemo(
    () => new Set(drafts.map((item) => item.trim()).filter(Boolean)),
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
    setDrafts((prev) => [...prev, trimmed])
    setNewField("")
    setErrorMessage("")
  }

  const handleUpdate = (index: number, value: string) => {
    setDrafts((prev) => prev.map((item, idx) => (idx === index ? value : item)))
  }

  const handleRemove = (index: number) => {
    setDrafts((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSave = () => {
    const trimmed = drafts.map((item) => item.trim())
    if (trimmed.some((item) => item === "")) {
      setErrorMessage("参数名称不能为空")
      return
    }
    if (new Set(trimmed).size !== trimmed.length) {
      setErrorMessage("参数名称重复")
      return
    }
    if (!activeCategoryId) return
    onSave(activeCategoryId, trimmed.map((item) => ({ key: item })))
    setErrorMessage("")
    onClose()
  }

  const handleReorder = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return
    const current = [...drafts]
    const fromIndex = current.indexOf(dragKey)
    const toIndex = current.indexOf(targetKey)
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
            <Select
              value={activeCategoryId}
              onValueChange={(value) => setActiveCategoryId(value)}
            >
              <SelectTrigger>
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
              placeholder="新增参数"
              value={newField}
              onChange={(event) => setNewField(event.target.value)}
            />
            <Button type="button" onClick={handleAdd}>
              新增
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <div className="text-xs text-rose-500">{errorMessage}</div>
        ) : null}

        <div className="space-y-2">
          {drafts.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              draggable
              onDragStart={() => setDragKey(item)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleReorder(item)}
            >
              <GripVertical className="h-4 w-4 text-slate-400" />
              <Input
                value={item}
                onChange={(event) => handleUpdate(index, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-500"
                onClick={() => handleRemove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ModalForm>
  )
}
