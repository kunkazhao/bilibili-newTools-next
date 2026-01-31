// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ArchivePageView from "./ArchivePageView"

describe("ArchivePageView", () => {
  afterEach(() => {
    cleanup()
  })

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
        onFixSort={() => {}}
        isFixSortDisabled={false}
        isFixSortSaving={false}
      />
    )

    expect(screen.queryByText(/^全部$/)).toBeNull()
  })

  it("renders and triggers the fixed sort button when enabled", async () => {
    const onFixSort = vi.fn()
    const user = userEvent.setup()

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
        selectedCategory="cat-1"
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
        onFixSort={onFixSort}
        isFixSortDisabled={false}
        isFixSortSaving={false}
      />
    )

    const button = screen.getByRole("button", { name: "固定排序" })
    await user.click(button)
    expect(onFixSort).toHaveBeenCalledTimes(1)
  })

  it("disables the fixed sort button when filters are active", () => {
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
        selectedCategory="cat-1"
        searchValue="关键词"
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
        onFixSort={() => {}}
        isFixSortDisabled={true}
        isFixSortSaving={false}
      />
    )

    const button = screen.getByRole("button", { name: "固定排序" })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })
})
