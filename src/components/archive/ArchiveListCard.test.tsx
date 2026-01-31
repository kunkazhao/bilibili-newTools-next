// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import ArchiveListCard from "./ArchiveListCard"

describe("ArchiveListCard", () => {
  it("uses lazy loading for cover image", () => {
    const { container } = render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onCopyLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const img = container.querySelector("img")
    expect(img?.getAttribute("loading")).toBe("lazy")
    expect(img?.getAttribute("decoding")).toBe("async")
  })
})
