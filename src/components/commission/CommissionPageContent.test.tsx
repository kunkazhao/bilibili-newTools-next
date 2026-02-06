// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { apiRequest } from "@/lib/api"
import { fetchCategories } from "@/components/archive/archiveApi"
import CommissionPageContent from "@/components/commission/CommissionPageContent"
import { getPinnedComments } from "@/lib/bilibili"

const { showToastMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
}))

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))
vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}))
vi.mock("@/components/archive/archiveApi", () => ({
  fetchCategories: vi.fn(),
}))
vi.mock("@/lib/bilibili", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bilibili")>("@/lib/bilibili")
  return {
    ...actual,
    getPinnedComments: vi.fn(),
  }
})

const getPromoParseButton = () => {
  const textarea = screen.getByLabelText("Link list")
  const card = textarea.closest("section")
  if (!card) {
    throw new Error("input card not found")
  }
  const buttons = within(card).getAllByRole("button")
  return buttons[1]
}

describe("CommissionPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("parses taobao promo links via taobao endpoints", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })
    mockApi.mockImplementation((path: string) => {
      if (path === "/api/taobao/resolve") {
        return Promise.resolve({ itemId: "123" })
      }
      if (path === "/api/taobao/product") {
        return Promise.resolve({
          title: "Taobao Item",
          cover: "https://example.com/taobao.png",
          price: "9.9",
          commissionRate: "12.3%",
          shopName: "Taobao Shop",
          materialUrl: "https://item.taobao.com/item.htm?id=123",
        })
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    const textarea = screen.getByLabelText("Link list")
    await user.type(textarea, "https://item.taobao.com/item.htm?id=123")

    await user.click(getPromoParseButton())

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/api/taobao/resolve", expect.anything())
    })
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/api/taobao/product", expect.anything())
    })

    await waitFor(() => {
      expect(screen.getByText("Taobao Item")).toBeTruthy()
    })
  })

  it("shows a clear toast when JD item links cannot be queried for commission", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })

    mockApi.mockImplementation((path: string) => {
      if (path === "/api/jd/product") {
        return Promise.resolve({
          msg: JSON.stringify({
            jd_union_open_goods_query_responce: {
              queryResult: JSON.stringify({
                code: 411,
                message:
                  "sceneId mismatch: requires full alliance item ID and does not support SKUID",
              }),
            },
          }),
        })
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    const textarea = screen.getByLabelText("Link list")
    await user.type(textarea, "https://item.jd.com/100148265520.html")

    await user.click(getPromoParseButton())

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/api/jd/product", expect.anything())
    })
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringContaining("union-click/jdc/jingfen"),
        "error"
      )
    })
  })

  it("parses bilibili links and fetches products", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })
    vi.mocked(getPinnedComments).mockResolvedValue({
      pinnedComments: [
        {
          content: { message: "推荐 https://item.jd.com/1001.html" },
          member: { uname: "测试用户" },
        },
      ],
      subReplies: [],
      videoInfo: { author: "UP主" },
    })

    mockApi.mockImplementation((path: string) => {
      if (path === "/api/jd/product") {
        return Promise.resolve({
          queryResult: JSON.stringify({
            data: [
              {
                skuName: "JD Item",
                priceInfo: { price: "9.9" },
                commissionInfo: { commission: "1", commissionShare: "10" },
                inOrderCount30Days: 10,
                comments: 5,
                imageInfo: { imageList: [{ url: "https://example.com/jd.png" }] },
                shopInfo: { shopName: "JD Shop" },
                materialUrl: "https://item.jd.com/1001.html",
              },
            ],
            message: "",
          }),
        })
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    const textarea = screen.getByLabelText("Link list")
    await user.type(textarea, "https://www.bilibili.com/video/BV1abc123")

    const card = textarea.closest("section")
    if (!card) {
      throw new Error("input card not found")
    }
    const buttons = within(card).getAllByRole("button")
    await user.click(buttons[0])

    await waitFor(() => {
      expect(getPinnedComments).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/api/jd/product", expect.anything())
    })
    await waitFor(() => {
      expect(screen.getByText("JD Item")).toBeTruthy()
    })
  })
})
