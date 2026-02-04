// @vitest-environment jsdom
import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import SchemeDetailToolbar from "./SchemeDetailToolbar"

describe("SchemeDetailToolbar", () => {
  it("shows compact picker actions and sort dropdown", () => {
    render(
      <SchemeDetailToolbar
        sortValue="manual"
        onSortChange={() => {}}
        onClearItems={() => {}}
        onOpenPicker={() => {}}
      />
    )

    expect(screen.getByRole("button", { name: "清空列表" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "新增选品" })).not.toBeNull()
    expect(screen.getByLabelText("Sort")).not.toBeNull()
    expect(screen.queryByRole("button", { name: "导出Excel" })).toBeNull()
    expect(screen.queryByRole("button", { name: "写入飞书表格" })).toBeNull()
  })
})
