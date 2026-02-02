// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ProgressDialog from "./ProgressDialog"

describe("ProgressDialog", () => {
  it("renders title, percent, summary and failure list", () => {
    render(
      <ProgressDialog
        open
        title="映射进度"
        status="running"
        total={10}
        processed={5}
        failures={[{ name: "未识别SKU", reason: "商品无法匹配" }]}
        showSummary
        showFailures
        allowCancel
      />
    )

    expect(screen.getByText("映射进度")).not.toBeNull()
    expect(screen.getByText("50%")).not.toBeNull()
    expect(screen.getByText("10个商品 · 1个失败")).not.toBeNull()
    expect(screen.getByText("未识别SKU")).not.toBeNull()
    expect(screen.getByText("商品无法匹配")).not.toBeNull()
    expect(screen.getByRole("button", { name: "取消" })).not.toBeNull()
  })

  it("shows close button when done", () => {
    render(
      <ProgressDialog
        open
        title="导入进度"
        status="done"
        total={3}
        processed={3}
        showSummary
      />
    )
    expect(screen.getByRole("button", { name: "关闭" })).not.toBeNull()
  })
})
