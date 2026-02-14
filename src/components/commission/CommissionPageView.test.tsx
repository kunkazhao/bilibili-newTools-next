// @vitest-environment jsdom
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import CommissionPageView from "./CommissionPageView"

const capturedProps: Array<Record<string, unknown>> = []

vi.mock("@/components/commission/CommissionListCard", () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.push(props)
    return <div data-testid="commission-card" />
  },
}))

describe("CommissionPageView", () => {
  afterEach(() => {
    cleanup()
    capturedProps.length = 0
  })

  const renderView = () => {
    const View = CommissionPageView as unknown as React.FC<Record<string, unknown>>
    return render(
      <View
        inputValue=""
        onInputChange={() => {}}
        items={[
          {
            id: "item-1",
            index: 1,
            title: "商品",
            price: 100,
            commissionRate: 10,
            commission: 10,
            sales30: 20,
            comments: "5",
            image: "",
            shopName: "",
            source: "",
            isFocused: false,
            isArchived: false,
          },
        ]}
        isProcessing={false}
        progress={{ current: 0, total: 0 }}
        progressMessage=""
        resultOpen={false}
        resultItems={[]}
        resultHighlight={{ label: "", value: "" }}
        selectVideoOpen={false}
        isVideoPickLoading={false}
        videoItems={[]}
        videoParentCategories={[]}
        videoChildCategories={[]}
        videoParentCategoryFilter=""
        videoChildCategoryFilter=""
        onVideoParentCategoryChange={() => {}}
        onVideoChildCategoryChange={() => {}}
        selectedVideos={[]}
        editTarget={undefined}
        filters={{
          keyword: "",
          platform: "all",
          priceMin: "",
          priceMax: "",
          rateMin: "",
          rateMax: "",
          salesMin: "",
          salesMax: "",
          sort: "price_asc",
        }}
        onFilterChange={() => {}}
        onEdit={() => {}}
        onArchive={() => {}}
        onArchiveAll={() => {}}
        onDelete={() => {}}
        onClearAll={() => {}}
        onExport={() => {}}
        onDownloadImages={() => {}}
        onParseBili={() => {}}
        onParsePromo={() => {}}
        onParseBenchmark={() => {}}
        onCloseProgress={() => {}}
        onCloseResult={() => {}}
        onSortAll={() => {}}
        onSortNew={() => {}}
        onToggleVideo={() => {}}
        onStartExtract={() => {}}
        onCloseSelectVideo={() => {}}
        onSaveEdit={() => {}}
        onCloseEdit={() => {}}
      />
    )
  }

  it("does not forward focus toggle handler to list cards", () => {
    renderView()

    expect(capturedProps[0]?.onToggleFocus).toBeUndefined()
  })

  it("renders platform filter with shared Select trigger instead of native select", () => {
    const { container } = renderView()

    expect(container.querySelector('select[aria-label="Platform filter"]')).toBeNull()
    const triggers = screen.getAllByRole("combobox", { name: "Platform filter" })
    expect(triggers.length).toBeGreaterThan(0)
  })
})
