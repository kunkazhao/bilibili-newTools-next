import { useEffect, useMemo, useRef, useState, useId } from "react"
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
import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { getUserErrorMessage } from "@/lib/errorMessages"

interface CategoryOption {
  label: string
  value: string
}

interface ProductFormValues {
  promoLink: string
  taobaoPromoLink: string
  title: string
  price: string
  commission: string
  commissionRate: string
  sales30: string
  tbPrice: string
  tbCommissionRate: string
  tbSales: string
  comments: string
  image: string
  blueLink: string
  taobaoLink: string
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
  autoOpenCoverPicker?: boolean
  onClose: () => void
  onSubmit: (values: ProductFormValues) => void | Promise<void>
}

const emptyValues: ProductFormValues = {
  promoLink: "",
  taobaoPromoLink: "",
  title: "",
  price: "",
  commission: "",
  commissionRate: "",
  sales30: "",
  tbPrice: "",
  tbCommissionRate: "",
  tbSales: "",
  comments: "",
  image: "",
  blueLink: "",
  taobaoLink: "",
  categoryId: "",
  accountName: "",
  shopName: "",
  remark: "",
  params: {},
}

type JdProductInfo = {
  title: string
  price?: number
  commission?: number
  commissionRate?: number
  sales30Days?: number
  comments?: number
  image?: string
  shopName?: string
  materialUrl?: string
  standardUrl?: string
}

type TaobaoProductInfo = {
  title: string
  price?: string
  commissionRate?: number
  sales30?: number
  image?: string
  shopName?: string
  materialUrl?: string
}

const parseMaybeJson = (value: unknown) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown
    } catch {
      return null
    }
  }
  return value ?? null
}

const extractQueryResult = (payload: Record<string, any>) => {
  const direct = parseMaybeJson(payload?.queryResult)
  if (direct) return direct as Record<string, any>
  const msgPayload = parseMaybeJson(payload?.msg) as Record<string, any> | null
  const nested = msgPayload?.jd_union_open_goods_query_responce as Record<string, any> | undefined
  const queryResult = nested?.queryResult ?? msgPayload?.queryResult
  return parseMaybeJson(queryResult) as Record<string, any> | null
}

const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const normalizeRateNumber = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  const raw = String(value).replace("%", "").trim()
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : undefined
}

const ensureHttp = (value: string) => {
  if (!value) return ""
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return `https://${value}`
}

const pickImageUrl = (product: Record<string, any>) => {
  const imageInfo = product?.imageInfo
  const list = imageInfo?.imageList ?? product?.imageList ?? product?.imageUrls ?? []
  if (Array.isArray(list) && list.length > 0) {
    const first = list[0]
    if (typeof first === "string") return first
    if (first?.url) return first.url as string
  }
  if (typeof product?.image === "string") return product.image as string
  if (typeof product?.imgUrl === "string") return product.imgUrl as string
  return ""
}

const extractJdKeyword = (url: string) => {
  if (!url) return url
  const itemMatch = url.match(/item\.jd\.com\/(\d+)\.html/i)
  if (itemMatch) return itemMatch[1]
  if (url.includes("union-click.jd.com") || url.includes("jdc.jd.com")) return url
  if (url.includes("jingfen.jd.com")) return url
  const skuMatch = url.match(/sku\/(\d+)/i)
  if (skuMatch) return skuMatch[1]
  const productMatch = url.match(/product\/(\d+)/i)
  if (productMatch) return productMatch[1]
  const paramMatch = url.match(/[?&](?:skuId|sku|productId|wareId|id)=(\d{6,})/i)
  if (paramMatch) return paramMatch[1]
  return url
}

const isTaobaoLink = (url: string) =>
  /taobao\.com|tmall\.com|tmall\.hk|click\.taobao|uland\.taobao/i.test(url)

const resolveJdUrl = async (url: string) => {
  if (!url || url.includes("item.jd.com")) return url
  try {
    const data = await apiRequest<{ resolvedUrl?: string }>("/api/jd/resolve", {
      method: "POST",
      body: JSON.stringify({ url }),
    })
    return data.resolvedUrl || url
  } catch {
    return url
  }
}

