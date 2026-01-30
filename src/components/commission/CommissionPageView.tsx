import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CommissionListCard from "@/components/commission/CommissionListCard"
import type { CommissionItemView } from "@/components/commission/CommissionListCard"
import CommissionProgressModal from "@/components/commission/CommissionProgressModal"
import CommissionResultModal from "@/components/commission/CommissionResultModal"
import CommissionSelectVideoModal from "@/components/commission/CommissionSelectVideoModal"
import type { VideoItem } from "@/components/commission/CommissionSelectVideoModal"
import CommissionEditModal from "@/components/commission/CommissionEditModal"

interface CommissionPageViewProps {
  inputValue: string
  onInputChange: (value: string) => void
  items: CommissionItemView[]
  isProcessing: boolean
  progress: { current: number; total: number }
  progressMessage: string
  resultOpen: boolean
  resultItems: { label: string; value: string }[]
  resultHighlight: { label: string; value: string }
  selectVideoOpen: boolean
  videoItems: VideoItem[]
  videoCategories: { id: string; name: string }[]
  videoCategoryFilter: string
  onVideoCategoryChange: (value: string) => void
  selectedVideos: string[]
  editTarget?: { id: string; title: string; price: number; commissionRate: number }
  filters: {
    keyword: string
    priceMin: string
    priceMax: string
    rateMin: string
    rateMax: string
    salesMin: string
    salesMax: string
    sort: string
  }
  onFilterChange: (key: string, value: string) => void
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onArchiveAll: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
  onExport: () => void
  onDownloadImages: () => void
  onParseBili: () => void
  onParsePromo: () => void
  onParseBenchmark: () => void
  onCloseProgress: () => void
  onCloseResult: () => void
  onSortAll: () => void
  onSortNew: () => void
  onToggleVideo: (id: string) => void
  onStartExtract: () => void
  onCloseSelectVideo: () => void
  onSaveEdit: (payload: { title: string; price: number; commissionRate: number }) => void
  onCloseEdit: () => void
}

const RangeInput = ({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string
  minValue: string
  maxValue: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
}) => {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
      <span className="font-medium text-slate-600">{label}</span>
      <Input
        aria-label={`${label} min`}
        value={minValue}
        onChange={(e) => onMinChange(e.target.value)}
        placeholder="最低"
        className="h-7 w-[70px] border-none bg-slate-50 text-xs"
      />
      <span className="text-slate-300">-</span>
      <Input
        aria-label={`${label} max`}
        value={maxValue}
        onChange={(e) => onMaxChange(e.target.value)}
        placeholder="最高"
        className="h-7 w-[70px] border-none bg-slate-50 text-xs"
      />
    </div>
  )
}

export default function CommissionPageView({
  inputValue,
  onInputChange,
  items,
  isProcessing,
  progress,
  progressMessage,
  resultOpen,
  resultItems,
  resultHighlight,
  selectVideoOpen,
  videoItems,
  videoCategories,
  videoCategoryFilter,
  onVideoCategoryChange,
  selectedVideos,
  editTarget,
  filters,
  onFilterChange,
  onEdit,
  onArchive,
  onArchiveAll,
  onDelete,
  onClearAll,
  onExport,
  onDownloadImages,
  onParseBili,
  onParsePromo,
  onParseBenchmark,
  onCloseProgress,
  onCloseResult,
  onSortAll,
  onSortNew,
  onToggleVideo,
  onStartExtract,
  onCloseSelectVideo,
  onSaveEdit,
  onCloseEdit,
}: CommissionPageViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <Textarea aria-label="Link list"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="粘贴 B 站链接/推广链接/对标视频链接，一行一个"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={onParseBili}>B站链接提取</Button>
          <Button onClick={onParsePromo}>推广链接提取</Button>
          <Button onClick={onParseBenchmark}>对标视频提取</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-900">商品列表</h3>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
              {items.length}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <button
                className="text-rose-500 disabled:text-slate-300"
                type="button"
                onClick={onClearAll}
                disabled={items.length === 0}
              >
                清空列表
              </button>
              <button
                type="button"
                onClick={onDownloadImages}
                disabled={items.length === 0}
              >
                下载图片
              </button>
              <button type="button" onClick={onExport} disabled={items.length === 0}>
                导出表格
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-violet-200 text-violet-600">
              批量导入
            </Button>
            <Button>新增商品</Button>
            <Button variant="outline" onClick={onArchiveAll}>
              归档
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            <span className="font-medium text-slate-600">搜索</span>
            <Input
              aria-label="Search products" value={filters.keyword}
              onChange={(e) => onFilterChange("keyword", e.target.value)}
              placeholder="搜索商品名称..."
              className="h-7 w-[220px] border-none bg-slate-50 text-xs"
            />
          </div>
          <RangeInput
            label="价格"
            minValue={filters.priceMin}
            maxValue={filters.priceMax}
            onMinChange={(value) => onFilterChange("priceMin", value)}
            onMaxChange={(value) => onFilterChange("priceMax", value)}
          />
          <RangeInput
            label="佣金比例"
            minValue={filters.rateMin}
            maxValue={filters.rateMax}
            onMinChange={(value) => onFilterChange("rateMin", value)}
            onMaxChange={(value) => onFilterChange("rateMax", value)}
          />
          <RangeInput
            label="销量"
            minValue={filters.salesMin}
            maxValue={filters.salesMax}
            onMinChange={(value) => onFilterChange("salesMin", value)}
            onMaxChange={(value) => onFilterChange("salesMax", value)}
          />
          <div className="min-w-[160px]">
            <Select value={filters.sort} onValueChange={(value) => onFilterChange("sort", value)}>
              <SelectTrigger className="h-9" aria-label="Sort">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">价格升序</SelectItem>
                <SelectItem value="price_desc">价格降序</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <CommissionListCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          ))}
        </div>
      </section>

      <CommissionProgressModal
        isOpen={isProcessing}
        title="解析进度"
        message={progressMessage}
        current={progress.current}
        total={progress.total}
        onClose={onCloseProgress}
      />

      <CommissionResultModal
        isOpen={resultOpen}
        items={resultItems}
        highlightLabel={resultHighlight.label}
        highlightValue={resultHighlight.value}
        onSortAll={onSortAll}
        onSortNew={onSortNew}
        onClose={onCloseResult}
      />

      <CommissionSelectVideoModal
        isOpen={selectVideoOpen}
        items={videoItems}
        categories={videoCategories}
        activeCategory={videoCategoryFilter}
        onCategoryChange={onVideoCategoryChange}
        selected={selectedVideos}
        onToggle={onToggleVideo}
        onStart={onStartExtract}
        onClose={onCloseSelectVideo}
      />

      {editTarget ? (
        <CommissionEditModal
          isOpen={Boolean(editTarget)}
          title={editTarget.title}
          price={editTarget.price}
          commissionRate={editTarget.commissionRate}
          onSave={onSaveEdit}
          onClose={onCloseEdit}
        />
      ) : null}
    </div>
  )
}
