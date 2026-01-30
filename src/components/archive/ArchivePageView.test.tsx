// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import ArchivePageView from "./ArchivePageView"

describe("ArchivePageView", () => {
  it("does not render the all category button", () => {
    render(
      <ArchivePageView
        items={[]}
        categories={[{ id: "cat-1", name: "分类1", sortOrder: 0, count: 0 }]}
        isCategoryLoading={false}
        isListLoading={false}
        isRefreshing={false}
        isUsingCache={false}
        schemes={[]}
        schemeValue=""
        isSchemeLoading={false}
        onSchemeChange={() => {}}
        selectedCategory="all"
        searchValue=""
        onSearchChange={() => {}}
        priceRange={[0, 0]}
        priceBounds={[0, 0]}
        onPriceRangeChange={() => {}}
        hasMore={false}
        isLoadingMore={false}
        onLoadMore={() => {}}
        sortValue="manual"
        onSortChange={() => {}}
        onCreate={() => {}}
        onEdit={() => {}}
        onCopyLink={() => {}}
        onDelete={() => {}}
        onToggleFocus={() => {}}
        onDragStart={() => {}}
        onDrop={() => {}}
        onSelectCategory={() => {}}
        onClearList={() => {}}
        onDownloadImages={() => {}}
        onExport={() => {}}
        onSyncFeishu={() => {}}
        onOpenCategoryManager={() => {}}
        onCloseCategoryManager={() => {}}
        onSaveCategories={() => {}}
        isCategoryManagerOpen={false}
        isPresetFieldsOpen={false}
        onOpenPresetFields={() => {}}
        onClosePresetFields={() => {}}
        onSavePresetFields={() => {}}
        isProductFormOpen={false}
        onCloseProductForm={() => {}}
        onSubmitProductForm={() => {}}
        presetFields={[]}
        importProgressState={{
          status: "idle",
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
          failures: [],
        }}
        isImportOpen={false}
        onCloseImport={() => {}}
        onCancelImport={() => {}}
      />
    )

    expect(screen.queryByText(/^全部$/)).toBeNull()
  })
})
