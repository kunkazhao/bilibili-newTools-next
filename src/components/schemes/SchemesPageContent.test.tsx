// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import SchemesPageContent from "./SchemesPageContent"
import { buildListCacheKey, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"
import { apiRequest } from "@/lib/api"
import { fetchCategories } from "@/components/archive/archiveApi"

const viewCapture = {
  props: null as null | {
    schemes: Array<{ id: string }>
    isSchemeLoading: boolean
  },
}

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock("./SchemesPageView", () => ({
  default: (props: typeof viewCapture.props) => {
    viewCapture.props = props
    return null
  },
}))

vi.mock("./SchemesDialogs", () => ({
  default: () => null,
}))

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
}))

vi.mock("@/components/archive/archiveApi", () => ({
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  updateCategory: vi.fn(),
}))

describe("SchemesPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    viewCapture.props = null
    localStorage.clear()
  })

  it("renders cached schemes while refresh is in-flight", async () => {
    const schemes = [
      {
        id: "s1",
        name: "Scheme",
        category_id: "cat-1",
        items: [],
      },
    ]

    const filterHash = stableStringify({ scope: "all" })
    const cacheKey = buildListCacheKey("schemes", filterHash)
    setListCache(cacheKey, {
      data: {
        items: schemes,
        pagination: { hasMore: false, nextOffset: 1 },
      },
      timestamp: Date.now(),
      filters: { scope: "all" },
    })

    let resolveSchemes: ((value: { schemes: [] }) => void) | null = null

    vi.mocked(apiRequest).mockImplementation((path: string) => {
      if (path === "/api/schemes") {
        return new Promise((resolve) => {
          resolveSchemes = resolve
        })
      }
      return Promise.resolve({})
    })

    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })

    render(<SchemesPageContent onEnterScheme={() => {}} />)

    await waitFor(() => expect(viewCapture.props?.schemes.length).toBe(1))
    expect(viewCapture.props?.isSchemeLoading).toBe(true)

    resolveSchemes?.({ schemes: [] })
  })
})
