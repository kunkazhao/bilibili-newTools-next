// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ImportProgressModal from "./ImportProgressModal"

describe("ImportProgressModal", () => {
  it("renders progress summary and cancel button when running", () => {
    render(
      <ImportProgressModal
        isOpen
        state={{
          status: "running",
          total: 10,
          processed: 5,
          success: 4,
          failed: 1,
          failures: [
            { link: "https://example.com", title: "未识别SKU", reason: "商品无法匹配" },
          ],
        }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText("导入进度")).not.toBeNull()
    expect(screen.getByText("50%")).not.toBeNull()
    expect(screen.getByText(/共\s*10\s*条\s*·\s*失败\s*1\s*条/)).not.toBeNull()
    expect(screen.getByRole("button", { name: "取消" })).not.toBeNull()
  })
})
