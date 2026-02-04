// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"

import { StrictMode } from "react"
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

  it("does not refetch repeatedly on stable render", async () => {
    const fetcher = vi.fn(async () => ({ items: ["new"], hasMore: false, nextOffset: 1 }))

    function StableDemo() {
      useListDataPipeline({
        cacheKey: "demo",
        ttlMs: 3000,
        pageSize: 2,
        initialFilters: { q: "a" },
        fetcher,
        mapResponse: (response) => ({
          items: response.items,
          pagination: { hasMore: response.hasMore, nextOffset: response.nextOffset },
        }),
      })
      return null
    }

    render(<StableDemo />)

    await waitFor(() => expect(fetcher).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("loads items in StrictMode without getting stuck", async () => {
    render(
      <StrictMode>
        <DemoList filters={{ q: "a" }} />
      </StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByTestId("items").textContent).toBe("new")
    })

    expect(screen.getByTestId("status").textContent).toBe("ready")
  })
})
