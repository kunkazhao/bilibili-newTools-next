import SchemeDetailHeader from "@/components/schemes/SchemeDetailHeader"
import SchemeDetailToolbar from "@/components/schemes/SchemeDetailToolbar"
import SchemeDetailProductList from "@/components/schemes/SchemeDetailProductList"
import SchemeDetailSidebar from "@/components/schemes/SchemeDetailSidebar"

type SchemeDetailHeaderInfo = {
  name: string
  categoryName: string
  itemCount: number
  createdAt: string
  onBack: () => void
}

type SchemeDetailPageViewProps = {
  header: SchemeDetailHeaderInfo
  toolbar: {
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
  productList: {
    items: {
      id: string
      title: string
      cover: string
      shopName: string
      sales30: string
      comments: string
      price: string
      commission: string
      commissionRate: string
      missingFields: string[]
      remarkText: string
      isMissing: boolean
    }[]
    totalCount: number
    onOpenPicker: () => void
    onEdit: (id: string) => void
    onRemove: (id: string) => void
    onDragStart: (id: string) => void
    onDrop: (id: string) => void
  }
  sidebar: {
    copywriting: {
      title: string
      intro: string
      vote: string
      onTitleChange: (value: string) => void
      onIntroChange: (value: string) => void
      onVoteChange: (value: string) => void
      onOpenPrompt: (type: "title" | "intro" | "vote") => void
      onCopy: (text: string, message: string) => void
      onGenerate: (type: "title" | "intro" | "vote") => void
    }
    commentReply: {
      count: number
      prompt: string
      output: string
      onCountChange: (value: number) => void
      onPromptChange: (value: string) => void
      onOutputChange: (value: string) => void
      onOpenPrompt: () => void
      onCopy: (text: string, message: string) => void
      onGenerate: () => void
    }
    blueLink: {
      accounts: { id: string; name: string }[]
      selectedAccountIds: Set<string>
      ranges: { min: number | null; max: number | null }[]
      groups: { label: string; lines: string[] }[]
      missingMessage: string
      onToggleAccount: (id: string, checked: boolean) => void
      onRangeChange: (index: number, field: "min" | "max", value: number | null) => void
      onAddRange: () => void
      onRemoveRange: (index: number) => void
      onCopyAll: () => void
      onCopyGroup: (lines: string[]) => void
      onGenerate: () => void
    }
    image: {
      categories: string[]
      templates: { id: string; name?: string | null; category?: string | null }[]
      activeCategory: string
      activeTemplateId: string
      emptyValue: string
      missingMessage: string
      status: { type: "success" | "error" | "info"; message: string } | null
      onCategoryChange: (value: string) => void
      onTemplateChange: (value: string) => void
      onRefreshMissing: () => void
      onGenerate: () => void
    }
    exportSync: {
      onExport: () => void
      onDownloadImages: () => void
      onOpenFeishu: () => void
    }
  }
}

export default function SchemeDetailPageView({
  header,
  toolbar,
  productList,
  sidebar,
}: SchemeDetailPageViewProps) {
  return (
    <div className="space-y-6">
      <SchemeDetailHeader
        name={header.name}
        categoryName={header.categoryName}
        itemCount={header.itemCount}
        createdAt={header.createdAt}
        onBack={header.onBack}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <SchemeDetailToolbar
            priceMin={toolbar.priceMin}
            priceMax={toolbar.priceMax}
            sortValue={toolbar.sortValue}
            onPriceMinChange={toolbar.onPriceMinChange}
            onPriceMaxChange={toolbar.onPriceMaxChange}
            onSortChange={toolbar.onSortChange}
            onResetPrice={toolbar.onResetPrice}
            onClearFiltered={toolbar.onClearFiltered}
            onClearItems={toolbar.onClearItems}
            onOpenPicker={toolbar.onOpenPicker}
          />

          <SchemeDetailProductList
            items={productList.items}
            totalCount={productList.totalCount}
            onOpenPicker={productList.onOpenPicker}
            onEdit={productList.onEdit}
            onRemove={productList.onRemove}
            onDragStart={productList.onDragStart}
            onDrop={productList.onDrop}
          />
        </div>

        <SchemeDetailSidebar
          copywriting={sidebar.copywriting}
          commentReply={sidebar.commentReply}
          blueLink={sidebar.blueLink}
          image={sidebar.image}
          exportSync={sidebar.exportSync}
        />
      </div>
    </div>
  )
}
