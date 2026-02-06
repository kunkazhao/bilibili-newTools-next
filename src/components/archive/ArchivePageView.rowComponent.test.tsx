// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import ArchivePageView from "./ArchivePageView"

const baseItem = {
  id: "item-1",
  title: "Item A",
  price: "10",
  commission: "1",
  commissionRate: "10%",
  sales30: "--",
  comments: "--",
  image: "",
  categoryName: "Category",
  accountName: "",
  blueLink: "",
  shopName: "",
  uid: "UID-1",
  source: "",
  params: [],
  remark: "",
  missingTips: [],
  isFocused: false,
}

type ArchiveItem = typeof baseItem

const buildProps = (items: ArchiveItem[]) => ({
  items,
  categories: [{ id: "cat-1", name: "Category", sortOrder: 0, count: 1 }],
  isCategoryLoading: false,
  isListLoading: false,
  isRefreshing: false,
  isUsingCache: false,
  schemes: [],
  schemeValue: "",
  isSchemeLoading: false,
  onSchemeChange: () => {},
  errorMessage: undefined,
  selectedCategory: "cat-1",
  searchValue: "",
  onSearchChange: () => {},
  priceRange: [0, 0],
  priceBounds: [0, 0],
  onPriceRangeChange: () => {},
  hasMore: false,
  isLoadingMore: false,
  onLoadMore: () => {},
  disableLoadMore: false,
  sortValue: "manual",
  onSortChange: () => {},
  onCreate: () => {},
  onEdit: () => {},
  onDelete: () => {},
  onToggleFocus: () => {},
  onDragStart: () => {},
  onDrop: () => {},
  onSelectCategory: () => {},
  onClearList: () => {},
  onDownloadImages: () => {},
  onExport: () => {},
  onSyncFeishu: () => {},
  onOpenCategoryManager: () => {},
  onCloseCategoryManager: () => {},
  onSaveCategories: () => {},
  isCategoryManagerOpen: false,
  isPresetFieldsOpen: false,
  onOpenPresetFields: () => {},
  onClosePresetFields: () => {},
  onSavePresetFields: () => {},
  isProductFormOpen: false,
  onCloseProductForm: () => {},
  onSubmitProductForm: () => {},
  productFormInitialValues: undefined,
  presetFields: [],
  importProgressState: {
    status: "idle",
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    failures: [],
  },
  isImportOpen: false,
  onCloseImport: () => {},
  onCancelImport: () => {},
  onFixSort: () => {},
  isFixSortDisabled: false,
  isFixSortSaving: false,
})

describe("ArchivePageView list rendering", () => {
  afterEach(() => {
    cleanup()
  })

  it("updates rendered items when the list changes", () => {
    const items = [baseItem]
    const updatedItems = [{ ...baseItem, title: "Item B" }]

    const { rerender } = render(<ArchivePageView {...buildProps(items)} />)

    expect(screen.getByTestId("archive-list")).toBeTruthy()
    expect(screen.getByText("Item A")).toBeTruthy()

    rerender(<ArchivePageView {...buildProps(updatedItems)} />)

    expect(screen.getByText("Item B")).toBeTruthy()
  })

  it("renders replace cover button", () => {
    const onOpenReplaceCover = vi.fn()

    render(
      <ArchivePageView
        {...buildProps([])}
        onOpenReplaceCover={onOpenReplaceCover}
      />
    )

    const button = screen.getByRole("button", { name: "替换封面" })
    fireEvent.click(button)
    expect(onOpenReplaceCover).toHaveBeenCalledTimes(1)
  })
})
