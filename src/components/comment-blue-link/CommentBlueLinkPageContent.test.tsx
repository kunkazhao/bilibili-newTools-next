// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import CommentBlueLinkPageContent from "./CommentBlueLinkPageContent"

const showToast = vi.fn()
import { ToastProvider } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { getPinnedComments } from "@/lib/bilibili"
import { fetchCommentBlueLinkState } from "./commentBlueLinkApi"

const cacheKey = "comment_blue_link_cache_v1"

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
}))

vi.mock("./commentBlueLinkApi", () => ({
  fetchCommentBlueLinkState: vi.fn(),
}))

vi.mock("@/lib/bilibili", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bilibili")>(
    "@/lib/bilibili"
  )
  return {
    ...actual,
    getPinnedComments: vi.fn(),
  }
})

describe("CommentBlueLinkPageContent product_content", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    showToast.mockClear()
    localStorage.clear()
  })

  it("uses product_content without calling getPinnedComments", async () => {
    const accounts = [{ id: "a1", name: "Account" }]
    const categories: [] = []
    const combos = [
      {
        id: "c1",
        name: "Combo",
        account_id: "a1",
        category_id: "",
        content: "Full content",
        remark: "",
        source_link: "https://b23.tv/abc",
        product_content: "Product content",
      },
    ]
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        accounts,
        categories,
        combos,
        currentAccountId: "a1",
        currentCategoryId: "__all__",
      })
    )
    vi.mocked(fetchCommentBlueLinkState).mockResolvedValue({ accounts, categories, combos })

    const user = userEvent.setup()

    render(
      <ToastProvider>
        <CommentBlueLinkPageContent />
      </ToastProvider>
    )

    const comboLabels = await screen.findAllByText("Combo")
    expect(comboLabels.length).toBeGreaterThan(0)

    const toggleButton = document.querySelector(
      "button.text-xs.text-slate-500"
    ) as HTMLButtonElement | null
    if (!toggleButton) throw new Error("Version toggle button not found")
    await user.click(toggleButton)

    expect(await screen.findByText("Product content")).not.toBeNull()
    expect(getPinnedComments).not.toHaveBeenCalled()
  })

  it("copies combo content when clicking copy button", async () => {
    const accounts = [{ id: "a1", name: "Account" }]
    const categories: [] = []
    const combos = [
      {
        id: "c1",
        name: "Combo",
        account_id: "a1",
        category_id: "",
        content: "Full content",
        remark: "",
        source_link: "https://b23.tv/abc",
        product_content: "Product content",
      },
    ]
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        accounts,
        categories,
        combos,
        currentAccountId: "a1",
        currentCategoryId: "__all__",
      })
    )
    vi.mocked(fetchCommentBlueLinkState).mockResolvedValue({ accounts, categories, combos })

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })

    const user = userEvent.setup()

    render(
      <ToastProvider>
        <CommentBlueLinkPageContent />
      </ToastProvider>
    )

    const comboLabels = await screen.findAllByText("Combo")
    expect(comboLabels.length).toBeGreaterThan(0)

    const copyButtons = screen.getAllByLabelText("Copy combo")
    fireEvent.click(copyButtons[0])

    await waitFor(() => expect(showToast).toHaveBeenCalled())
  })

  it("loads state from v2 endpoint", async () => {
    vi.mocked(fetchCommentBlueLinkState).mockResolvedValue({
      accounts: [],
      categories: [],
      combos: [],
    })

    render(
      <ToastProvider>
        <CommentBlueLinkPageContent />
      </ToastProvider>
    )

    await waitFor(() => expect(fetchCommentBlueLinkState).toHaveBeenCalled())
  })
})
