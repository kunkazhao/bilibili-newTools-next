// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToastProvider } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import ProductFormModal from "./ProductFormModal"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))
const showToast = vi.fn()

vi.mock("@/components/Toast", async () => {
  const actual = await vi.importActual<typeof import("@/components/Toast")>(
    "@/components/Toast"
  )
  return {
    ...actual,
    useToast: () => ({ showToast }),
  }
})

describe("ProductFormModal", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const baseValues = {
    promoLink: "",
    title: "测试商品",
    price: "88",
    commission: "8.8",
    commissionRate: "10",
    sales30: "",
    comments: "",
    image: "",
    blueLink: "https://item.jd.com/123.html",
    categoryId: "cat-1",
    accountName: "",
    shopName: "",
    remark: "",
    params: {},
  }

  it("renders JD and Taobao link inputs", () => {
    render(
      <ToastProvider>
        <ProductFormModal
          isOpen
          categories={[{ label: "分类", value: "cat-1" }]}
          presetFields={[]}
          initialValues={{
            ...baseValues,
            taobaoLink: "https://item.taobao.com/item.htm?id=1",
          }}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </ToastProvider>
    )

    expect(screen.getByLabelText("京东链接")).toBeTruthy()
    expect(screen.getByLabelText("淘宝链接")).toBeTruthy()
  })

  it("includes taobao link value when submitting", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ToastProvider>
        <ProductFormModal
          isOpen
          categories={[{ label: "分类", value: "cat-1" }]}
          presetFields={[]}
          initialValues={{
            ...baseValues,
            taobaoLink: "https://item.taobao.com/item.htm?id=1",
          }}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </ToastProvider>
    )

    const taobaoInput = screen.getByLabelText("淘宝链接") as HTMLInputElement
    expect(taobaoInput.value).toBe("https://item.taobao.com/item.htm?id=1")

    const saveButton = screen.getByRole("button", { name: "保存" })
    await user.click(saveButton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]?.taobaoLink).toBe(
      "https://item.taobao.com/item.htm?id=1"
    )
  })

  it("keeps existing title and image when parsing promo link", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
    mockApi.mockResolvedValueOnce({
      queryResult: {
        code: 200,
        data: [
          {
            skuName: "新标题",
            imageInfo: {
              imageList: [{ url: "https://example.com/new.png" }],
            },
            materialUrl: "https://item.jd.com/999.html",
          },
        ],
      },
    })

    render(
      <ToastProvider>
        <ProductFormModal
          isOpen
          categories={[{ label: "分类", value: "cat-1" }]}
          presetFields={[]}
          initialValues={{
            ...baseValues,
            promoLink: "https://item.jd.com/123.html",
            image: "https://example.com/old.png",
          }}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </ToastProvider>
    )

    const promoInput = screen.getByLabelText("推广链接") as HTMLInputElement
    fireEvent.change(promoInput, {
      target: { value: "https://item.jd.com/123.html" },
    })

    const parseButton = screen.getByRole("button", { name: "解析" })
    await user.click(parseButton)

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect((parseButton as HTMLButtonElement).disabled).toBe(false)
    })

    const titleInput = screen.getByLabelText("商品标题") as HTMLInputElement
    expect(titleInput.value).toBe("测试商品")

    const image = screen.getByRole("img") as HTMLImageElement
    expect(image.src).toBe("https://example.com/old.png")
  })

  it("uses union-click link as keyword even after resolving", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
    mockApi.mockImplementation((path: string, options?: RequestInit) => {
      if (path === "/api/jd/resolve") {
        return Promise.resolve({ resolvedUrl: "https://item.jd.com/123.html" })
      }
      if (path === "/api/jd/product") {
        return Promise.resolve({
          queryResult: {
            code: 200,
            data: [
              {
                skuName: "新标题",
                imageInfo: { imageList: [{ url: "https://example.com/new.png" }] },
                materialUrl: "https://item.jd.com/123.html",
              },
            ],
          },
        })
      }
      return Promise.resolve({})
    })

    render(
      <ToastProvider>
        <ProductFormModal
          isOpen
          categories={[{ label: "分类", value: "cat-1" }]}
          presetFields={[]}
          initialValues={{
            ...baseValues,
            promoLink: "https://union-click.jd.com/jdc?e=abc",
          }}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </ToastProvider>
    )

    const promoInput = screen.getByLabelText("推广链接") as HTMLInputElement
    fireEvent.change(promoInput, {
      target: { value: "https://union-click.jd.com/jdc?e=abc" },
    })

    const parseButton = screen.getByRole("button", { name: "解析" })
    await user.click(parseButton)

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        "/api/jd/resolve",
        expect.anything()
      )
    })
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        "/api/jd/product",
        expect.anything()
      )
    })

    const productCall = mockApi.mock.calls.find((call) => call[0] === "/api/jd/product")
    const productBody = JSON.parse(String(productCall?.[1]?.body || "{}")) as { keyword?: string }
    expect(productBody.keyword).toBe("https://union-click.jd.com/jdc?e=abc")

    const firstCall = mockApi.mock.calls[0]?.[0]
    const secondCall = mockApi.mock.calls[1]?.[0]
    expect(firstCall).toBe("/api/jd/resolve")
    expect(secondCall).toBe("/api/jd/product")
  })

  it("parses taobao promo link and fills fields", async () => {
    const user = userEvent.setup()
    const mockApi = vi.mocked(apiRequest)
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

    render(
      <ToastProvider>
        <ProductFormModal
          isOpen
          categories={[{ label: "分类", value: "cat-1" }]}
          presetFields={[]}
          initialValues={{
            promoLink: "https://item.taobao.com/item.htm?id=123",
            title: "",
            price: "",
            commission: "",
            commissionRate: "",
            sales30: "",
            comments: "",
            image: "",
            blueLink: "",
            taobaoLink: "",
            categoryId: "cat-1",
            accountName: "",
            shopName: "",
            remark: "",
            params: {},
          }}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </ToastProvider>
    )

    const promoInput = screen.getByLabelText("推广链接") as HTMLInputElement
    fireEvent.change(promoInput, {
      target: { value: "https://item.taobao.com/item.htm?id=123" },
    })
    const titleInput = screen.getByLabelText("商品标题") as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: "" } })
    expect(
      (screen.getByLabelText("商品标题") as HTMLInputElement).value
    ).toBe("")

    const parseButton = screen.getByRole("button", { name: "解析" })
    await user.click(parseButton)

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        "/api/taobao/resolve",
        expect.anything()
      )
    })
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        "/api/taobao/product",
        expect.anything()
      )
    })
    const productResult = mockApi.mock.results.find(
      (_result, index) => mockApi.mock.calls[index]?.[0] === "/api/taobao/product"
    )
    if (productResult?.value) {
      const payload = await productResult.value
      expect(payload?.title).toBe("淘宝商品")
    }
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("推广链接解析成功", "success")
    })

    await waitFor(() => {
      expect(
        (screen.getByLabelText("商品标题") as HTMLInputElement).value
      ).toBe("淘宝商品")
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(
        (screen.getByLabelText("淘宝链接") as HTMLInputElement).value
      ).toBe("https://item.taobao.com/item.htm?id=123")
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/佣金比例/) as HTMLInputElement).value
      ).toBe("12.3%")
    }, { timeout: 3000 })
  })

  it("shows success toast when submit promise resolves", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <ToastProvider>
        <ProductFormModal
          isOpen
          categories={[{ label: "分类", value: "cat-1" }]}
          presetFields={[]}
          initialValues={baseValues}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </ToastProvider>
    )

    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("商品已更新", "success")
    })
  })

  it("auto-opens cover picker when requested", async () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {})

    render(
      <ToastProvider>
        <ProductFormModal
          isOpen
          categories={[{ label: "分类", value: "cat-1" }]}
          presetFields={[]}
          initialValues={baseValues}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          {...({ autoOpenCoverPicker: true } as unknown as Record<string, unknown>)}
        />
      </ToastProvider>
    )

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled()
    })

    clickSpy.mockRestore()
  })
})
