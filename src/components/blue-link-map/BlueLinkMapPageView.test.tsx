// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import BlueLinkMapPageView from "./BlueLinkMapPageView"
import type { BlueLinkAccount, BlueLinkCategory, BlueLinkEntry, SourcingItem } from "./types"

const baseProps = {
  loading: false,
  listLoading: false,
  accounts: [] as BlueLinkAccount[],
  entries: [] as BlueLinkEntry[],
  activeAccountId: null,
  activeCategoryId: null,
  searchValue: "",
  accountCategories: [] as BlueLinkCategory[],
  filteredEntries: [] as BlueLinkEntry[],
  visibleEntries: [] as BlueLinkEntry[],
  itemsById: new Map<string, SourcingItem>(),
  entriesCountByAccount: new Map<string, number>(),
  onAccountChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onSearchChange: vi.fn(),
  onOpenAccountManage: vi.fn(),
  onOpenCategoryManage: vi.fn(),
  onOpenImport: vi.fn(),
  onAutoMap: vi.fn(),
  onCopy: vi.fn(),
  onEdit: vi.fn(),
  onPick: vi.fn(),
  onDelete: vi.fn(),
}

describe("BlueLinkMapPageView", () => {
  it("renders main layout even when loading with no data", () => {
    const { container } = render(
      <BlueLinkMapPageView
        {...baseProps}
        loading
        listLoading
      />
    )

    expect(container.querySelector("aside")).not.toBeNull()
  })

  it("shows skeleton layout when loading and empty", () => {
    render(<BlueLinkMapPageView {...baseProps} loading listLoading />)
    expect(screen.getAllByTestId("blue-link-map-skeleton").length).toBeGreaterThan(0)
  })

  it("renders lazy-loaded cover images", () => {
    const entry = {
      id: "e1",
      account_id: "a1",
      category_id: "c1",
      source_link: "https://b23.tv/test",
      product_cover: "https://example.com/cover.jpg",
      product_title: "Test",
      product_price: 199,
      product_id: "p1",
    } as BlueLinkEntry

    const itemsById = new Map<string, SourcingItem>([
      ["p1", { id: "p1", title: "Test", price: 199, cover_url: "https://example.com/cover.jpg" }],
    ])

    const { container } = render(
      <BlueLinkMapPageView
        {...baseProps}
        loading={false}
        listLoading={false}
        accounts={[{ id: "a1", name: "账号" }]}
        activeAccountId="a1"
        accountCategories={[{ id: "c1", account_id: "a1", name: "分类", sort_order: 10 }]}
        activeCategoryId="c1"
        entries={[entry]}
        filteredEntries={[entry]}
        visibleEntries={[entry]}
        itemsById={itemsById}
      />
    )

    const img = container.querySelector("img")
    expect(img?.getAttribute("loading")).toBe("lazy")
    expect(img?.getAttribute("decoding")).toBe("async")
  })
})
