import { useEffect, useState } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import ArchiveListCard from "@/components/archive/ArchiveListCard"
import CategoryManagerModal from "@/components/archive/CategoryManagerModal"
import ImportProgressModal from "@/components/archive/ImportProgressModal"
import PresetFieldsModal from "@/components/archive/PresetFieldsModal"
import ProductFormModal from "@/components/archive/ProductFormModal"
import Skeleton from "@/components/Skeleton"
import type { CategoryItem, SpecField } from "@/components/archive/types"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
interface ParamEntry {
  key: string
  value: string
}
interface ArchiveItemView {
  id: string
  title: string
  price: string
  commission: string
  commissionRate: string
  jdPrice?: string
  jdCommission?: string
  jdCommissionRate?: string
  jdSales?: string
  tbPrice?: string
  tbCommission?: string
  tbCommissionRate?: string
  tbSales?: string
  sales30: string
  comments: string
  image: string
  categoryName: string
  accountName: string
  blueLink: string
  shopName: string
  uid: string
  source: string
  params: ParamEntry[]
  remark: string
  missingTips: string[]
  isFocused: boolean
}
interface ImportProgressState {
  status: "idle" | "running" | "done"
  total: number
  processed: number
  success: number
  failed: number
  failures: {
    link: string
    title: string
    reason: string
  }[]
}
interface ArchivePageViewProps {
  items: ArchiveItemView[]
  categories: CategoryItem[]
  isCategoryLoading: boolean
  isListLoading: boolean
  isRefreshing: boolean
  isUsingCache: boolean
  schemes: { id: string; name: string }[]
  schemeValue: string
  isSchemeLoading: boolean
  onSchemeChange: (value: string) => void
  errorMessage?: string
  selectedCategory: string
  searchValue: string
  onSearchChange: (value: string) => void
  priceRange: [number, number]
  priceBounds: [number, number]
  onPriceRangeChange: (value: [number, number]) => void
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  disableLoadMore?: boolean
  sortValue: string
  onSortChange: (value: string) => void
  onCreate: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFocus: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
  onAddToScheme?: (id: string) => void
  onOpenLink?: (link: string) => void
  onCoverClick?: (id: string) => void
  onSelectCategory: (id: string) => void
  onClearList: () => void
  onDownloadImages: () => void
  onExport: () => void
  onSyncFeishu: () => void
  onOpenCategoryManager: () => void
  onCloseCategoryManager: () => void
  onSaveCategories: (next: CategoryItem[]) => void
  isCategoryManagerOpen: boolean
  isPresetFieldsOpen: boolean
  onOpenPresetFields: () => void
  onClosePresetFields: () => void
  onSavePresetFields: (categoryId: string, fields: SpecField[]) => void
  isProductFormOpen: boolean
  autoOpenCoverPicker?: boolean
  onCloseProductForm: () => void
  onSubmitProductForm: (values: {
    promoLink: string
    title: string
    price: string
    commission: string
    commissionRate: string
    sales30: string
    comments: string
    image: string
    blueLink: string
    taobaoLink: string
    categoryId: string
    accountName: string
    shopName: string
    remark: string
    params: Record<string, string>
  }) => void
  productFormInitialValues?: {
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
  presetFields: { key: string }[]
  importProgressState: ImportProgressState
  isImportOpen: boolean
  onCloseImport: () => void
  onCancelImport: () => void
  onFixSort: () => void
  isFixSortDisabled: boolean
  isFixSortSaving: boolean
}
const CategorySkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
    ))}
  </div>
)
const ListSkeleton = () => (
  <div className="space-y-4" data-testid="archive-list-skeleton">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-[120px] w-[120px] rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <div className="grid gap-4 md:grid-cols-5">
              {Array.from({ length: 5 }).map((__, idx) => (
                <div key={idx} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
)
export default function ArchivePageView({
  items,
  categories,
  isCategoryLoading,
  isListLoading,
  isRefreshing,
  isUsingCache,
  schemes,
  schemeValue,
  isSchemeLoading,
  onSchemeChange,
  errorMessage,
  selectedCategory,
  searchValue,
  onSearchChange,
  priceRange,
  priceBounds,
  onPriceRangeChange,
  hasMore,
  isLoadingMore,
  onLoadMore,
  disableLoadMore,
  sortValue,
  onSortChange,
  onCreate,
  onEdit,
  onDelete,
  onToggleFocus,
  onDragStart,
  onDrop,
  onAddToScheme,
  onOpenLink,
  onCoverClick,
  onSelectCategory,
  onClearList,
  onDownloadImages,
  onExport,
  onSyncFeishu,
  onOpenCategoryManager,
  onCloseCategoryManager,
  onSaveCategories,
  isCategoryManagerOpen,
  isPresetFieldsOpen,
  onOpenPresetFields,
  onClosePresetFields,
  onSavePresetFields,
  isProductFormOpen,
  autoOpenCoverPicker,
  onCloseProductForm,
  onSubmitProductForm,
  productFormInitialValues,
  presetFields,
  importProgressState,
  isImportOpen,
  onCloseImport,
  onCancelImport,
  onFixSort,
  isFixSortDisabled,
  isFixSortSaving,
}: ArchivePageViewProps) {
  const isPriceUnset = priceRange[0] === 0 && priceRange[1] === 0
  const [minInput, setMinInput] = useState(isPriceUnset ? "" : String(priceRange[0]))
  const [maxInput, setMaxInput] = useState(isPriceUnset ? "" : String(priceRange[1]))
  const disableLoadMoreResolved = Boolean(disableLoadMore)
  const canLoadMore = hasMore && !disableLoadMoreResolved
  const listGap = 12
  useEffect(() => {
    if (priceRange[0] === 0 && priceRange[1] === 0) {
      setMinInput("")
      setMaxInput("")
      return
    }
    setMinInput(String(priceRange[0]))
    setMaxInput(String(priceRange[1]))
  }, [priceRange])
  const parsePriceInput = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  const commitPriceRange = () => {
    const minValue = parsePriceInput(minInput)
    const maxValue = parsePriceInput(maxInput)
    if (minValue === null && maxValue === null) {
      onPriceRangeChange([0, 0])
      return
    }
    const nextMin = minValue ?? priceBounds[0]
    const nextMax = maxValue ?? priceBounds[1]
    if (!Number.isFinite(nextMin) || !Number.isFinite(nextMax)) return
    onPriceRangeChange([nextMin, nextMax])
  }
  const showCategorySkeleton = isCategoryLoading && categories.length === 0
  const showListSkeleton = isListLoading && (!isUsingCache || items.length === 0)
  const loadMoreContent = canLoadMore ? (
    <div
      className="flex items-center justify-center"
      style={{
        boxSizing: "border-box",
        paddingBottom: listGap,
      }}
    >
      {isLoadingMore ? (
        <span className="text-xs text-slate-400">正在加载更多...</span>
      ) : (
        <button
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
          type="button"
          onClick={() => onLoadMore()}
        >
          加载更多
        </button>
      )}
    </div>
  ) : null
  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">选品分类</h3>
            <button
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
              type="button"
              onClick={onOpenCategoryManager}
            >
              ＋
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {showCategorySkeleton ? (
              <CategorySkeleton />
            ) : (
              <>
                {categories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category) => (
                    <button
                      key={category.id}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                        selectedCategory === category.id
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                      type="button"
                      onClick={() => onSelectCategory(category.id)}
                    >
                      <span>{category.name}</span>
                      <span className="text-xs text-slate-400">
                        {category.count ?? 0} 个选品
                      </span>
                    </button>
                  ))}
              </>
            )}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-slate-900">商品列表</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  {items.length}
                </span>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <button className="text-rose-500" type="button" onClick={onClearList}>
                    清空列表
                  </button>
                  <button type="button" onClick={onDownloadImages}>
                    下载图片
                  </button>
                  <button type="button" onClick={onExport}>
                    导出表格
                  </button>
                  {isRefreshing ? (
                    <span className="text-slate-300">正在刷新...</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton onClick={onOpenPresetFields}>预设参数</PrimaryButton>
                <PrimaryButton onClick={onCreate}>新增选品</PrimaryButton>
                <PrimaryButton onClick={onSyncFeishu}>写入飞书表格</PrimaryButton>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-full text-sm text-slate-600 md:w-[180px]">
                <Input
                  placeholder="搜索商品名称、关键词..."
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </div>
              <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-[max-content_1fr] md:items-center">
                <span className="font-medium text-slate-700">方案</span>
                <Select
                  value={schemeValue || "all"}
                  onValueChange={(value) => onSchemeChange(value === "all" ? "" : value)}
                  disabled={isSchemeLoading && schemes.length === 0}
                >
                  <SelectTrigger className="w-[180px]" aria-label="Scheme filter">
                    <SelectValue placeholder={isSchemeLoading ? "加载中..." : "全部方案"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部方案</SelectItem>
                    {schemes.map((scheme) => (
                      <SelectItem key={scheme.id} value={scheme.id}>
                        {scheme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-[max-content_1fr] md:items-center">
                <span className="font-medium text-slate-700">价格</span>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Min price"
                    className="h-8 w-20"
                    inputMode="numeric"
                    value={minInput}
                    onChange={(event) => setMinInput(event.target.value)}
                    onBlur={commitPriceRange}
                  />
                  <span className="text-xs text-slate-400">-</span>
                  <Input
                    aria-label="Max price"
                    className="h-8 w-20"
                    inputMode="numeric"
                    value={maxInput}
                    onChange={(event) => setMaxInput(event.target.value)}
                    onBlur={commitPriceRange}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <Select value={sortValue} onValueChange={onSortChange}>
                  <SelectTrigger className="w-[160px]" aria-label="Sort">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动排序</SelectItem>
                    <SelectItem value="price">价格升序</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  className="h-10 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isFixSortDisabled || isFixSortSaving}
                  onClick={onFixSort}
                >
                  {isFixSortSaving ? "保存中..." : "固定排序"}
                </button>
              </div>
            </div>
          </section>
          {showListSkeleton ? (
            <ListSkeleton />
          ) : errorMessage ? (
            <Empty title="加载失败" description={errorMessage} />
          ) : items.length === 0 ? (
            <Empty
              title={isListLoading ? "正在加载..." : "暂无商品"}
              description={
                isListLoading
                  ? "请稍候，正在获取商品数据。"
                  : "请通过导入或新增的方式添加商品。"
              }
              actionLabel={isListLoading ? undefined : "新增商品"}
              onAction={isListLoading ? undefined : onCreate}
            />
                    ) : (
            <div data-testid="archive-list">
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    boxSizing: "border-box",
                    paddingBottom: listGap,
                  }}
                >
                  <ArchiveListCard
                    id={item.id}
                    title={item.title}
                    price={item.price}
                    commission={item.commission}
                    commissionRate={item.commissionRate}
                    jdPrice={item.jdPrice}
                    jdCommission={item.jdCommission}
                    jdCommissionRate={item.jdCommissionRate}
                    jdSales={item.jdSales}
                    tbPrice={item.tbPrice}
                    tbCommission={item.tbCommission}
                    tbCommissionRate={item.tbCommissionRate}
                    tbSales={item.tbSales}
                    sales30={item.sales30}
                    comments={item.comments}
                    image={item.image}
                    shopName={item.shopName}
                    uid={item.uid}
                    source={item.source}
                    blueLink={item.blueLink}
                    params={item.params}
                    remark={item.remark}
                    missingTips={item.missingTips}
                    isFocused={item.isFocused}
                    onToggleFocus={onToggleFocus}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDragStart={onDragStart}
                    onDrop={onDrop}
                    onAddToScheme={onAddToScheme}
                    onCoverClick={onCoverClick ? () => onCoverClick(item.id) : undefined}
                    onCardClick={onOpenLink ? () => onOpenLink(item.blueLink) : undefined}
                  />
                </div>
              ))}
              {loadMoreContent}
            </div>
          )}
        </div>
      </div>
      {isCategoryManagerOpen ? (
        <CategoryManagerModal
          isOpen={isCategoryManagerOpen}
          categories={categories}
          onClose={onCloseCategoryManager}
          onSave={onSaveCategories}
        />
      ) : null}
      {isPresetFieldsOpen ? (
        <PresetFieldsModal
          isOpen={isPresetFieldsOpen}
          categories={categories}
          selectedCategoryId={selectedCategory}
          onClose={onClosePresetFields}
          onSave={onSavePresetFields}
        />
      ) : null}
      {isProductFormOpen ? (
        <ProductFormModal
          isOpen={isProductFormOpen}
          categories={categories.map((item) => ({
            label: item.name,
            value: item.id,
          }))}
          presetFields={presetFields}
          initialValues={productFormInitialValues}
          defaultCategoryId={selectedCategory !== "all" ? selectedCategory : ""}
          autoOpenCoverPicker={autoOpenCoverPicker}
          onClose={onCloseProductForm}
          onSubmit={onSubmitProductForm}
        />
      ) : null}
      {isImportOpen ? (
        <ImportProgressModal
          isOpen={isImportOpen}
          state={importProgressState}
          onClose={onCloseImport}
          onCancel={onCancelImport}
        />
      ) : null}
    </>
  )
}
