// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"

import { useListDataPipeline } from "./useListDataPipeline"
import { buildListCacheKey, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"

function DemoList({ filters }: { filters: { q: string } }) {
  const { items, status } = useListDataPipeline({
    cacheKey: "demo",
    ttlMs: 3000,
    pageSize: 2,
    initialFilters: filters,
    fetcher: async () => ({ items: ["new"], hasMore: false, nextOffset: 1 }),
    mapResponse: (response) => ({
      items: response.items,
      pagination: { hasMore: response.hasMore, nextOffset: response.nextOffset },
    }),
  })
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="items">{items.join(",")}</div>
    </div>
  )
}

describe("useListDataPipeline", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders cached items immediately then refreshes", async () => {
    const filterHash = stableStringify({ q: "a" })
    const key = buildListCacheKey("demo", filterHash)
    setListCache(key, {
      data: { items: ["cached"], pagination: { hasMore: false, nextOffset: 1 } },
      timestamp: Date.now(),
      filters: { q: "a" },
    })

    render(<DemoList filters={{ q: "a" }} />)

    expect(screen.getByTestId("items").textContent).toBe("cached")
    expect(screen.getByTestId("status").textContent).toBe("refreshing")

    await waitFor(() => {
      expect(screen.getByTestId("items").textContent).toBe("new")
    })

    expect(screen.getByTestId("status").textContent).toBe("ready")
  })
})
