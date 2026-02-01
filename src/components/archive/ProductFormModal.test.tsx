// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToastProvider } from "@/components/Toast"
import ProductFormModal from "./ProductFormModal"

describe("ProductFormModal", () => {
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
})