const resolveTaobaoLink = async (url: string) => {
  const data = await apiRequest<{ itemId?: string; openIid?: string }>(
    "/api/taobao/resolve",
    {
      method: "POST",
      body: JSON.stringify({ url }),
    }
  )
  return {
    itemId: data.itemId || "",
    openIid: data.openIid || "",
  }
}

const fetchJdProduct = async (keyword: string, originalLink: string) => {
  const data = await apiRequest<Record<string, any>>("/api/jd/product", {
    method: "POST",
    body: JSON.stringify({ keyword }),
  })

  const code = data?.code
  if (code !== undefined && code !== "0" && code !== 0) {
    throw new Error(data?.msg || "商品解析失败")
  }

  const queryResult = extractQueryResult(data)
  if (!queryResult || queryResult?.code !== 200 || !Array.isArray(queryResult?.data)) {
    throw new Error("未找到商品信息")
  }
  const product = queryResult.data[0] as Record<string, any> | undefined
  if (!product) {
    throw new Error("未找到商品信息")
  }

  const materialUrl = ensureHttp(product?.materialUrl || originalLink)
  return {
    title: (product?.skuName as string) || "未知商品",
    price: normalizeNumber(product?.priceInfo?.price),
    commission: normalizeNumber(product?.commissionInfo?.commission),
    commissionRate: normalizeNumber(product?.commissionInfo?.commissionShare),
    sales30Days: normalizeNumber(product?.inOrderCount30Days),
    comments: normalizeNumber(product?.comments),
    image: pickImageUrl(product),
    shopName: (product?.shopInfo?.shopName as string) || "",
    materialUrl,
  } as JdProductInfo
}

const fetchTaobaoProduct = async (itemId: string, openIid?: string) => {
  const data = await apiRequest<Record<string, any>>("/api/taobao/product", {
    method: "POST",
    body: JSON.stringify({
      item_id: itemId || undefined,
      open_iid: openIid || undefined,
    }),
  })
  return {
    title: String(data?.title || ""),
    price: data?.price !== undefined ? String(data.price) : "",
    commissionRate: normalizeRateNumber(data?.commissionRate),
    sales30: normalizeNumber(data?.sales30 ?? data?.volume),
    image: String(data?.cover || ""),
    shopName: String(data?.shopName || ""),
    materialUrl: String(data?.materialUrl || ""),
  } as TaobaoProductInfo
}

