// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import BlueLinkMapPageContent from "./BlueLinkMapPageContent"
import { fetchBlueLinkMapState } from "./blueLinkMapApi"
import { buildListCacheKey, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"

const showToast = vi.fn()
let latestViewProps: any = null

vi.mock("./BlueLinkMapPageView", () => ({
  default: (props: any) => {
    latestViewProps = props
    return null
  },
}))

vi.mock("./BlueLinkMapDialogs", () => ({
  default: () => null,
}))

vi.mock("./blueLinkMapApi", () => ({
  fetchBlueLinkMapState: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}))

describe("BlueLinkMapPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    localStorage.clear()
    latestViewProps = null
  })

  it("loads state from v2 endpoint on mount", async () => {
    vi.mocked(fetchBlueLinkMapState).mockResolvedValue({
      accounts: [],
      categories: [],
      entries: [],
    })

    render(<BlueLinkMapPageContent />)

    await waitFor(() => expect(fetchBlueLinkMapState).toHaveBeenCalled(), {
      timeout: 500,
    })
  })

  it("renders cached entries while refresh is in-flight", async () => {
    const filterHash = stableStringify({ scope: "all" })
    const cacheKey = buildListCacheKey("blue-link-map", filterHash)
    setListCache(cacheKey, {
      data: {
        items: [
          {
            accounts: [{ id: "account-1", name: "Account 1" }],
            categories: [],
            entries: [
              {
                id: "entry-1",
                account_id: "account-1",
                source_link: "https://example.com",
              },
            ],
          },
        ],
        pagination: { hasMore: false, nextOffset: 1 },
      },
      timestamp: Date.now(),
      filters: { scope: "all" },
    })

    let resolveFetch: ((value: { accounts: []; categories: []; entries: [] }) => void) | null =
      null
    vi.mocked(fetchBlueLinkMapState).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    render(<BlueLinkMapPageContent />)

    await waitFor(() => {
      expect(latestViewProps?.entries?.length).toBe(1)
    })
    expect(latestViewProps?.listLoading).toBe(true)

    resolveFetch?.({ accounts: [], categories: [], entries: [] })
  })
})
