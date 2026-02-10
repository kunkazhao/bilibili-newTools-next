import { useEffect, useMemo, useState } from "react"
import ModalForm from "@/components/ModalForm"
import { Button } from "@/components/ui/button"
import EditableListRow from "@/components/ui/editable-list-row"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus } from "lucide-react"
import type { CategoryItem } from "@/components/archive/types"

interface CategoryManagerModalProps {
  isOpen: boolean
  categories: CategoryItem[]
  onClose: () => void
  onSave: (nextCategories: CategoryItem[]) => void
}

type DragState = { id: string; type: "parent" | "child" } | null

const buildOrderMap = (items: CategoryItem[]) =>
  new Map(items.map((item, index) => [item.id, (index + 1) * 10]))

const reorderList = (items: CategoryItem[], dragId: string, targetId: string) => {
  if (dragId === targetId) return items
  const list = [...items]
  const fromIndex = list.findIndex((item) => item.id === dragId)
  const toIndex = list.findIndex((item) => item.id === targetId)
  if (fromIndex === -1 || toIndex === -1) return items
  const [moved] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, moved)
  return list
}

const getNextSortOrder = (items: CategoryItem[]) => {
  const maxSort = Math.max(0, ...items.map((item) => item.sortOrder ?? 0))
  return maxSort + 10
}

