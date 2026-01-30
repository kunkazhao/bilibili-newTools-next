import { useEffect, useMemo, useState, useId } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { X } from "lucide-react"

interface CommissionEditModalProps {
  isOpen: boolean
  title: string
  price: number
  commissionRate: number
  onSave: (payload: { title: string; price: number; commissionRate: number }) => void
  onClose: () => void
}

export default function CommissionEditModal({
  isOpen,
  title,
  price,
  commissionRate,
  onSave,
  onClose,
}: CommissionEditModalProps) {
  const baseId = useId()
  const titleId = `${baseId}-title`
  const priceId = `${baseId}-price`
  const commissionId = `${baseId}-commission`
  const rateId = `${baseId}-rate`
  const [localTitle, setLocalTitle] = useState(title)
  const [localPrice, setLocalPrice] = useState(String(price || ""))
  const [localRate, setLocalRate] = useState(String(commissionRate || ""))

  useEffect(() => {
    setLocalTitle(title)
    setLocalPrice(String(price || ""))
    setLocalRate(String(commissionRate || ""))
  }, [title, price, commissionRate, isOpen])

  const computedCommission = useMemo(() => {
    const p = Number(localPrice || 0)
    const r = Number(localRate || 0)
    if (!Number.isFinite(p) || !Number.isFinite(r)) return 0
    return (p * r) / 100
  }, [localPrice, localRate])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="flex items-start justify-between">
          <DialogTitle>编辑商品</DialogTitle>
          <DialogDescription>Edit product details.</DialogDescription>
          <DialogClose asChild>
            <button type="button" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Field orientation="horizontal">
            <FieldLabel className="w-16" htmlFor={titleId}>标题</FieldLabel>
            <Input id={titleId} value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel className="w-16" htmlFor={priceId}>价格</FieldLabel>
            <Input id={priceId} value={localPrice} onChange={(e) => setLocalPrice(e.target.value)} />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel className="w-16" htmlFor={commissionId}>佣金</FieldLabel>
            <Input id={commissionId} value={computedCommission.toFixed(2)} disabled />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel className="w-16" htmlFor={rateId}>佣金比例</FieldLabel>
            <Input id={rateId} value={localRate} onChange={(e) => setLocalRate(e.target.value)} />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <Button
            className="min-w-[140px]"
            onClick={() => {
              onSave({
                title: localTitle.trim(),
                price: Number(localPrice || 0),
                commissionRate: Number(localRate || 0),
              })
              onClose()
            }}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
