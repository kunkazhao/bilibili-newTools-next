// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"

import { cleanup, render, screen, within } from "@testing-library/react"

import userEvent from "@testing-library/user-event"

import type { ComponentProps } from "react"

import SchemesPageView from "./SchemesPageView"

import type { CategoryItem } from "@/components/archive/types"
import type { Scheme } from "@/components/schemes/types"

type SchemesPageViewProps = ComponentProps<typeof SchemesPageView>

const category: CategoryItem = {
  id: "cat-1",
  name: "\u9f20\u6807",
  sortOrder: 0,
  count: 1,
}

const scheme: Scheme = {
  id: "scheme-1",
  name: "\u4e3b\u65b9\u6848",
  category_id: "cat-1",
  category_name: "\u9f20\u6807",
  remark: "\u6682\u65e0\u5907\u6ce8",
  created_at: "2026-01-24T00:00:00.000Z",
  items: [],
}

const baseProps: SchemesPageViewProps = {
  categories: [category],
  schemes: [scheme],
  filteredSchemes: [scheme],
  activeCategoryId: "cat-1",
  isCategoryLoading: false,
  isSchemeLoading: false,
  statusMessage: "",
  onCreate: vi.fn(),
  onManageCategories: vi.fn(),
  onCategorySelect: vi.fn(),
  onEditScheme: vi.fn(),
  onDeleteScheme: vi.fn(),
  onEnterScheme: vi.fn(),
}

describe("SchemesPageView", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the create button in a card-style header", () => {
    render(<SchemesPageView {...baseProps} />)

    const list = screen.getByTestId("schemes-list")
    expect(
      within(list).getByRole("button", { name: "\u65b0\u5efa\u65b9\u6848" })
    ).not.toBeNull()

    const headerCard = screen.getByTestId("schemes-create-card")
    expect(headerCard.className).toContain("rounded-2xl")
    expect(headerCard.className).toContain("border-slate-200")
    expect(headerCard.className).toContain("bg-white")
    expect(headerCard.className).toContain("p-5")
    expect(headerCard.className).toContain("shadow-card")
  })

  it("enters scheme when clicking the card", async () => {
    const user = userEvent.setup()
    const onEnterScheme = vi.fn()

    render(<SchemesPageView {...baseProps} onEnterScheme={onEnterScheme} />)

    const card = screen.getByText("\u4e3b\u65b9\u6848").closest("article")
    expect(card).not.toBeNull()
    expect(card?.className).toContain("card-interactive")
    await user.click(card!)

    expect(onEnterScheme).toHaveBeenCalledWith("scheme-1")
  })

  it("does not navigate when clicking edit/delete icons", async () => {
    const user = userEvent.setup()
    const onEnterScheme = vi.fn()
    const onEditScheme = vi.fn()
    const onDeleteScheme = vi.fn()

    render(
      <SchemesPageView
        {...baseProps}
        onEnterScheme={onEnterScheme}
        onEditScheme={onEditScheme}
        onDeleteScheme={onDeleteScheme}
      />
    )

    await user.click(screen.getByLabelText("\u7f16\u8f91\u65b9\u6848"))
    expect(onEditScheme).toHaveBeenCalledWith(scheme)
    expect(onEnterScheme).not.toHaveBeenCalled()

    await user.click(screen.getByLabelText("\u5220\u9664\u65b9\u6848"))
    expect(onDeleteScheme).toHaveBeenCalledWith("scheme-1")
    expect(onEnterScheme).not.toHaveBeenCalled()
  })

  it("removes the category label from scheme cards", () => {
    render(<SchemesPageView {...baseProps} />)

    expect(screen.queryByText(/\u5206\u7c7b\uff1a/)).toBeNull()
  })

  it("renders scheme cards in a three-column grid layout", () => {
    render(<SchemesPageView {...baseProps} />)

    const grid = screen.getByTestId("schemes-card-grid")
    expect(grid.className).toContain("grid")
    expect(grid.className).toContain("gap-4")
    expect(grid.className).toContain("md:grid-cols-2")
    expect(grid.className).toContain("lg:grid-cols-3")
  })
})