export default function CategoryManagerModal({
  isOpen,
  categories,
  onClose,
  onSave,
}: CategoryManagerModalProps) {
  const [drafts, setDrafts] = useState<CategoryItem[]>([])
  const [activeParentId, setActiveParentId] = useState("")
  const [newParentName, setNewParentName] = useState("")
  const [newChildName, setNewChildName] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [dragState, setDragState] = useState<DragState>(null)
  const [editingParentId, setEditingParentId] = useState<string | null>(null)
  const [editingParentName, setEditingParentName] = useState("")
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editingChildName, setEditingChildName] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setDrafts(categories.map((item) => ({ ...item })))
    setEditingParentId(null)
    setEditingChildId(null)
    setEditingParentName("")
    setEditingChildName("")
  }, [categories, isOpen])

  const parentDrafts = useMemo(
    () =>
      drafts
        .filter((item) => !item.parentId)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [drafts]
  )

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CategoryItem[]>()
    drafts
      .filter((item) => item.parentId)
      .forEach((item) => {
        const parentId = String(item.parentId)
        if (!map.has(parentId)) {
          map.set(parentId, [])
        }
        map.get(parentId)?.push(item)
      })
    map.forEach((list) =>
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    )
    return map
  }, [drafts])

  const activeChildren = useMemo(() => {
    if (!activeParentId) return []
    return childrenByParent.get(activeParentId) ?? []
  }, [activeParentId, childrenByParent])

  useEffect(() => {
    if (!editingChildId) return
    if (!activeChildren.some((item) => item.id === editingChildId)) {
      setEditingChildId(null)
      setEditingChildName("")
    }
  }, [activeChildren, editingChildId])

  useEffect(() => {
    if (!parentDrafts.length) {
      setActiveParentId("")
      return
    }
    setActiveParentId((prev) =>
      parentDrafts.some((item) => item.id === prev) ? prev : parentDrafts[0].id
    )
  }, [parentDrafts])

  const handleAddParent = () => {
    const trimmed = newParentName.trim()
    if (!trimmed) {
      setErrorMessage("一级分类名称不能为空")
      return
    }
    const names = drafts.map((item) => item.name.trim())
    if (names.includes(trimmed)) {
      setErrorMessage("分类名称重复")
      return
    }
    const next: CategoryItem = {
      id: `cat_${Date.now()}`,
      name: trimmed,
      sortOrder: getNextSortOrder(parentDrafts),
      parentId: null,
    }
    setDrafts((prev) => [...prev, next])
    setNewParentName("")
    setErrorMessage("")
  }

  const handleAddChild = () => {
    const trimmed = newChildName.trim()
    if (!activeParentId) {
      setErrorMessage("请先选择一级分类")
      return
    }
    if (!trimmed) {
      setErrorMessage("二级分类名称不能为空")
      return
    }
    const names = drafts.map((item) => item.name.trim())
    if (names.includes(trimmed)) {
      setErrorMessage("分类名称重复")
      return
    }
    const siblings = childrenByParent.get(activeParentId) ?? []
    const next: CategoryItem = {
      id: `cat_${Date.now()}`,
      name: trimmed,
      sortOrder: getNextSortOrder(siblings),
      parentId: activeParentId,
    }
    setDrafts((prev) => [...prev, next])
    setNewChildName("")
    setErrorMessage("")
  }

  const handleRemoveParent = (id: string) => {
    if (editingParentId === id) {
      setEditingParentId(null)
      setEditingParentName("")
    }
    if (editingChildId) {
      const child = drafts.find((item) => item.id === editingChildId)
      if (child?.parentId === id) {
        setEditingChildId(null)
        setEditingChildName("")
      }
    }
    setDrafts((prev) =>
      prev.filter((item) => item.id !== id && item.parentId !== id)
    )
  }

  const handleRemoveChild = (id: string) => {
    if (editingChildId === id) {
      setEditingChildId(null)
      setEditingChildName("")
    }
    setDrafts((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdateName = (id: string, value: string) => {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: value } : item))
    )
  }

  const handleParentReorder = (targetId: string) => {
    if (!dragState || dragState.type !== "parent") return
    const ordered = reorderList(parentDrafts, dragState.id, targetId)
    const orderMap = buildOrderMap(ordered)
    setDrafts((prev) =>
      prev.map((item) =>
        item.parentId
          ? item
          : { ...item, sortOrder: orderMap.get(item.id) ?? item.sortOrder }
      )
    )
  }

  const handleChildReorder = (targetId: string) => {
    if (!dragState || dragState.type !== "child") return
    const ordered = reorderList(activeChildren, dragState.id, targetId)
    const orderMap = buildOrderMap(ordered)
    setDrafts((prev) =>
      prev.map((item) =>
        item.parentId === activeParentId
          ? { ...item, sortOrder: orderMap.get(item.id) ?? item.sortOrder }
          : item
      )
    )
  }

  const handleStartEditParent = (item: CategoryItem) => {
    setEditingParentId(item.id)
    setEditingParentName(item.name)
    setErrorMessage("")
  }

  const handleConfirmEditParent = (id: string) => {
    handleUpdateName(id, editingParentName)
    setEditingParentId(null)
    setEditingParentName("")
  }

  const handleCancelEditParent = () => {
    setEditingParentId(null)
    setEditingParentName("")
  }

  const handleStartEditChild = (item: CategoryItem) => {
    setEditingChildId(item.id)
    setEditingChildName(item.name)
    setErrorMessage("")
  }

  const handleConfirmEditChild = (id: string) => {
    handleUpdateName(id, editingChildName)
    setEditingChildId(null)
    setEditingChildName("")
  }

  const handleCancelEditChild = () => {
    setEditingChildId(null)
    setEditingChildName("")
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
    const normalizedParents = parentDrafts.map((item, index) => ({
      ...item,
      name: item.name.trim(),
      parentId: null,
      sortOrder: (index + 1) * 10,
    }))
    const normalizedChildren = parentDrafts.flatMap((parent) => {
      const list = childrenByParent.get(parent.id) ?? []
      return list.map((item, index) => ({
        ...item,
        name: item.name.trim(),
        parentId: parent.id,
        sortOrder: (index + 1) * 10,
      }))
    })
    onSave([...normalizedParents, ...normalizedChildren])
    setErrorMessage("")
    onClose()
  }

  return (
    <ModalForm
      isOpen={isOpen}
      size="xl"
      title="分类管理"
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onSubmit={handleSave}
      closeOnOverlayClick={false}
      confirmLabel="保存"
    >
      {errorMessage ? <div className="text-xs text-rose-500">{errorMessage}</div> : null}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700">一级分类</div>
          <div className="flex items-center gap-2">
            <input
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              placeholder="新增一级分类"
              value={newParentName}
              name="new-parent-category"
              aria-label="New parent category"
              onChange={(event) => setNewParentName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                handleAddParent()
              }}
            />
            
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-lg"
              aria-label="Add parent category"
              onClick={handleAddParent}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <ScrollArea className="dialog-list" data-dialog-scroll="true">
            <div className="space-y-2 pr-2">
              {parentDrafts.map((item) => (
                <EditableListRow
                  key={item.id}
                  className={`group cursor-pointer border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 ${
                    activeParentId === item.id ? "bg-slate-50" : ""
                  }`}
                  draggable
                  dragHandleAriaLabel="Drag handle"
                  onDragStart={() => setDragState({ id: item.id, type: "parent" })}
                  onDragEnd={() => setDragState(null)}
                  onDrop={() => handleParentReorder(item.id)}
                  onRowClick={() => setActiveParentId(item.id)}
                  editing={editingParentId === item.id}
                  editAriaLabel="Edit parent category"
                  deleteAriaLabel="Delete parent category"
                  onEdit={() => handleStartEditParent(item)}
                  onDelete={() => handleRemoveParent(item.id)}
                  onConfirm={() => handleConfirmEditParent(item.id)}
                  onCancel={handleCancelEditParent}
                  viewContent={(
                    <div className="modal-list-field border-transparent bg-transparent">
                      {item.name}
                    </div>
                  )}
                  editContent={(
                    <Input
                      aria-label="Parent category name"
                      className="modal-list-field focus-visible:ring-2 focus-visible:ring-brand/30"
                      value={editingParentId === item.id ? editingParentName : item.name}
                      onChange={(event) => setEditingParentName(event.target.value)}
                    />
                  )}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700">二级分类</div>
          <div className="flex items-center gap-2">
            <input
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              placeholder="新增二级分类"
              value={newChildName}
              name="new-child-category"
              aria-label="New child category"
              onChange={(event) => setNewChildName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                handleAddChild()
              }}
            />
            
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-lg"
              aria-label="Add child category"
              onClick={handleAddChild}
              disabled={!activeParentId}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <ScrollArea className="dialog-list" data-dialog-scroll="true">
            <div className="space-y-2 pr-2">
              {activeChildren.map((item) => (
                <EditableListRow
                  key={item.id}
                  className="group border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  draggable
                  dragHandleAriaLabel="Drag handle"
                  onDragStart={() => setDragState({ id: item.id, type: "child" })}
                  onDragEnd={() => setDragState(null)}
                  onDrop={() => handleChildReorder(item.id)}
                  editing={editingChildId === item.id}
                  editAriaLabel="Edit child category"
                  deleteAriaLabel="Delete child category"
                  onEdit={() => handleStartEditChild(item)}
                  onDelete={() => handleRemoveChild(item.id)}
                  onConfirm={() => handleConfirmEditChild(item.id)}
                  onCancel={handleCancelEditChild}
                  viewContent={(
                    <div className="modal-list-field border-transparent bg-transparent">
                      {item.name}
                    </div>
                  )}
                  editContent={(
                    <Input
                      aria-label="Child category name"
                      className="modal-list-field focus-visible:ring-2 focus-visible:ring-brand/30"
                      value={editingChildId === item.id ? editingChildName : item.name}
                      onChange={(event) => setEditingChildName(event.target.value)}
                    />
                  )}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </ModalForm>
  )
}
