import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CommissionArchiveModalProps {
  isOpen: boolean
  categories: Array<{ id: string; name: string; parentId?: string | null; parentName?: string }>
  selectedCategoryId: string
  itemCount: number
  isSubmitting?: boolean
  isLoading?: boolean
  onCategoryChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}

const LABELS = {
  title: "选择归档分类",
  description: "请选择一级分类和二级分类后确认归档。",
  parentLoading: "正在加载一级分类...",
  parentEmpty: "暂无一级分类",
  childLoading: "正在加载二级分类...",
  childEmpty: "暂无二级分类",
  cancel: "取消",
  confirming: "归档中...",
  confirm: "确认归档",
}

export default function CommissionArchiveModal({
  isOpen,
  categories,
  selectedCategoryId,
  itemCount,
  isSubmitting = false,
  isLoading = false,
  onCategoryChange,
  onConfirm,
  onClose,
}: CommissionArchiveModalProps) {
  const parentCategories = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ id: string; name: string }> = []

    categories.forEach((category) => {
      const parentId = category.parentId ?? category.id
      const parentName = category.parentName || category.name
      const key = `${parentId}::${parentName}`
      if (seen.has(key)) return
      seen.add(key)
      result.push({ id: parentId, name: parentName })
    })

    return result
  }, [categories])

  const selectedParentId = useMemo(() => {
    const selected = categories.find((category) => category.id === selectedCategoryId)
    if (selected) {
      return selected.parentId ?? selected.id
    }
    return parentCategories[0]?.id ?? ""
  }, [categories, parentCategories, selectedCategoryId])

  const childCategories = useMemo(
    () =>
      categories.filter((category) => {
        const parentId = category.parentId ?? category.id
        return parentId === selectedParentId
      }),
    [categories, selectedParentId]
  )

  const canConfirm =
    !!selectedCategoryId &&
    childCategories.some((category) => category.id === selectedCategoryId) &&
    itemCount > 0 &&
    !isSubmitting

  const parentEmptyHint = isLoading ? LABELS.parentLoading : LABELS.parentEmpty
  const childEmptyHint = isLoading ? LABELS.childLoading : LABELS.childEmpty

  const handleParentChange = (parentId: string) => {
    const firstChild = categories.find((category) => {
      const currentParentId = category.parentId ?? category.id
      return currentParentId === parentId
    })
    if (firstChild) {
      onCategoryChange(firstChild.id)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{LABELS.title}</DialogTitle>
          <DialogDescription className="sr-only">{LABELS.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Select
                value={selectedParentId}
                onValueChange={handleParentChange}
                disabled={isLoading || parentCategories.length === 0}
              >
                <SelectTrigger aria-label="Archive parent category">
                  <SelectValue placeholder={parentEmptyHint} />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.length === 0 ? (
                    <SelectItem value="__empty_parent" disabled>
                      {parentEmptyHint}
                    </SelectItem>
                  ) : (
                    parentCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select
                value={selectedCategoryId}
                onValueChange={onCategoryChange}
                disabled={isLoading || childCategories.length === 0}
              >
                <SelectTrigger aria-label="Archive child category">
                  <SelectValue placeholder={childEmptyHint} />
                </SelectTrigger>
                <SelectContent>
                  {childCategories.length === 0 ? (
                    <SelectItem value="__empty_child" disabled>
                      {childEmptyHint}
                    </SelectItem>
                  ) : (
                    childCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {LABELS.cancel}
          </Button>
          <Button onClick={onConfirm} disabled={!canConfirm}>
            {isSubmitting ? LABELS.confirming : LABELS.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
