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
import { buildListCacheKey, setListCache } from "@/lib/listCache"
import { stableStringify } from "@/lib/stableStringify"

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
    const combos = [
      {
        id: "c1",
        name: "Combo",
        account_id: "a1",
        content: "Full content",
        remark: "",
        source_link: "https://b23.tv/abc",
        product_content: "Product content",
      },
    ]
    const filterHash = stableStringify({ scope: "all" })
    const cacheKey = buildListCacheKey("comment-blue-link", filterHash)
    setListCache(cacheKey, {
      data: {
        items: [{ accounts, combos }],
        pagination: { hasMore: false, nextOffset: 1 },
      },
      timestamp: Date.now(),
      filters: { scope: "all" },
    })
    vi.mocked(fetchCommentBlueLinkState).mockResolvedValue({ accounts, combos })

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
    const combos = [
      {
        id: "c1",
        name: "Combo",
        account_id: "a1",
        content: "Full content",
        remark: "",
        source_link: "https://b23.tv/abc",
        product_content: "Product content",
      },
    ]
    const filterHash = stableStringify({ scope: "all" })
    const cacheKey = buildListCacheKey("comment-blue-link", filterHash)
    setListCache(cacheKey, {
      data: {
        items: [{ accounts, combos }],
        pagination: { hasMore: false, nextOffset: 1 },
      },
      timestamp: Date.now(),
      filters: { scope: "all" },
    })
    vi.mocked(fetchCommentBlueLinkState).mockResolvedValue({ accounts, combos })

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
      combos: [],
    })

    render(
      <ToastProvider>
        <CommentBlueLinkPageContent />
      </ToastProvider>
    )

    await waitFor(() => expect(fetchCommentBlueLinkState).toHaveBeenCalled())
  })

  it("renders cached combos while refresh is in-flight", async () => {
    const accounts = [{ id: "a1", name: "Account" }]
    const combos = [
      {
        id: "c1",
        name: "Combo",
        account_id: "a1",
        content: "Full content",
        remark: "",
        source_link: "https://b23.tv/abc",
        product_content: "Product content",
      },
    ]

    const filterHash = stableStringify({ scope: "all" })
    const cacheKey = buildListCacheKey("comment-blue-link", filterHash)
    setListCache(cacheKey, {
      data: {
        items: [
          {
            accounts,
            combos,
          },
        ],
        pagination: { hasMore: false, nextOffset: 1 },
      },
      timestamp: Date.now(),
      filters: { scope: "all" },
    })

    let resolveFetch: ((value: { accounts: []; combos: [] }) => void) | null =
      null
    vi.mocked(fetchCommentBlueLinkState).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    render(
      <ToastProvider>
        <CommentBlueLinkPageContent />
      </ToastProvider>
    )

    expect(await screen.findByText("Combo")).not.toBeNull()

    resolveFetch?.({ accounts: [], combos: [] })
  })


  it("creates combos without category payload", async () => {
    const user = userEvent.setup()
    const accounts = [{ id: "a1", name: "Account" }]
    const combos: [] = []

    vi.mocked(fetchCommentBlueLinkState).mockResolvedValue({ accounts, combos })
    const mockApi = vi.mocked(apiRequest)
    mockApi.mockResolvedValue({
      combo: {
        id: "c1",
        account_id: "a1",
        name: "Combo",
        content: "Content",
        remark: "",
      },
    })

    render(
      <ToastProvider>
        <CommentBlueLinkPageContent />
      </ToastProvider>
    )

    const createButton = await screen.findByRole("button", { name: "新增组合" })
    await user.click(createButton)

    await user.type(screen.getByLabelText("Group name"), "Combo")
    await user.type(screen.getByLabelText("Comment content"), "Content")

    await user.click(screen.getByText("保存"))

    expect(mockApi).toHaveBeenCalled()
    const createCall = mockApi.mock.calls.find(
      (call) => call[0] === "/api/comment/combos"
    )
    if (!createCall) throw new Error("create api not called")

    const body = JSON.parse(String(createCall[1]?.body || "{}"))
    expect(body.category_id).toBeUndefined()
  })
})
