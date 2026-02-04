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
  onExportJson: () => void
  onExportExcel: () => void
  onOpenFeishu: () => void
}

type SchemeDetailPageViewProps = {
  header: SchemeDetailHeaderInfo
  toolbar: {
    sortValue: string
    onSortChange: (value: string) => void
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
    onGenerateImage: (id: string) => void
    onEdit: (id: string) => void
    onRemove: (id: string) => void
    onDragStart: (id: string) => void
    onDrop: (id: string) => void
    onCardClick?: (id: string) => void
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
      selectedAccountId: string
      ranges: { min: number | null; max: number | null }[]
      groups: { label: string; lines: string[] }[]
      missingMessage: string
      onAccountChange: (id: string) => void
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
        onExportJson={header.onExportJson}
        onExportExcel={header.onExportExcel}
        onOpenFeishu={header.onOpenFeishu}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <SchemeDetailToolbar
            sortValue={toolbar.sortValue}
            onSortChange={toolbar.onSortChange}
            onClearItems={toolbar.onClearItems}
            onOpenPicker={toolbar.onOpenPicker}
          />

          <SchemeDetailProductList
            items={productList.items}
            totalCount={productList.totalCount}
            onOpenPicker={productList.onOpenPicker}
            onGenerateImage={productList.onGenerateImage}
            onEdit={productList.onEdit}
            onRemove={productList.onRemove}
            onDragStart={productList.onDragStart}
            onDrop={productList.onDrop}
            onCardClick={productList.onCardClick}
          />
        </div>

        <SchemeDetailSidebar
          copywriting={sidebar.copywriting}
          commentReply={sidebar.commentReply}
          blueLink={sidebar.blueLink}
          image={sidebar.image}
        />
      </div>
    </div>
  )
}

