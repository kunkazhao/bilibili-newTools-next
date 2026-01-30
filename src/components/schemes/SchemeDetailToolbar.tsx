import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"

type SchemeDetailToolbarProps = {
  priceMin: string
  priceMax: string
  sortValue: string
  onPriceMinChange: (value: string) => void
  onPriceMaxChange: (value: string) => void
  onSortChange: (value: string) => void
  onResetPrice: () => void
  onClearFiltered: () => void
  onClearItems: () => void
  onOpenPicker: () => void
}

export default function SchemeDetailToolbar({
  priceMin,
  priceMax,
  sortValue,
  onPriceMinChange,
  onPriceMaxChange,
  onSortChange,
  onResetPrice,
  onClearFiltered,
  onClearItems,
  onOpenPicker,
}: SchemeDetailToolbarProps) {
  const baseId = useId()
  const priceMinId = `${baseId}-price-min`
  const priceMaxId = `${baseId}-price-max`
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Field orientation="horizontal" className="items-center gap-2">
            <FieldLabel className="w-12" htmlFor={priceMinId}>价格</FieldLabel>
            <FieldContent className="flex items-center gap-2">
              <Input
                id={priceMinId} aria-label="Price min" className="w-20"
                value={priceMin}
                onChange={(event) => onPriceMinChange(event.target.value)}
                placeholder="低"
              />
              <span className="text-slate-400">-</span>
              <Input
                id={priceMaxId} aria-label="Price max" className="w-20"
                value={priceMax}
                onChange={(event) => onPriceMaxChange(event.target.value)}
                placeholder="高"
              />
            </FieldContent>
          </Field>
          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px]" aria-label="Sort">
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
          <Button variant="ghost" onClick={onResetPrice}>
            重置筛选
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClearFiltered}>
            清空筛选
          </Button>
          <Button variant="outline" onClick={onClearItems}>
            清空商品
          </Button>
          <Button onClick={onOpenPicker}>新增选品</Button>
        </div>
      </div>
    </section>
  )
}
