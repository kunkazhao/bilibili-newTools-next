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
})
