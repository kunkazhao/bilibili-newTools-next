import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SchemeDetailToolbarProps = {
  sortValue: string
  onSortChange: (value: string) => void
  onClearItems: () => void
  onOpenPicker: () => void
}

export default function SchemeDetailToolbar({
  sortValue,
  onSortChange,
  onClearItems,
  onOpenPicker,
}: SchemeDetailToolbarProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger
            className="h-8 w-[120px] px-2 text-xs"
            aria-label="Sort"
          >
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">手动排序</SelectItem>
            <SelectItem value="price-asc">价格从低到高</SelectItem>
            <SelectItem value="price-desc">价格从高到低</SelectItem>
            <SelectItem value="commission-desc">佣金比例从高到低</SelectItem>
            <SelectItem value="sales-desc">30天销量从高到低</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={onClearItems}
        >
          清空列表
        </Button>
        <Button size="sm" className="h-8 px-2 text-xs" onClick={onOpenPicker}>
          新增选品
        </Button>
      </div>
    </section>
  )
}
