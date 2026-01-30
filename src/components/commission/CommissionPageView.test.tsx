// @vitest-environment jsdom
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import CommissionPageView from "./CommissionPageView"

const capturedProps: Array<Record<string, unknown>> = []

vi.mock("@/components/commission/CommissionListCard", () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.push(props)
    return <div data-testid="commission-card" />
  },
}))

describe("CommissionPageView", () => {
  it("does not forward focus toggle handler to list cards", () => {
    const View = CommissionPageView as unknown as React.FC<Record<string, unknown>>

    render(
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
        videoItems={[]}
        videoCategories={[]}
        videoCategoryFilter=""
        onVideoCategoryChange={() => {}}
        selectedVideos={[]}
        editTarget={undefined}
        filters={{
          keyword: "",
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

    expect(capturedProps[0]?.onToggleFocus).toBeUndefined()
  })
})
