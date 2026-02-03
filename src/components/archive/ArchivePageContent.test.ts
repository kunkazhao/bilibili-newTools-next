import { describe, expect, it } from "vitest"
import {
  buildSortOrderUpdates,
  fetchSchemeFilterItemsBatch,
  filterSchemesByCategory,
  isFixSortDisabled,
  resolvePriceRange,
  resolveSortValueAfterLoad,
} from "./ArchivePageContent"

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

  it("treats tiny float differences as not filtered", () => {
    expect(
      isFixSortDisabled({
        searchValue: "",
        schemeFilterId: "",
        priceBounds: [38.8, 1189],
        priceRange: [38.8000001, 1189.0000001],
      })
    ).toBe(false)
  })
})

describe("filterSchemesByCategory", () => {
  it("filters schemes by selected category", () => {
    const schemes = [
      { id: "scheme-1", name: "方案1", category_id: "cat-1" },
      { id: "scheme-2", name: "方案2", category_id: "cat-2" },
      { id: "scheme-3", name: "方案3" },
    ]

    expect(filterSchemesByCategory(schemes, "all")).toHaveLength(3)
    expect(filterSchemesByCategory(schemes, "cat-1").map((item) => item.id)).toEqual([
      "scheme-1",
    ])
    expect(filterSchemesByCategory(schemes, "cat-2").map((item) => item.id)).toEqual([
      "scheme-2",
    ])
    expect(filterSchemesByCategory(schemes, "missing")).toHaveLength(0)
  })
})

describe("resolveSortValueAfterLoad", () => {
  it("keeps price sort when manual order exists", () => {
    expect(resolveSortValueAfterLoad("price", true)).toBe("price")
  })

  it("keeps manual sort when manual order exists", () => {
    expect(resolveSortValueAfterLoad("manual", true)).toBe("manual")
  })
})

describe("resolvePriceRange", () => {
  it("returns bounds when range is unset", () => {
    expect(resolvePriceRange([10, 100], [0, 0])).toEqual([10, 100])
  })
})

describe("fetchSchemeFilterItemsBatch", () => {
  it("uses batch endpoint and preserves scheme item order", async () => {
    const calls: Array<{ url: string; options?: RequestInit }> = []
    const request = async (url: string, options?: RequestInit) => {
      calls.push({ url, options })
      if (url === "/api/schemes/scheme-1") {
        return {
          scheme: {
            id: "scheme-1",
            items: [{ source_id: "item-1" }, { source_id: "item-2" }],
          },
        }
      }
      if (url === "/api/sourcing/items/by-ids") {
        return {
          items: [
            { id: "item-2", category_id: "cat-1", title: "B" },
            { id: "item-1", category_id: "cat-1", title: "A" },
          ],
        }
      }
      throw new Error(`unexpected url ${url}`)
    }

    const result = await fetchSchemeFilterItemsBatch("scheme-1", request)

    expect(calls.map((entry) => entry.url)).toEqual([
      "/api/schemes/scheme-1",
      "/api/sourcing/items/by-ids",
    ])
    expect(result.items.map((item) => item.id)).toEqual(["item-1", "item-2"])
  })
})
