// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import CommissionListCard from "./CommissionListCard"

describe("CommissionListCard", () => {
  it("renders only action buttons without focus controls", () => {
    render(
      <CommissionListCard
        item={{
          id: "item-1",
          index: 1,
          title: "商品",
          price: 100,
          commissionRate: 10,
          commission: 10,
          sales30: 20,
          comments: "5",
          image: "",
          shopName: "",
          source: "",
          isFocused: false,
          isArchived: false,
        }}
        onEdit={() => {}}
        onArchive={() => {}}
        onDelete={() => {}}
      />
    )

    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("calls onCardClick when card body is clicked", () => {
    const onCardClick = vi.fn()
    const { container } = render(
      <CommissionListCard
        item={{
          id: "item-1",
          index: 1,
          title: "商品",
          price: 100,
          commissionRate: 10,
          commission: 10,
          sales30: 20,
          comments: "5",
          image: "",
          shopName: "",
          source: "",
          isFocused: false,
          isArchived: false,
        }}
        onEdit={() => {}}
        onArchive={() => {}}
        onDelete={() => {}}
        onCardClick={onCardClick}
      />
    )

    const card = container.querySelector("[data-testid='commission-card']")
    if (!card) throw new Error("card not found")
    expect(card.className).toContain("card-interactive")
    fireEvent.click(card)

    expect(onCardClick).toHaveBeenCalled()
  })
})
