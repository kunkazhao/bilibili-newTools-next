import { useEffect, useMemo, useState } from "react"
import ModalForm from "@/components/ModalForm"
import { Button } from "@/components/ui/button"
import type { CategoryItem } from "@/components/archive/types"

interface CategoryManagerModalProps {
  isOpen: boolean
  categories: CategoryItem[]
  onClose: () => void
  onSave: (nextCategories: CategoryItem[]) => void
}

export default function CategoryManagerModal({
  isOpen,
  categories,
  onClose,
  onSave,
}: CategoryManagerModalProps) {
  const [drafts, setDrafts] = useState<CategoryItem[]>([])
  const [newName, setNewName] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(categories.map((item) => ({ ...item })))
  }, [categories, isOpen])

  const namesSet = useMemo(
    () => new Set(drafts.map((item) => item.name.trim())),
    [drafts]
  )

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setErrorMessage("分类名称不能为空")
      return
    }
    if (namesSet.has(trimmed)) {
      setErrorMessage("分类名称重复")
      return
    }
    const next: CategoryItem = {
      id: `cat_${Date.now()}`,
      name: trimmed,
      sortOrder: drafts.length * 10,
    }
    setDrafts((prev) => [...prev, next])
    setNewName("")
    setErrorMessage("")
  }

  const handleRemove = (id: string) => {
    setDrafts((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdate = (id: string, value: string) => {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: value } : item))
    )
  }

  const handleSave = () => {
    const trimmedNames = drafts.map((item) => item.name.trim())
    if (trimmedNames.some((name) => name === "")) {
      setErrorMessage("分类名称不能为空")
      return
    }
    if (new Set(trimmedNames).size !== trimmedNames.length) {
      setErrorMessage("分类名称重复")
      return
    }
    const normalized = drafts.map((item, index) => ({
      ...item,
      name: item.name.trim(),
      sortOrder: (index + 1) * 10,
    }))
    onSave(normalized)
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
      title="分类管理"
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onSubmit={handleSave}
      confirmLabel="保存"
    >
      <div className="flex items-center gap-3">
        <input
          className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          placeholder="新增分类"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button type="button" onClick={handleAdd}>
          新增
        </Button>
      </div>

      {errorMessage ? <div className="text-xs text-rose-500">{errorMessage}</div> : null}

      <div className="space-y-2">
        {drafts.map((item) => (
          <div
            key={item.id}
            className="modal-list-row"
            draggable
            onDragStart={() => setDragId(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleReorder(item.id)}
          >
            <span className="cursor-grab text-xs text-slate-400">拖拽</span>
            <input
              className="modal-list-field bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              value={item.name}
              onChange={(event) => handleUpdate(item.id, event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => handleRemove(item.id)}
            >
              删除
            </Button>
          </div>
        ))}
      </div>
    </ModalForm>
  )
}
