// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import SchemeDetailPageContent from "./SchemeDetailPageContent"
import { fetchBlueLinkMapState } from "@/components/blue-link-map/blueLinkMapApi"

const showToast = vi.fn()

vi.mock("@/components/schemes/SchemeDetailDialogs", () => ({
  default: () => null,
}))

vi.mock("@/components/schemes/SchemeDetailPageView", () => ({
  default: () => null,
}))

vi.mock("@/components/blue-link-map/blueLinkMapApi", () => ({
  fetchBlueLinkMapState: vi.fn(),
}))

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn((path: string) => {
    if (path.startsWith("/api/schemes/")) {
      return Promise.resolve({
        scheme: {
          id: "s1",
          category_id: "cat-1",
          items: [{ id: "item-1", source_id: "p1" }],
        },
      })
    }
    if (path.startsWith("/api/prompts")) {
      return Promise.resolve({ templates: {} })
    }
    if (path.startsWith("/api/sourcing/categories")) {
      return Promise.resolve({ categories: [] })
    }
    if (path.startsWith("/api/sourcing/items")) {
      return Promise.resolve({ items: [] })
    }
    if (path.startsWith("/api/image/templates")) {
      return Promise.resolve({ templates: [] })
    }
    return Promise.resolve({})
  }),
}))

describe("SchemeDetailPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("loads blue link state via v2 helper", async () => {
    vi.mocked(fetchBlueLinkMapState).mockResolvedValue({
      accounts: [],
      categories: [],
      entries: [],
    })

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() =>
      expect(fetchBlueLinkMapState).toHaveBeenCalledWith(["p1"])
    )
  })
})
