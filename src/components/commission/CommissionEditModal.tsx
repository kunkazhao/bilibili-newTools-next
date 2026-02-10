import { useEffect, useMemo, useState, useId } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"

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

  const handleSave = () => {
    onSave({
      title: localTitle.trim(),
      price: Number(localPrice || 0),
      commissionRate: Number(localRate || 0),
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        className="sm:max-w-[520px]"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>编辑商品</DialogTitle>
          <DialogDescription>修改商品信息后保存。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field orientation="horizontal" className="items-start">
            <FieldLabel className="w-20 pt-2" htmlFor={titleId}>
              标题
            </FieldLabel>
            <FieldContent className="flex-1">
              <Input id={titleId} value={localTitle} onChange={(event) => setLocalTitle(event.target.value)} />
            </FieldContent>
          </Field>
          <Field orientation="horizontal" className="items-start">
            <FieldLabel className="w-20 pt-2" htmlFor={priceId}>
              价格
            </FieldLabel>
            <FieldContent className="flex-1">
              <Input id={priceId} value={localPrice} onChange={(event) => setLocalPrice(event.target.value)} />
            </FieldContent>
          </Field>
          <Field orientation="horizontal" className="items-start">
            <FieldLabel className="w-20 pt-2" htmlFor={commissionId}>
              佣金
            </FieldLabel>
            <FieldContent className="flex-1">
              <Input id={commissionId} value={computedCommission.toFixed(2)} disabled />
            </FieldContent>
          </Field>
          <Field orientation="horizontal" className="items-start">
            <FieldLabel className="w-20 pt-2" htmlFor={rateId}>
              佣金比例
            </FieldLabel>
            <FieldContent className="flex-1">
              <Input id={rateId} value={localRate} onChange={(event) => setLocalRate(event.target.value)} />
            </FieldContent>
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
