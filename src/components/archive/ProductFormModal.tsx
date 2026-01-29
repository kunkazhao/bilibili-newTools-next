import { useEffect, useState } from "react"
import ModalForm from "@/components/ModalForm"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"

interface CategoryOption {
  label: string
  value: string
}

interface ProductFormValues {
  promoLink: string
  title: string
  price: string
  commission: string
  commissionRate: string
  sales30: string
  comments: string
  image: string
  blueLink: string
  categoryId: string
  accountName: string
  shopName: string
  remark: string
  params: Record<string, string>
}

interface ProductFormModalProps {
  isOpen: boolean
  categories: CategoryOption[]
  presetFields: { key: string }[]
  initialValues?: ProductFormValues
  onClose: () => void
  onSubmit: (values: ProductFormValues) => void
  onParsePromo?: (link: string) => void
  toast?: { message: string; variant?: "default" | "success" | "error" | "info" }
  onToastDismiss?: () => void
}

const emptyValues: ProductFormValues = {
  promoLink: "",
  title: "",
  price: "",
  commission: "",
  commissionRate: "",
  sales30: "",
  comments: "",
  image: "",
  blueLink: "",
  categoryId: "",
  accountName: "",
  shopName: "",
  remark: "",
  params: {},
}

export default function ProductFormModal({
  isOpen,
  categories,
  presetFields,
  initialValues,
  onClose,
  onSubmit,
  onParsePromo,
  toast,
  onToastDismiss,
}: ProductFormModalProps) {
  const [values, setValues] = useState<ProductFormValues>(emptyValues)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setValues(initialValues ?? emptyValues)
    setErrors({})
  }, [initialValues, isOpen])

  const update = (key: keyof ProductFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (key === "promoLink" && errors.promoLink) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.promoLink
        return next
      })
    }
  }

  const handleParsePromo = () => {
    const trimmed = values.promoLink.trim()
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, promoLink: "不能为空" }))
      return
    }
    try {
      const url = new URL(trimmed)
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("invalid protocol")
      }
    } catch {
      setErrors((prev) => ({ ...prev, promoLink: "格式不正确" }))
      return
    }
    if (errors.promoLink) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.promoLink
        return next
      })
    }
    onParsePromo?.(trimmed)
  }

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {}
    if (!values.title.trim()) nextErrors.title = "必填"
    if (!values.price.trim()) nextErrors.price = "必填"
    if (!values.categoryId) nextErrors.categoryId = "必填"
    if (!values.blueLink.trim()) nextErrors.blueLink = "必填"
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit(values)
    onClose()
  }

  return (
    <ModalForm
      isOpen={isOpen}
      title={initialValues ? "编辑商品" : "新增商品"}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onSubmit={handleSubmit}
      confirmLabel="保存"
    >
      <ToastProvider duration={2400}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Label htmlFor="promo-link" className="w-20">
                推广链接
              </Label>
              <Input
                id="promo-link"
                className="flex-1"
                placeholder="粘贴京东推广链接"
                value={values.promoLink}
                onChange={(event) => update("promoLink", event.target.value)}
              />
              <Button type="button" variant="outline" onClick={handleParsePromo}>
                解析
              </Button>
            </div>
            <span className="min-h-[18px] text-xs text-rose-500">
              {errors.promoLink}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-[120px_1fr]">
              <div className="space-y-3">
                <Label>封面图片</Label>
                <div className="flex h-[110px] w-[110px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                  +
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>归属分类</Label>
                  <Select
                    value={values.categoryId}
                    onValueChange={(value) => update("categoryId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="min-h-[18px] text-xs text-rose-500">
                    {errors.categoryId}
                  </span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-title">商品标题</Label>
                  <Input
                    id="product-title"
                    value={values.title}
                    onChange={(event) => update("title", event.target.value)}
                  />
                  <span className="min-h-[18px] text-xs text-rose-500">
                    {errors.title}
                  </span>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="product-link">商品链接</Label>
                  <Input
                    id="product-link"
                    value={values.blueLink}
                    onChange={(event) => update("blueLink", event.target.value)}
                  />
                  <span className="min-h-[18px] text-xs text-rose-500">
                    {errors.blueLink}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="product-price">价格（元）</Label>
              <Input
                id="product-price"
                value={values.price}
                onChange={(event) => update("price", event.target.value)}
              />
              <span className="min-h-[18px] text-xs text-rose-500">
                {errors.price}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-commission">佣金（元）</Label>
              <Input
                id="product-commission"
                value={values.commission}
                onChange={(event) => update("commission", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-rate">佣金比例（%）</Label>
              <Input
                id="product-rate"
                value={values.commissionRate}
                onChange={(event) => update("commissionRate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-sales">30天销量</Label>
              <Input
                id="product-sales"
                value={values.sales30}
                onChange={(event) => update("sales30", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-comments">评价数</Label>
              <Input
                id="product-comments"
                value={values.comments}
                onChange={(event) => update("comments", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-shop">店铺</Label>
              <Input
                id="product-shop"
                value={values.shopName}
                onChange={(event) => update("shopName", event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">参数信息</div>
            <div className="grid gap-3 md:grid-cols-2">
              {presetFields.map((field) => (
                <div key={field.key} className="grid gap-2 md:grid-cols-2">
                  <Input value={field.key} readOnly />
                  <Input
                    placeholder="参数值"
                    value={values.params[field.key] ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        params: {
                          ...prev.params,
                          [field.key]: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Toast
          open={Boolean(toast?.message)}
          onOpenChange={(open) => {
            if (!open) onToastDismiss?.()
          }}
          variant={toast?.variant ?? "default"}
          className="absolute right-6 top-6 w-[280px]"
        >
          <ToastDescription>{toast?.message}</ToastDescription>
        </Toast>
        <ToastViewport className="absolute right-6 top-6" />
      </ToastProvider>
    </ModalForm>
  )
}
