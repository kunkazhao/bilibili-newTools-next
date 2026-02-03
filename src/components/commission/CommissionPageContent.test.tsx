// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { apiRequest } from "@/lib/api"
import { fetchCategories } from "@/components/archive/archiveApi"
import CommissionPageContent from "@/components/commission/CommissionPageContent"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))
vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))
vi.mock("@/components/archive/archiveApi", () => ({
  fetchCategories: vi.fn(),
}))

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
          title: "淘宝商品",
          cover: "https://example.com/taobao.png",
          price: "9.9",
          commissionRate: "12.3%",
          shopName: "淘宝店铺",
          materialUrl: "https://item.taobao.com/item.htm?id=123",
        })
      }
      return Promise.resolve({})
    })

    render(<CommissionPageContent />)

    const textarea = screen.getByLabelText("Link list")
    await user.type(textarea, "https://item.taobao.com/item.htm?id=123")

    await user.click(screen.getByRole("button", { name: "推广链接提取" }))

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/api/taobao/resolve", expect.anything())
    })
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/api/taobao/product", expect.anything())
    })

    await waitFor(() => {
      expect(screen.getByText("淘宝商品")).toBeTruthy()
    })
  })
})
