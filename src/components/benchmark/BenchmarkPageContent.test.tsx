// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import BenchmarkPageContent from "./BenchmarkPageContent"
import { buildListCacheKey, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"
import { apiRequest } from "@/lib/api"

const viewCapture = {
  props: null as null | {
    entries: Array<{ id: string; title?: string }>
    isLoading: boolean
    activeCategoryId?: string
    onCategorySelect?: (categoryId: string) => void
    onEditEntry?: (entry: { id: string }) => void
  },
}
const dialogCapture = {
  props: null as null | {
    editDialog: {
      entry: { id: string; title?: string } | null
      onSubmit: () => Promise<void>
    }
  },
}

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
}))

vi.mock("./BenchmarkPageView", () => ({
  default: (props: typeof viewCapture.props) => {
    viewCapture.props = props
    return null
  },
}))

vi.mock("./BenchmarkDialogs", () => ({
  default: (props: typeof dialogCapture.props) => {
    dialogCapture.props = props
    return null
  },
}))

describe("BenchmarkPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    viewCapture.props = null
    dialogCapture.props = null
    localStorage.clear()
  })

  it("renders cached entries while refresh is in-flight", async () => {
    const categories = [
      { id: "p1", name: "Parent", parent_id: null, sort_order: 10 },
      { id: "c1", name: "Category", parent_id: "p1", sort_order: 10 },
    ]
    const entries = [{ id: "e1", title: "Title", category_id: "c1" }]
    const filterHash = stableStringify({ scope: "all" })
    const cacheKey = buildListCacheKey("benchmark", filterHash)
    setListCache(cacheKey, {
      data: {
        items: [{ categories, entries }],
        pagination: { hasMore: false, nextOffset: 1 },
      },
      timestamp: Date.now(),
      filters: { scope: "all" },
    })

    let resolveFetch: ((value: { categories: []; entries: [] }) => void) | null = null

    vi.mocked(apiRequest).mockImplementation((path: string) => {
      if (path === "/api/benchmark/state") {
        return new Promise((resolve) => {
          resolveFetch = resolve
        })
      }
      return Promise.resolve({})
    })

    render(<BenchmarkPageContent />)

    await waitFor(() => expect(viewCapture.props?.entries.length).toBe(1))
    expect(viewCapture.props?.isLoading).toBe(false)

    resolveFetch?.({ categories: [], entries: [] })
  })

  it("uses child categories for filtering and switches list on category select", async () => {
    const categories = [
      { id: "p1", name: "Parent", parent_id: null, sort_order: 10 },
      { id: "c1", name: "Mouse", parent_id: "p1", sort_order: 10 },
      { id: "c2", name: "Keyboard", parent_id: "p1", sort_order: 20 },
    ]
    const entries = [
      { id: "e1", title: "Mouse video", category_id: "c1" },
      { id: "e2", title: "Keyboard video", category_id: "c2" },
    ]

    vi.mocked(apiRequest).mockImplementation((path: string) => {
      if (path === "/api/benchmark/state") {
        return Promise.resolve({ categories, entries })
      }
      return Promise.resolve({})
    })

    render(<BenchmarkPageContent />)

    await waitFor(() => expect(viewCapture.props?.activeCategoryId).toBe("c1"))
    await waitFor(() => expect(viewCapture.props?.entries.map((item) => item.id)).toEqual(["e1"]))

    viewCapture.props?.onCategorySelect?.("c2")
    await waitFor(() => expect(viewCapture.props?.entries.map((item) => item.id)).toEqual(["e2"]))
  })

  it("updates entries after edit submit", async () => {
    const categories = [
      { id: "p1", name: "Parent", parent_id: null, sort_order: 10 },
      { id: "c1", name: "Category", parent_id: "p1", sort_order: 10 },
    ]
    const entries = [{ id: "e1", title: "Old", category_id: "c1" }]
    const filterHash = stableStringify({ scope: "all" })
    const cacheKey = buildListCacheKey("benchmark", filterHash)
    setListCache(cacheKey, {
      data: {
        items: [{ categories, entries }],
        pagination: { hasMore: false, nextOffset: 1 },
      },
      timestamp: Date.now(),
      filters: { scope: "all" },
    })

    vi.mocked(apiRequest).mockImplementation((path: string) => {
      if (path === "/api/benchmark/state") {
        return Promise.resolve({ categories, entries })
      }
      if (path === "/api/benchmark/entries/e1") {
        return Promise.resolve({ entry: { ...entries[0], title: "New" } })
      }
      return Promise.resolve({})
    })

    render(<BenchmarkPageContent />)

    await waitFor(() => expect(viewCapture.props?.entries.length).toBe(1))
    viewCapture.props?.onEditEntry?.(entries[0] as { id: string })

    await waitFor(() => expect(dialogCapture.props?.editDialog.entry).toBeTruthy())
    await dialogCapture.props?.editDialog.onSubmit()

    await waitFor(() => expect(viewCapture.props?.entries[0]?.title).toBe("New"))
  })
})
