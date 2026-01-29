import { useEffect, useRef, useState } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import ArchiveListCard from "@/components/archive/ArchiveListCard"
import CategoryManagerModal from "@/components/archive/CategoryManagerModal"
import ImportProgressModal from "@/components/archive/ImportProgressModal"
import PresetFieldsModal from "@/components/archive/PresetFieldsModal"
import ProductFormModal from "@/components/archive/ProductFormModal"
import InputGroup from "@/components/InputGroup"
import Skeleton from "@/components/Skeleton"
import type { CategoryItem } from "@/components/archive/types"
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
  sortValue: string
  onSortChange: (value: string) => void
  onCreate: () => void
  onEdit: (id: string) => void
  onCopyLink: (id: string) => void
  onDelete: (id: string) => void
  onToggleFocus: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
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
  onSavePresetFields: (categoryId: string, fields: { key: string }[]) => void
  isProductFormOpen: boolean
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
  <div className="space-y-4">
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
  sortValue,
  onSortChange,
  onCreate,
  onEdit,
  onCopyLink,
  onDelete,
  onToggleFocus,
  onDragStart,
  onDrop,
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
  onCloseProductForm,
  onSubmitProductForm,
  productFormInitialValues,
  presetFields,
  importProgressState,
  isImportOpen,
  onCloseImport,
  onCancelImport,
}: ArchivePageViewProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const hasMoreRef = useRef(hasMore)
  const onLoadMoreRef = useRef(onLoadMore)
  const [minInput, setMinInput] = useState(String(priceRange[0]))
  const [maxInput, setMaxInput] = useState(String(priceRange[1]))

  useEffect(() => {
    hasMoreRef.current = hasMore
    onLoadMoreRef.current = onLoadMore
  }, [hasMore, onLoadMore])

  useEffect(() => {
    setMinInput(String(priceRange[0]))
    setMaxInput(String(priceRange[1]))
  }, [priceRange])

  useEffect(() => {
    const target = sentinelRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMoreRef.current) {
        onLoadMoreRef.current()
      }
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const showCategorySkeleton = isCategoryLoading && categories.length === 0
  const showListSkeleton = isListLoading && !isUsingCache

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
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
                <button
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    selectedCategory === "all"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  type="button"
                  onClick={() => onSelectCategory("all")}
                >
                  <span>全部</span>
                  <span className="text-xs text-slate-400">{items.length} 个选品</span>
                </button>
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
              <InputGroup
                label="搜索"
                placeholder="搜索商品名称、关键词..."
                value={searchValue}
                onChange={onSearchChange}
                width="lg"
              />
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">价格区间</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 w-20"
                      inputMode="numeric"
                      value={minInput}
                      onChange={(event) => setMinInput(event.target.value)}
                      onBlur={() => {
                        const nextMin = Number(minInput)
                        const nextMax = Number(maxInput)
                        if (Number.isFinite(nextMin) && Number.isFinite(nextMax)) {
                          onPriceRangeChange([nextMin, nextMax])
                        }
                      }}
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <Input
                      className="h-8 w-20"
                      inputMode="numeric"
                      value={maxInput}
                      onChange={(event) => setMaxInput(event.target.value)}
                      onBlur={() => {
                        const nextMin = Number(minInput)
                        const nextMax = Number(maxInput)
                        if (Number.isFinite(nextMin) && Number.isFinite(nextMax)) {
                          onPriceRangeChange([nextMin, nextMax])
                        }
                      }}
                    />
                    <span className="text-xs text-slate-500">
                      {priceBounds[0]} - {priceBounds[1]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-[max-content_1fr] md:items-center">
                <span className="font-medium text-slate-700">排序</span>
                <Select value={sortValue} onValueChange={onSortChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动排序</SelectItem>
                    <SelectItem value="price">价格升序</SelectItem>
                  </SelectContent>
                </Select>
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
            <>
              <section className="space-y-5">
                {items.map((item) => (
                  <ArchiveListCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    price={item.price}
                    commission={item.commission}
                    commissionRate={item.commissionRate}
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
                    onCopyLink={onCopyLink}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDragStart={onDragStart}
                    onDrop={onDrop}
                  />
                ))}
              </section>
              <div ref={sentinelRef} data-testid="load-more-sentinel" />
              {isLoadingMore ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  正在加载更多...
                </div>
              ) : null}
            </>
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
