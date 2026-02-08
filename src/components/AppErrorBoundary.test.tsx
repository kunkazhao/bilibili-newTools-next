// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AppErrorBoundary from "./AppErrorBoundary"

const ThrowAlways = ({ message = "boom" }: { message?: string }) => {
  throw new Error(message)
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("shows fallback UI when child throws", () => {
    render(
      <AppErrorBoundary>
        <ThrowAlways message="测试错误" />
      </AppErrorBoundary>
    )

    expect(screen.getByRole("heading", { name: "页面加载失败" })).toBeTruthy()
    expect(screen.getByText("错误信息：测试错误")).toBeTruthy()
    expect(screen.getByRole("button", { name: "刷新页面" })).toBeTruthy()
  })

  it("uses custom reload handler when clicking refresh", async () => {
    const user = userEvent.setup()
    const onReload = vi.fn()

    render(
      <AppErrorBoundary onReload={onReload}>
        <ThrowAlways />
      </AppErrorBoundary>
    )

    await user.click(screen.getByRole("button", { name: "刷新页面" }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })
})
