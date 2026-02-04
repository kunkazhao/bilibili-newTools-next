// @vitest-environment jsdom
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SchemeDetailProductList from "./SchemeDetailProductList"

const baseItem = {
  id: "p1",
  title: "测试商品",
  cover: "",
  shopName: "",
  sales30: "",
  comments: "",
  price: "100",
  commission: "10",
  commissionRate: "10%",
  missingFields: [],
  remarkText: "",
  isMissing: false,
}

describe("SchemeDetailProductList", () => {
  it("renders compact info and icon-only actions", async () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()
    const onGenerateImage = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <SchemeDetailProductList
        items={[baseItem]}
        totalCount={1}
        onOpenPicker={() => {}}
        onEdit={onEdit}
        onRemove={onRemove}
        onGenerateImage={onGenerateImage}
        onDragStart={() => {}}
        onDrop={() => {}}
      />
    )

    expect(screen.getByText("价格")).not.toBeNull()
    expect(screen.getByText("比例")).not.toBeNull()
    expect(screen.queryByText("佣金")).toBeNull()
    expect(container.querySelector("img")).toBeNull()

    await user.click(screen.getByLabelText("生成图片"))
    await user.click(screen.getByLabelText("编辑"))
    await user.click(screen.getByLabelText("删除"))

    expect(onGenerateImage).toHaveBeenCalledWith("p1")
    expect(onEdit).toHaveBeenCalledWith("p1")
    expect(onRemove).toHaveBeenCalledWith("p1")
  })

  it("renders actions row under the price row", () => {
    const { container } = render(
      <SchemeDetailProductList
        items={[baseItem]}
        totalCount={1}
        onOpenPicker={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
        onGenerateImage={() => {}}
        onDragStart={() => {}}
        onDrop={() => {}}
      />
    )

    const card = container.querySelector("[data-testid='scheme-detail-card']")
    if (!card) throw new Error("card not found")
    const priceLabel = screen.getByText("价格")
    const priceRow = priceLabel.closest("div")?.parentElement
    if (!priceRow) throw new Error("price row not found")
    const actionsRow = priceRow.nextElementSibling as HTMLElement | null

    expect(actionsRow).not.toBeNull()
    expect(actionsRow?.querySelector("[aria-label='生成图片']")).not.toBeNull()
    expect(actionsRow?.querySelector("[aria-label='编辑']")).not.toBeNull()
    expect(actionsRow?.querySelector("[aria-label='删除']")).not.toBeNull()
  })

  it("calls onCardClick when card body is clicked", () => {
    const onCardClick = vi.fn()
    const { container } = render(
      <SchemeDetailProductList
        items={[baseItem]}
        totalCount={1}
        onOpenPicker={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
        onGenerateImage={() => {}}
        onDragStart={() => {}}
        onDrop={() => {}}
        onCardClick={onCardClick}
      />
    )

    const card = container.querySelector("[data-testid='scheme-detail-card']")
    if (!card) throw new Error("card not found")
    expect(card.className).toContain("card-interactive")
    fireEvent.click(card)

    expect(onCardClick).toHaveBeenCalledWith("p1")
  })

  it("renders a fixed-height scroll container for the list area", () => {
    const { container } = render(
      <SchemeDetailProductList
        items={[]}
        totalCount={0}
        onOpenPicker={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
        onGenerateImage={() => {}}
        onDragStart={() => {}}
        onDrop={() => {}}
      />
    )

    const scrollArea = container.querySelector(
      "[data-testid='scheme-detail-product-scroll']"
    )

    expect(scrollArea).not.toBeNull()
    expect(scrollArea?.className || "").toContain(
      "h-[var(--scheme-detail-product-scroll-height)]"
    )
    expect(scrollArea?.className || "").toContain("overflow-y-auto")
    expect(scrollArea?.className || "").toContain("overflow-x-hidden")
  })
})
