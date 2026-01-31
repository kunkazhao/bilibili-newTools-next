import { describe, expect, it } from "vitest"
import { buildSortOrderUpdates, isFixSortDisabled } from "./ArchivePageContent"

describe("buildSortOrderUpdates", () => {
  it("assigns padded sort order strings in current order", () => {
    const items = [
      { id: "a", spec: {} as Record<string, string> },
      { id: "b", spec: { foo: "bar" } as Record<string, string> },
    ]
    const result = buildSortOrderUpdates(items)

    expect(result[0].spec._sort_order).toBe("000010")
    expect(result[1].spec._sort_order).toBe("000020")
  })

  it("disables fixed sort when filters are active", () => {
    expect(
      isFixSortDisabled({
        searchValue: "关键词",
        schemeFilterId: "",
        priceBounds: [0, 100],
        priceRange: [0, 100],
      })
    ).toBe(true)

    expect(
      isFixSortDisabled({
        searchValue: "",
        schemeFilterId: "scheme-1",
        priceBounds: [0, 100],
        priceRange: [0, 100],
      })
    ).toBe(true)

    expect(
      isFixSortDisabled({
        searchValue: "",
        schemeFilterId: "",
        priceBounds: [0, 100],
        priceRange: [10, 90],
      })
    ).toBe(true)

    expect(
      isFixSortDisabled({
        searchValue: "",
        schemeFilterId: "",
        priceBounds: [0, 100],
        priceRange: [0, 100],
      })
    ).toBe(false)
  })
})
