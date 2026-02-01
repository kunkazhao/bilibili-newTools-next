// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import ArchivePageView from "./ArchivePageView"

let lastRowComponent: unknown

vi.mock("react-window", () => ({
  List: (props: { rowComponent?: unknown }) => {
    lastRowComponent = props.rowComponent
    return null
  },
}))

describe("ArchivePageView list rowComponent", () => {
  afterEach(() => {
    cleanup()
    lastRowComponent = undefined
  })

  it("keeps rowComponent stable across rerenders with same props", () => {
    const items = [
      {
        id: "item-1",
        title: "标题",
        price: "10",
        commission: "1",
        commissionRate: "10%",
        sales30: "--",
        comments: "--",
        image: "",
        categoryName: "分类",
        accountName: "账号",
        blueLink: "",
        shopName: "店铺",
        uid: "UID-1",
        source: "",
        params: [],
        remark: "",
        missingTips: [],
        isFocused: false,
      },
    ]

    const props = {
      items,
      categories: [{ id: "cat-1", name: "分类", sortOrder: 0, count: 1 }],
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
      priceRange: [0, 0] as [number, number],
      priceBounds: [0, 0] as [number, number],
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
        status: "idle" as const,
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
    }

    const { rerender } = render(<ArchivePageView {...props} />)
    const first = lastRowComponent

    rerender(<ArchivePageView {...props} />)

    expect(lastRowComponent).toBe(first)
  })
})
