// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import ArchiveProductCard from "./ArchiveProductCard"

describe("ArchiveProductCard", () => {
  it("renders a drag handle icon", () => {
    render(
      <ArchiveProductCard
        id="item-1"
        title="Product"
        price="100"
        commission="10"
        image="https://example.com/cover.jpg"
        categoryName="Category"
        accountName="Account"
        blueLink="https://example.com"
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={() => {}}
        onCopyLink={() => {}}
        onEdit={() => {}}
        onDragStart={() => {}}
        onDrop={() => {}}
      />
    )

    expect(screen.getByLabelText("Drag handle")).not.toBeNull()
  })
})
