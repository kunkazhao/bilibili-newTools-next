import { useId } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import ProductFormModal from "@/components/archive/ProductFormModal"

type PickerItem = {
  id: string
  title?: string | null
  price?: number | null
}

type PickerDialogProps = {
  open: boolean
  keyword: string
  items: PickerItem[]
  selectedIds: Set<string>
  loading: boolean
  hasMore: boolean
  onOpenChange: (open: boolean) => void
  onKeywordChange: (value: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onToggleItem: (id: string, checked: boolean) => void
  onLoadMore: () => void
  onConfirm: () => void
}

type PromptDialogProps = {
  open: boolean
  value: string
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onSave: () => void
}

type FeishuDialogProps = {
  open: boolean
  productLink: string
  productMode: string
  specEnabled: boolean
  specLink: string
  specMode: string
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onProductLinkChange: (value: string) => void
  onProductModeChange: (value: string) => void
  onSpecEnabledChange: (value: boolean) => void
  onSpecLinkChange: (value: string) => void
  onSpecModeChange: (value: string) => void
  onSubmit: () => void
}

type ProductFormDialogProps = {
  open: boolean
  categories: { label: string; value: string }[]
  presetFields: { key: string }[]
  initialValues: Record<string, string | number | null>
  onClose: () => void
  onSubmit: (payload: Record<string, string | number | null>) => void
}

type SchemeDetailDialogsProps = {
  picker: PickerDialogProps
  prompt: PromptDialogProps
  feishu: FeishuDialogProps
  productForm: ProductFormDialogProps
  formatNumber: (value?: number | null) => string
}

export default function SchemeDetailDialogs({
  picker,
  prompt,
  feishu,
  productForm,
  formatNumber,
}: SchemeDetailDialogsProps) {
  const baseId = useId()
  const pickerSearchId = `${baseId}-picker-search`
  const promptId = `${baseId}-prompt`
  const productLinkId = `${baseId}-product-link`
  const productModeId = `${baseId}-product-mode`
  const specLinkId = `${baseId}-spec-link`
  const specModeId = `${baseId}-spec-mode`
  return (
    <>
      <Dialog open={picker.open} onOpenChange={picker.onOpenChange}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>添加选品</DialogTitle>
            <DialogDescription>从当前分类中选择商品加入方案。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                id={pickerSearchId} aria-label="Search products" className="flex-1"
                placeholder="输入商品名称搜索"
                value={picker.keyword}
                onChange={(event) => picker.onKeywordChange(event.target.value)}
              />
              <Button variant="outline" onClick={picker.onSelectAll}>
                全选
              </Button>
              <Button variant="outline" onClick={picker.onClearSelection}>
                清空
              </Button>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
              {picker.items.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {picker.loading ? "加载中..." : "暂无选品"}
                </div>
              ) : (
                picker.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.title || "未命名商品"}
                      </p>
                      <p className="text-xs text-slate-500">
                        价格：{formatNumber(item.price)} 元
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name={`picker-${item.id}`}
                      aria-label="Select item"
                      checked={picker.selectedIds.has(item.id)}
                      onChange={(event) => picker.onToggleItem(item.id, event.target.checked)}
                    />
                  </label>
                ))
              )}
              {picker.hasMore ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={picker.onLoadMore}
                  disabled={picker.loading}
                >
                  {picker.loading ? "加载中..." : "加载更多"}
                </Button>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => picker.onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={picker.onConfirm}>加入方案</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={prompt.open} onOpenChange={prompt.onOpenChange}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>修改提示词</DialogTitle>
            <DialogDescription>可根据需求调整生成提示词。</DialogDescription>
          </DialogHeader>
          <Textarea
            id={promptId} aria-label="Prompt content" rows={6}
            value={prompt.value}
            onChange={(event) => prompt.onValueChange(event.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => prompt.onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={prompt.onSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feishu.open} onOpenChange={feishu.onOpenChange}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>写入飞书表格</DialogTitle>
            <DialogDescription>将当前筛选结果写入飞书多维表格。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24" htmlFor={productLinkId}>商品表链接</FieldLabel>
              <FieldContent>
                <Input
                  id={productLinkId} value={feishu.productLink}
                  onChange={(event) => feishu.onProductLinkChange(event.target.value)}
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24" htmlFor={productModeId}>写入方式</FieldLabel>
              <FieldContent>
                <Select value={feishu.productMode} onValueChange={feishu.onProductModeChange}>
                  <SelectTrigger id={productModeId}>
                    <SelectValue placeholder="选择写入方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">追加</SelectItem>
                    <SelectItem value="replace">覆盖</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                aria-label="Sync spec sheet" checked={feishu.specEnabled}
                onCheckedChange={(value) => feishu.onSpecEnabledChange(Boolean(value))}
              />
              <span>同步参数表</span>
            </div>
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24" htmlFor={specLinkId}>参数表链接</FieldLabel>
              <FieldContent>
                <Input
                  id={specLinkId} value={feishu.specLink}
                  onChange={(event) => feishu.onSpecLinkChange(event.target.value)}
                  disabled={!feishu.specEnabled}
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldLabel className="w-24" htmlFor={specModeId}>参数写入</FieldLabel>
              <FieldContent>
                <Select
                  value={feishu.specMode}
                  onValueChange={feishu.onSpecModeChange}
                  disabled={!feishu.specEnabled}
                >
                  <SelectTrigger id={specModeId}>
                    <SelectValue placeholder="选择写入方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">追加</SelectItem>
                    <SelectItem value="replace">覆盖</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => feishu.onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={feishu.onSubmit} disabled={feishu.submitting}>
              {feishu.submitting ? "写入中..." : "开始写入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {productForm.open ? (
        <ProductFormModal
          isOpen={productForm.open}
          categories={productForm.categories}
          presetFields={productForm.presetFields}
          initialValues={productForm.initialValues}
          onClose={productForm.onClose}
          onSubmit={productForm.onSubmit}
        />
      ) : null}
    </>
  )
}
