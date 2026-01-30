import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { X } from "lucide-react"

export interface VideoItem {
  id: string
  title: string
  source: string
  tag: string
}

interface CommissionSelectVideoModalProps {
  isOpen: boolean
  items: VideoItem[]
  categories: { id: string; name: string }[]
  activeCategory: string
  onCategoryChange: (value: string) => void
  selected: string[]
  onToggle: (id: string) => void
  onStart: () => void
  onClose: () => void
}

export default function CommissionSelectVideoModal({
  isOpen,
  items,
  categories,
  activeCategory,
  onCategoryChange,
  selected,
  onToggle,
  onStart,
  onClose,
}: CommissionSelectVideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex items-start justify-between">
          <div className="space-y-2">
            <DialogTitle>选择对标视频</DialogTitle>
            <DialogDescription>Select benchmark videos.</DialogDescription>
            <div className="w-32">
              <Select value={activeCategory} onValueChange={onCategoryChange}>
                <SelectTrigger aria-label="Filter category">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogClose asChild>
            <button type="button" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="mt-4 max-h-[320px] space-y-3 overflow-auto pr-1">
          {items.map((item) => (
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
          ))}
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
