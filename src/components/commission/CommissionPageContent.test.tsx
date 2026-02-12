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



const seedCommissionItems = (
  items: Array<{
    id: string
    title: string
  }>
) => {
  localStorage.setItem(
    "commission_temp_items_v1",
    JSON.stringify(
      items.map((item) => ({
        id: item.id,
        title: item.title,
        price: 99,
        commissionRate: 10,
        image: "",
        shopName: "",
        source: "",
        sales30: 0,
        comments: "",
        isFocused: false,
        spec: {},
      }))
    )
  )
}

const seedCategoryCache = () => {
  localStorage.setItem(
    "sourcing_category_cache_v1",
    JSON.stringify({
      timestamp: Date.now(),
      data: [
        { id: "parent-digital", name: "Digital", sortOrder: 0, parentId: null },
        { id: "child-mouse", name: "Mouse", sortOrder: 0, parentId: "parent-digital" },
      ],
    })
  )
}

const getArchiveConfirmButton = () => {
  const dialog = screen.getByRole("dialog")
  const buttons = within(dialog).getAllByRole("button")
  return buttons[buttons.length - 1]
}

const getArchiveAllButton = () => {
  const searchInput = screen.getByLabelText("Search products")
  const section = searchInput.closest("section")
  if (!section) {
    throw new Error("list section not found")
  }
  return within(section).getAllByRole("button")[0]
}

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

  it("adds a placeholder card for b23 links that resolve to taobao detail pages", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const mockApi = vi.mocked(apiRequest)
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    mockApi.mockImplementation((path: string) => {
      if (path.startsWith("/api/bilibili/resolve")) {
        return Promise.resolve({
          resolvedUrl: "https://detail.tmall.com/item.htm?id=1000225673799&ali_trackid=test",
        })
      }
      if (path === "/api/taobao/resolve") {
        return Promise.resolve({
          itemId: "",
          openIid: "",
          resolvedUrl: "https://detail.tmall.com/item.htm?id=1000225673799&ali_trackid=test",
        })
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    const textarea = screen.getByLabelText("Link list")
    await user.type(textarea, "https://b23.tv/mall-jaXi3-7IMpn")

    await user.click(getPromoParseButton())

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        expect.stringContaining("/api/bilibili/resolve?url=")
      )
    })

    const cards = await screen.findAllByTestId("commission-card")
    expect(cards).toHaveLength(1)

    await user.click(cards[0])
    expect(openSpy).toHaveBeenCalledWith(
      "https://detail.tmall.com/item.htm?id=1000225673799&ali_trackid=test",
      "_blank"
    )

    openSpy.mockRestore()
  })


  it("keeps b23 taobao card when taobao product API is unavailable", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const mockApi = vi.mocked(apiRequest)
    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    mockApi.mockImplementation((path: string) => {
      if (path.startsWith("/api/bilibili/resolve")) {
        return Promise.resolve({
          resolvedUrl: "https://detail.tmall.com/item.htm?id=1000225673799",
        })
      }
      if (path === "/api/taobao/resolve") {
        return Promise.resolve({
          itemId: "1000225673799",
          openIid: "",
          resolvedUrl: "https://detail.tmall.com/item.htm?id=1000225673799",
        })
      }
      if (path === "/api/taobao/product") {
        return Promise.reject(new Error("permission denied"))
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    const textarea = screen.getByLabelText("Link list")
    await user.type(textarea, "https://b23.tv/mall-jaXi3-7IMpn")
    await user.click(getPromoParseButton())

    const cards = await screen.findAllByTestId("commission-card")
    expect(cards).toHaveLength(1)
    expect(mockApi).not.toHaveBeenCalledWith("/api/jd/product", expect.anything())

    await user.click(cards[0])
    expect(openSpy).toHaveBeenCalledWith(
      "https://detail.tmall.com/item.htm?id=1000225673799",
      "_blank"
    )

    openSpy.mockRestore()
  })

  it("shows parent and child category selectors in archive modal", async () => {
    const user = userEvent.setup()
    seedCategoryCache()
    seedCommissionItems([{ id: "item-1", title: "Item A" }])

    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })
    vi.mocked(apiRequest).mockResolvedValue({ status: "ok" } as never)

    render(<CommissionPageContent />)

    const card = await screen.findByTestId("commission-card")
    await user.click(within(card).getAllByRole("button")[1])

    expect(screen.getByLabelText("Archive parent category")).toBeTruthy()
    expect(screen.getByLabelText("Archive child category")).toBeTruthy()
  })

  it("archives single item to a second-level category when cache includes parent and child", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
    seedCategoryCache()
    seedCommissionItems([{ id: "item-1", title: "Item A" }])

    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })
    mockApi.mockImplementation((path: string) => {
      if (path === "/api/sourcing/items/batch") {
        return Promise.resolve({ status: "ok" })
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    const card = await screen.findByTestId("commission-card")
    await user.click(within(card).getAllByRole("button")[1])

    await user.click(getArchiveConfirmButton())

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        "/api/sourcing/items/batch",
        expect.objectContaining({ method: "POST" })
      )
    })

    const archiveCall = mockApi.mock.calls.find((call) => call[0] === "/api/sourcing/items/batch")
    expect(archiveCall).toBeTruthy()
    const requestBody = JSON.parse(String(archiveCall?.[1]?.body || "{}"))
    expect(requestBody.category_id).toBe("child-mouse")
    expect(requestBody.items).toHaveLength(1)
  })

  it("archives all filtered items to the same second-level category", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
    seedCategoryCache()
    seedCommissionItems([
      { id: "item-1", title: "Item A" },
      { id: "item-2", title: "Item B" },
    ])

    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(performance.now())
        return 1
      })

    vi.mocked(fetchCategories).mockResolvedValue({ categories: [] })
    mockApi.mockImplementation((path: string) => {
      if (path === "/api/sourcing/items/batch") {
        return Promise.resolve({ status: "ok" })
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    await screen.findByText("Item A")
    await screen.findByText("Item B")

    await user.click(getArchiveAllButton())

    const confirmButton = getArchiveConfirmButton()
    await waitFor(() => {
      expect((confirmButton as HTMLButtonElement).disabled).toBe(false)
    })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        "/api/sourcing/items/batch",
        expect.objectContaining({ method: "POST" })
      )
    })

    const archiveCall = mockApi.mock.calls.find((call) => call[0] === "/api/sourcing/items/batch")
    expect(archiveCall).toBeTruthy()
    const requestBody = JSON.parse(String(archiveCall?.[1]?.body || "{}"))
    expect(requestBody.category_id).toBe("child-mouse")
    expect(requestBody.items).toHaveLength(2)

    rafSpy.mockRestore()
  })


})
