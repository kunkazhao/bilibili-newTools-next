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
  categories: Array<{ id: string; name: string }>
  selectedCategoryId: string
  itemCount: number
  isSubmitting?: boolean
  isLoading?: boolean
  onCategoryChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
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
  const canConfirm =
    !!selectedCategoryId && categories.length > 0 && itemCount > 0 && !isSubmitting
  const emptyHint = isLoading ? "正在加载分类..." : "暂无可用分类"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>归档商品</DialogTitle>
          <DialogDescription>
            将当前 {itemCount} 个商品归档到选品库分类中。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-slate-600">选择归档分类</div>
          <Select
            value={selectedCategoryId}
            onValueChange={onCategoryChange}
            disabled={isLoading || categories.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={emptyHint} />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  {emptyHint}
                </SelectItem>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={!canConfirm}>
            {isSubmitting ? "归档中..." : "确认归档"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

