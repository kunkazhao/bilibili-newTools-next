// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
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
})
