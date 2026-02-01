// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
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

  it("renders a drag handle icon instead of copy action", () => {
    render(
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
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    expect(screen.getAllByLabelText("Drag handle").length).toBeGreaterThan(0)
  })

  it("marks drag handle as draggable", () => {
    const onDragStart = vi.fn()

    render(
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
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={onDragStart}
        onDrop={vi.fn()}
      />
    )

    const handle = screen.getAllByLabelText("Drag handle")[0]
    expect(handle.getAttribute("draggable")).toBe("true")
  })

  it("uses the card as drag image when dragging the handle", () => {
    const setDragImage = vi.fn()
    const setData = vi.fn()

    render(
      <ArchiveListCard
        id="1"
        title="???"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="???"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const handle = screen.getAllByLabelText("Drag handle")[0]
    fireEvent.dragStart(handle, {
      dataTransfer: { setDragImage, setData },
    })

    expect(setDragImage).toHaveBeenCalled()
  })
})
