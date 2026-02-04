// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import BenchmarkPageView from "./BenchmarkPageView"

const baseProps = {
  isLoading: false,
  categories: [],
  entries: [],
  filter: "all",
  onFilterChange: vi.fn(),
  onAddClick: vi.fn(),
  onManageCategories: vi.fn(),
  onOpenSubtitle: vi.fn(),
  onEditEntry: vi.fn(),
  onDeleteEntry: vi.fn(),
}

describe("BenchmarkPageView", () => {
  it("marks clickable entry cards as interactive", () => {
    render(
      <BenchmarkPageView
        {...baseProps}
        entries={[{ id: "e1", title: "Video 1", link: "https://example.com" }]}
      />
    )

    const card = screen.getByText("Video 1").closest("article")
    expect(card).not.toBeNull()
    expect(card?.className).toContain("card-interactive")
  })
})