export default function ProductFormModal({
  isOpen,
  categories,
  presetFields,
  initialValues,
  defaultCategoryId,
  autoOpenCoverPicker,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const { showToast } = useToast()
  const [values, setValues] = useState<ProductFormValues>(emptyValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isJdParsing, setIsJdParsing] = useState(false)
  const [isTbParsing, setIsTbParsing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const baseId = useId()
  const coverInputId = `${baseId}-cover`
  const categorySelectId = `${baseId}-category`
  const initialValuesKey = useMemo(
    () => JSON.stringify({ initialValues: initialValues ?? {}, defaultCategoryId: defaultCategoryId ?? "" }),
    [initialValues, defaultCategoryId]
  )

  useEffect(() => {
    const nextValues = { ...emptyValues, ...(initialValues ?? {}) }
    if (!nextValues.categoryId && defaultCategoryId) {
      nextValues.categoryId = defaultCategoryId
    }
    setValues(nextValues)
    setErrors({})
  }, [initialValuesKey, isOpen, defaultCategoryId])

  useEffect(() => {
    if (!isOpen || !autoOpenCoverPicker) return
    const timer = window.setTimeout(() => {
      coverInputRef.current?.click()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [autoOpenCoverPicker, isOpen])

  const computedCommission = useMemo(() => {
    const price = Number(values.price || 0)
    const rate = Number(values.commissionRate || 0)
    if (!Number.isFinite(price) || !Number.isFinite(rate)) return ""
    return ((price * rate) / 100).toFixed(2)
  }, [values.price, values.commissionRate])

  const computedTbCommission = useMemo(() => {
    const price = Number(values.tbPrice || 0)
    const rate = Number(values.tbCommissionRate || 0)
    if (!Number.isFinite(price) || !Number.isFinite(rate)) return ""
    return ((price * rate) / 100).toFixed(2)
  }, [values.tbPrice, values.tbCommissionRate])


  const update = (key: keyof ProductFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (key === "promoLink" && errors.promoLink) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.promoLink
        return next
      })
    }
    if (key === "taobaoPromoLink" && errors.taobaoPromoLink) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.taobaoPromoLink
        return next
      })
    }
    if (key === "taobaoLink" && errors.taobaoLink) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.taobaoLink
        return next
      })
    }
  }

  const handleParseJd = async () => {
    const trimmed = values.promoLink.trim()
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, promoLink: "必填" }))
      return
    }
    try {
      const url = new URL(trimmed)
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("invalid protocol")
      }
    } catch {
      setErrors((prev) => ({ ...prev, promoLink: "请输入有效链接" }))
      return
    }
    if (isTaobaoLink(trimmed)) {
      showToast("当前是淘宝链接，请使用淘宝解析", "error")
      return
    }
    if (errors.promoLink) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.promoLink
        return next
      })
    }
    if (isJdParsing) return
    setIsJdParsing(true)
    update("promoLink", trimmed)
    try {
      const resolvedInput = await resolveJdUrl(trimmed)
      const keywordSource =
        trimmed.includes("union-click.jd.com") ||
        trimmed.includes("jdc.jd.com") ||
        trimmed.includes("jingfen.jd.com")
          ? trimmed
          : resolvedInput
      const keyword = extractJdKeyword(keywordSource)
      const product = await fetchJdProduct(keyword, trimmed)
      const materialUrl = product.materialUrl || resolvedInput || trimmed
      let standardUrl = materialUrl
      if (!standardUrl.includes("item.jd.com")) {
        standardUrl = resolvedInput.includes("item.jd.com")
          ? resolvedInput
          : await resolveJdUrl(materialUrl)
      }
      setValues((prev) => {
        const hasTitle = Boolean(prev.title?.trim())
        const hasImage = Boolean(prev.image?.trim())
        return {
          ...prev,
          title: hasTitle ? prev.title : product.title || prev.title,
          blueLink: standardUrl || prev.blueLink,
          price:
            product.price !== undefined ? String(product.price) : prev.price,
          commission:
            product.commission !== undefined
              ? String(product.commission)
              : prev.commission,
          commissionRate:
            product.commissionRate !== undefined
              ? String(product.commissionRate)
              : prev.commissionRate,
          sales30:
            product.sales30Days !== undefined
              ? String(product.sales30Days)
              : prev.sales30,
          comments:
            product.comments !== undefined
              ? String(product.comments)
              : prev.comments,
          shopName: product.shopName || prev.shopName,
          image: hasImage ? prev.image : product.image || prev.image,
        }
      })
      showToast("\u89e3\u6790\u6210\u529f", "success")
    } catch (error) {
      showToast(
        getUserErrorMessage(error, "\u89e3\u6790\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5"),
        "error"
      )
    } finally {
      setIsJdParsing(false)
    }
  }

  const handleParseTaobao = async () => {
    const trimmed = values.taobaoPromoLink.trim()
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, taobaoPromoLink: "必填" }))
      return
    }
    if (!isTaobaoLink(trimmed)) {
      setErrors((prev) => ({ ...prev, taobaoPromoLink: "请填写淘宝/天猫链接" }))
      return
    }
    if (errors.taobaoPromoLink) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.taobaoPromoLink
        return next
      })
    }
    if (isTbParsing) return
    setIsTbParsing(true)
    update("taobaoPromoLink", trimmed)
    try {
      const resolved = await resolveTaobaoLink(trimmed)
      const itemId = resolved.itemId || resolved.openIid
      if (!itemId) {
        throw new Error("无法解析淘宝商品ID")
      }
      const product = await fetchTaobaoProduct(itemId, resolved.openIid)
      setValues((prev) => {
        const hasTitle = Boolean(prev.title?.trim())
        const hasImage = Boolean(prev.image?.trim())
        return {
          ...prev,
          title: hasTitle ? prev.title : product.title || prev.title,
          taobaoLink: product.materialUrl || prev.taobaoLink || trimmed,
          tbPrice: product.price ? String(product.price) : prev.tbPrice,
          tbCommissionRate:
            product.commissionRate !== undefined
              ? String(product.commissionRate)
              : prev.tbCommissionRate,
          tbSales:
            product.sales30 !== undefined
              ? String(product.sales30)
              : prev.tbSales,
          shopName: product.shopName || prev.shopName,
          image: hasImage ? prev.image : product.image || prev.image,
        }
      })
      showToast("\u89e3\u6790\u6210\u529f", "success")
    } catch (error) {
      showToast(
        getUserErrorMessage(error, "\u89e3\u6790\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5"),
        "error"
      )
    } finally {
      setIsTbParsing(false)
    }
  }

  const handleSubmit = () => {
    if (isUploading) {
      showToast("封面上传中，请稍候", "info")
      return
    }
    const trimmedPromoLink = values.promoLink.trim()
    const taobaoPromoLink = values.taobaoPromoLink.trim()
    const resolvedTaobaoLink =
      values.taobaoLink.trim() || taobaoPromoLink
    const resolvedBlueLink = values.blueLink.trim() || trimmedPromoLink
    const nextErrors: Record<string, string> = {}
    if (!values.title.trim()) nextErrors.title = "必填"
    if (!values.price.trim()) nextErrors.price = "必填"
    if (!values.categoryId) nextErrors.categoryId = "必填"
    if (!resolvedBlueLink && !resolvedTaobaoLink) {
      nextErrors.blueLink = "必填"
      nextErrors.taobaoLink = "必填"
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showToast("请完善必填项后再保存", "error")
      const focusOrder: Array<keyof typeof nextErrors> = [
        "promoLink",
        "taobaoPromoLink",
        "categoryId",
        "title",
        "blueLink",
        "taobaoLink",
        "price",
      ]
      const firstKey = focusOrder.find((key) => nextErrors[key])
      const focusMap: Record<string, string> = {
        promoLink: "promo-link",
        taobaoPromoLink: "taobao-promo-link",
        categoryId: categorySelectId,
        title: "product-title",
        blueLink: "product-link",
        taobaoLink: "taobao-link",
        price: "product-price",
      }
      const focusId = firstKey ? focusMap[firstKey] : undefined
      if (focusId) {
        const target = document.getElementById(focusId)
        target?.scrollIntoView({ block: "center", behavior: "smooth" })
        if (target && "focus" in target) {
          ;(target as HTMLElement).focus()
        }
      }
      return
    }
    const result = onSubmit({
      ...values,
      promoLink: trimmedPromoLink,
      blueLink: resolvedBlueLink,
      taobaoLink: resolvedTaobaoLink,
      commission: computedCommission,
    })
    if (result && typeof (result as Promise<void>).then === "function") {
      const successMessage = initialValues ? "商品已更新" : "商品已新增"
      const errorMessage = initialValues ? "更新失败" : "新增失败"
      ;(result as Promise<void>)
        .then(() => showToast(successMessage, "success"))
        .catch((error) => {
          const message = getUserErrorMessage(error, errorMessage)
          showToast(message, "error")
        })
    }
    onClose()
  }

  const handleCoverUpload = async (file: File) => {
    if (!file) return
    if (isUploading) return
    const previous = values.image
    const previewUrl = URL.createObjectURL(file)
    setValues((prev) => ({ ...prev, image: previewUrl }))
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/sourcing/covers", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        let message = "封面上传失败"
        try {
          const detail = (await response.json()) as { detail?: string; message?: string }
          message = detail?.detail || detail?.message || message
        } catch {
          // ignore
        }
        throw new Error(message)
      }
      const data = (await response.json()) as { url?: string }
      if (!data?.url) {
        throw new Error("封面上传失败")
      }
      setValues((prev) => ({ ...prev, image: data.url || "" }))
      showToast("封面已上传", "success")
    } catch (error) {
      setValues((prev) => ({ ...prev, image: previous }))
      showToast(
        getUserErrorMessage(error, "封面上传失败"),
        "error"
      )
    } finally {
      URL.revokeObjectURL(previewUrl)
      if (coverInputRef.current) {
        coverInputRef.current.value = ""
      }
      setIsUploading(false)
    }
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
      size="lg"
      closeOnOverlayClick={false}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Label htmlFor="promo-link" className="w-24">
              京东推广链接
            </Label>
            <Input
              id="promo-link"
              className="flex-1"
              placeholder="粘贴京东推广链接"
              value={values.promoLink}
              onChange={(event) => update("promoLink", event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              data-testid="parse-jd"
              onClick={handleParseJd}
              disabled={isJdParsing}
            >
              {isJdParsing ? "解析中..." : "解析"}
            </Button>
          </div>
          <span className="min-h-[18px] text-xs text-rose-500">
            {errors.promoLink}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Label htmlFor="taobao-promo-link" className="w-24">
              淘宝推广链接
            </Label>
            <Input
              id="taobao-promo-link"
              className="flex-1"
              placeholder="粘贴淘宝/天猫推广链接"
              value={values.taobaoPromoLink}
              onChange={(event) => update("taobaoPromoLink", event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              data-testid="parse-taobao"
              onClick={handleParseTaobao}
              disabled={isTbParsing}
            >
              {isTbParsing ? "解析中..." : "解析"}
            </Button>
          </div>
          <span className="min-h-[18px] text-xs text-rose-500">
            {errors.taobaoPromoLink}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[120px_1fr]">
            <div className="space-y-3">
              <Label>封面图片</Label>
              <div className="relative h-[110px] w-[110px] overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50">
                {values.image ? (
                  <img
                    src={values.image}
                    alt={values.title || "封面"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    +
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={coverInputId} name="cover" aria-label="Cover image" ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void handleCoverUpload(file)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading
                    ? "上传中..."
                    : values.image
                    ? "更换封面"
                    : "上传封面"}
                </Button>
                {values.image ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => update("image", "")}
                  >
                    移除
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>归属分类</Label>
                <Select
                  value={values.categoryId}
                  onValueChange={(value) => update("categoryId", value)}
                >
                  <SelectTrigger id={categorySelectId}>
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
              <div className="space-y-2">
                <Label htmlFor="product-link">京东链接</Label>
                <Input
                  id="product-link"
                  value={values.blueLink}
                  onChange={(event) => update("blueLink", event.target.value)}
                />
                <span className="min-h-[18px] text-xs text-rose-500">
                  {errors.blueLink}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taobao-link">淘宝链接</Label>
                <Input
                  id="taobao-link"
                  value={values.taobaoLink}
                  onChange={(event) => update("taobaoLink", event.target.value)}
                />
                <span className="min-h-[18px] text-xs text-rose-500">
                  {errors.taobaoLink}
                </span>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-remark">总结</Label>
                <Input
                  id="product-remark"
                  placeholder="请输入总结"
                  value={values.remark}
                  onChange={(event) => update("remark", event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-xs font-semibold text-rose-500">
              JD
            </span>
            <span>京东数据</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="product-price">价格</Label>
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
              <Label htmlFor="product-commission">佣金</Label>
              <Input id="product-commission" value={computedCommission} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-rate">佣金比例</Label>
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
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-xs font-semibold text-amber-500">
              TB
            </span>
            <span>淘宝数据</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tb-price">淘宝价格</Label>
              <Input
                id="tb-price"
                value={values.tbPrice}
                onChange={(event) => update("tbPrice", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tb-commission">淘宝佣金</Label>
              <Input id="tb-commission" value={computedTbCommission} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tb-rate">淘宝佣金比例</Label>
              <Input
                id="tb-rate"
                value={values.tbCommissionRate}
                onChange={(event) => update("tbCommissionRate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tb-sales">淘宝30天销量</Label>
              <Input
                id="tb-sales"
                value={values.tbSales}
                onChange={(event) => update("tbSales", event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">参数信息</div>
          <div className="grid gap-3 md:grid-cols-2">
            {presetFields.map((field) => (
              <div key={field.key} className="grid gap-2 md:grid-cols-2">
                <Input aria-label="Parameter name" value={field.key} readOnly />
                <Input
                  aria-label="Parameter value" placeholder="参数值"
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
    </ModalForm>
  )
}
