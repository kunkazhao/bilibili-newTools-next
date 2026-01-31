// @vitest-environment jsdom
import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import SchemeDetailToolbar from "./SchemeDetailToolbar"

describe("SchemeDetailToolbar", () => {
  it("shows export/feishu actions and hides reset/clear filter", () => {
    render(
      <SchemeDetailToolbar
        priceMin=""
        priceMax=""
        sortValue="manual"
        onPriceMinChange={() => {}}
        onPriceMaxChange={() => {}}
        onSortChange={() => {}}
        onClearItems={() => {}}
        onOpenPicker={() => {}}
        onExport={() => {}}
        onOpenFeishu={() => {}}
      />
    )

    expect(screen.getByRole("button", { name: "导出Excel" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "写入飞书表格" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "重置筛选" })).toBeNull()
    expect(screen.queryByRole("button", { name: "清空筛选" })).toBeNull()
  })
})
