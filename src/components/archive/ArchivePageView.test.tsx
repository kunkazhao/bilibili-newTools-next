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



  it("renders a compact search input width on desktop", () => {

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



    const input = screen.getByPlaceholderText("搜索商品名称、关键词...")

    const wrapper = input.parentElement

    expect(wrapper?.className).toContain("md:w-[180px]")

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



  it("renders load-more row when there are more items", () => {

    render(

      <ArchivePageView

        items={[

          {

            id: "item-1",

            title: "测试商品",

            price: "10",

            commission: "1",

            commissionRate: "10%",

            sales30: "--",

            comments: "--",

            image: "",

            categoryName: "分类1",

            accountName: "",

            blueLink: "",

            shopName: "",

            uid: "SB001",

            source: "",

            params: [],

            remark: "",

            missingTips: [],

            isFocused: false,

          },

        ]}

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

        hasMore={true}

        isLoadingMore={false}

        onLoadMore={() => {}}

        sortValue="manual"

        onSortChange={() => {}}

        onCreate={() => {}}

        onEdit={() => {}}

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



    expect(screen.getByText("加载更多")).toBeTruthy()

    expect(screen.getByTestId("archive-list")).toBeTruthy()
    expect(screen.queryByTestId("archive-virtual-list")).toBeNull()

  })



  it("uses 12px spacing between cards", () => {
    render(
      <ArchivePageView
        items={[
          {
            id: "item-1",
            title: "????",
            price: "10",
            commission: "1",
            commissionRate: "10%",
            sales30: "--",
            comments: "--",
            image: "",
            categoryName: "??1",
            accountName: "",
            blueLink: "",
            shopName: "",
            uid: "SB001",
            source: "",
            params: [],
            remark: "",
            missingTips: [],
            isFocused: false,
          },
          {
            id: "item-2",
            title: "????2",
            price: "20",
            commission: "2",
            commissionRate: "20%",
            sales30: "--",
            comments: "--",
            image: "",
            categoryName: "??1",
            accountName: "",
            blueLink: "",
            shopName: "",
            uid: "SB002",
            source: "",
            params: [],
            remark: "",
            missingTips: [],
            isFocused: false,
          },
        ]}
        categories={[{ id: "cat-1", name: "??1", sortOrder: 0, count: 0 }]}
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

    const list = screen.getByTestId("archive-list")
    const firstItem = list.firstElementChild as HTMLElement | null
    expect(firstItem).toBeTruthy()
    expect(firstItem?.style.paddingBottom).toBe("12px")
  })

  it("hides load-more row when there are no more items", () => {

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



    expect(screen.queryByText("加载更多")).toBeNull()

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



  it("hides filter labels and price range hint", () => {

    render(

      <ArchivePageView

        items={[]}

        categories={[{ id: "cat-1", name: "分类1", sortOrder: 0, count: 0 }]}

        isCategoryLoading={false}

        isListLoading={false}

        isRefreshing={false}

        isUsingCache={false}

        schemes={[{ id: "scheme-1", name: "方案一" }]}

        schemeValue=""

        isSchemeLoading={false}

        onSchemeChange={() => {}}

        selectedCategory="cat-1"

        searchValue=""

        onSearchChange={() => {}}

        priceRange={[160, 2344]}

        priceBounds={[160, 2344]}

        onPriceRangeChange={() => {}}

        hasMore={false}

        isLoadingMore={false}

        onLoadMore={() => {}}

        sortValue="manual"

        onSortChange={() => {}}

        onCreate={() => {}}

        onEdit={() => {}}

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



    expect(screen.queryByText("搜索")).toBeNull()

    expect(screen.queryByText("方案筛选")).toBeNull()

    expect(screen.queryByText("价格区间")).toBeNull()

    expect(screen.queryByText("排序")).toBeNull()

    expect(screen.queryByText("160 - 2344")).toBeNull()



    expect(screen.getByText("方案")).toBeTruthy()

    expect(screen.getByText("价格")).toBeTruthy()

  })



  it("renders empty price inputs when range is unset", () => {

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

        priceBounds={[38.8, 1189]}

        onPriceRangeChange={() => {}}

        hasMore={false}

        isLoadingMore={false}

        onLoadMore={() => {}}

        sortValue="manual"

        onSortChange={() => {}}

        onCreate={() => {}}

        onEdit={() => {}}

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



    const minInput = screen.getByLabelText("Min price") as HTMLInputElement

    const maxInput = screen.getByLabelText("Max price") as HTMLInputElement

    expect(minInput.value).toBe("")

    expect(maxInput.value).toBe("")

  })


  it("renders list skeleton when loading with empty items even if cache flag is true", () => {

    render(

      <ArchivePageView

        items={[]}

        categories={[{ id: "cat-1", name: "Category 1", sortOrder: 0, count: 0 }]}

        isCategoryLoading={false}

        isListLoading={true}

        isRefreshing={false}

        isUsingCache={true}

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



    expect(screen.getByTestId("archive-list-skeleton")).toBeTruthy()

  })

  it("calls onAddToScheme when clicking join scheme", async () => {
    const onAddToScheme = vi.fn()
    const user = userEvent.setup()

    render(
      <ArchivePageView
        items={[
          {
            id: "item-1",
            title: "????",
            price: "10",
            commission: "1",
            commissionRate: "10%",
            sales30: "--",
            comments: "--",
            image: "",
            categoryName: "??1",
            accountName: "",
            blueLink: "",
            shopName: "",
            uid: "SB001",
            source: "",
            params: [],
            remark: "",
            missingTips: [],
            isFocused: false,
          },
        ]}
        categories={[{ id: "cat-1", name: "??1", sortOrder: 0, count: 0 }]}
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
        onAddToScheme={onAddToScheme}
      />
    )

    await user.click(screen.getByTestId("archive-add-scheme"))
    expect(onAddToScheme).toHaveBeenCalledWith("item-1")
  })

  it("allows collapsing parent categories to hide children", async () => {
    const user = userEvent.setup()
    const onSelectParent = vi.fn()

    render(
      <ArchivePageView
        items={[]}
        categories={[
          { id: "p1", name: "Parent 1", sortOrder: 0 },
          { id: "p2", name: "Parent 2", sortOrder: 1 },
          { id: "c1", name: "Child 1", sortOrder: 0, parentId: "p1", count: 2 },
          { id: "c2", name: "Child 2", sortOrder: 0, parentId: "p2", count: 0 },
        ]}
        activeParentId="p1"
        activeCategoryId="c1"
        isCategoryLoading={false}
        isListLoading={false}
        isRefreshing={false}
        isUsingCache={false}
        schemes={[]}
        schemeValue=""
        isSchemeLoading={false}
        onSchemeChange={() => {}}
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
        onDelete={() => {}}
        onToggleFocus={() => {}}
        onDragStart={() => {}}
        onDrop={() => {}}
        onSelectParent={onSelectParent}
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
        onBatchFetchParams={() => {}}
      />
    )

    expect(screen.getByRole("button", { name: /Child 1/ })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Parent 1" }))
    expect(screen.queryByRole("button", { name: /Child 1/ })).toBeNull()
  })

})

