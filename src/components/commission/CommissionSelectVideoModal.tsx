import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

export interface VideoItem {
  id: string
  title: string
  source: string
  tag: string
}

interface CategoryOption {
  id: string
  name: string
}

interface CommissionSelectVideoModalProps {
  isOpen: boolean
  isLoading?: boolean
  items: VideoItem[]
  parentCategories: CategoryOption[]
  childCategories: CategoryOption[]
  activeParentCategory: string
  activeChildCategory: string
  onParentCategoryChange: (value: string) => void
  onChildCategoryChange: (value: string) => void
  selected: string[]
  onToggle: (id: string) => void
  onStart: () => void
  onClose: () => void
}

export default function CommissionSelectVideoModal({
  isOpen,
  isLoading = false,
  items,
  parentCategories,
  childCategories,
  activeParentCategory,
  activeChildCategory,
  onParentCategoryChange,
  onChildCategoryChange,
  selected,
  onToggle,
  onStart,
  onClose,
}: CommissionSelectVideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle>选择对标视频</DialogTitle>
            <DialogDescription>Select benchmark videos.</DialogDescription>
            <div className="grid grid-cols-2 gap-3">
              <Select value={activeParentCategory} onValueChange={onParentCategoryChange}>
                <SelectTrigger aria-label="Benchmark parent category">
                  <SelectValue placeholder="暂无一级分类" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.length === 0 ? (
                    <SelectItem value="__empty_parent" disabled>
                      暂无一级分类
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
              <Select value={activeChildCategory} onValueChange={onChildCategoryChange}>
                <SelectTrigger aria-label="Benchmark child category">
                  <SelectValue placeholder="暂无二级分类" />
                </SelectTrigger>
                <SelectContent>
                  {childCategories.length === 0 ? (
                    <SelectItem value="__empty_child" disabled>
                      暂无二级分类
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
        </DialogHeader>

        <div className="mt-4 max-h-[320px] space-y-3 overflow-auto pr-1">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              正在加载对标视频...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              当前分类暂无可选视频
            </div>
          ) : (
            items.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <Checkbox
                  aria-label={item.title || "Select video"}
                  checked={selected.includes(item.id)}
                  onCheckedChange={() => onToggle(item.id)}
                />
                <div className="space-y-1">
                  <div className="font-medium text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-500">
                    {item.source} · {item.tag}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-center">
          <Button className="min-w-[140px]" onClick={onStart}>
            开始提取
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
