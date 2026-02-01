// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import BlueLinkMapPageContent from "./BlueLinkMapPageContent"
import { fetchBlueLinkMapState } from "./blueLinkMapApi"

const showToast = vi.fn()

vi.mock("./BlueLinkMapPageView", () => ({
  default: () => null,
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
})
