// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import DirectPlansPageView from "./DirectPlansPageView"
import type { DirectPlan } from "./types"

const baseProps = {
  loading: false,
  plans: [] as DirectPlan[],
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onDrop: vi.fn(),
}

describe("DirectPlansPageView", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders empty state", () => {
    render(<DirectPlansPageView {...baseProps} />)
    expect(screen.getByText("暂无定向计划")).toBeTruthy()
  })

  it("renders list rows", () => {
    const plans = [
      { id: "p1", platform: "京东", category: "耳机", brand: "X", commission_rate: "20%" },
    ] as DirectPlan[]
    render(<DirectPlansPageView {...baseProps} plans={plans} />)
    expect(screen.getByText("京东")).toBeTruthy()
    expect(screen.getByText("耳机")).toBeTruthy()
    expect(screen.getByText("X")).toBeTruthy()
  })

  it("renders brand as link when plan_link exists", () => {
    const plans = [
      {
        id: "p1",
        platform: "京东",
        category: "A",
        brand: "Brand",
        plan_link: "https://example.com",
      },
    ] as DirectPlan[]
    render(<DirectPlansPageView {...baseProps} plans={plans} />)
    const brandLink = screen.getByRole("link", { name: "Brand" })
    expect(brandLink).toBeTruthy()
  })

  it("renders brand as text when plan_link missing", () => {
    const plans = [
      { id: "p1", platform: "京东", category: "A", brand: "Brand" },
    ] as DirectPlan[]
    render(<DirectPlansPageView {...baseProps} plans={plans} />)
    expect(screen.queryByRole("link", { name: "Brand" })).toBeNull()
    expect(screen.getByText("Brand")).toBeTruthy()
  })
})
